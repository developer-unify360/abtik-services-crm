from django.db import transaction
from django.core.exceptions import ValidationError
from bookings.models import Booking
from clients.models import Client
from audit.models import AuditLog


class BookingService:
    @staticmethod
    def _resolve_remaining_amount(data, booking=None):
        if 'remaining_amount' in data:
            return data.get('remaining_amount')

        total_payment_amount = data.get(
            'total_payment_amount',
            getattr(booking, 'total_payment_amount', None) if booking else None,
        )
        received_amount = data.get(
            'received_amount',
            getattr(booking, 'received_amount', None) if booking else None,
        )

        if total_payment_amount is not None and received_amount is not None:
            return total_payment_amount - received_amount

        return getattr(booking, 'remaining_amount', None) if booking else None

    @staticmethod
    @transaction.atomic
    def create_booking(tenant_id, data, user):
        """
        Create a new booking record.
        Validates that the client belongs to the same tenant.
        """
        # Verify client exists and belongs to the same tenant
        try:
            client = Client.tenant_objects.for_tenant(tenant_id).get(id=data['client_id'])
        except Client.DoesNotExist:
            raise ValidationError("Client not found or does not belong to your organization.")

        booking = Booking.objects.create(
            tenant_id=tenant_id,
            client=client,
            bde_user=user,
            payment_type=data['payment_type'],
            bank_account=data.get('bank_account', ''),
            booking_date=data['booking_date'],
            payment_date=data.get('payment_date'),
            total_payment_amount=data.get('total_payment_amount'),
            total_payment_remarks=data.get('total_payment_remarks', ''),
            received_amount=data.get('received_amount'),
            received_amount_remarks=data.get('received_amount_remarks', ''),
            remaining_amount=BookingService._resolve_remaining_amount(data),
            remaining_amount_remarks=data.get('remaining_amount_remarks', ''),
            after_fund_disbursement_percentage=data.get('after_fund_disbursement_percentage'),
            after_fund_disbursement_remarks=data.get('after_fund_disbursement_remarks', ''),
            attachment=data.get('attachment'),
            remarks=data.get('remarks', ''),
            status=data.get('status', 'pending'),
        )

        # Audit log
        AuditLog.objects.create(
            tenant_id=tenant_id,
            user=user,
            action='booking.created',
            module='bookings',
            details={
                'booking_id': str(booking.id),
                'client_id': str(client.id),
                'client_name': client.client_name,
                'payment_type': data['payment_type'],
            },
        )

        return booking

    @staticmethod
    def update_booking(booking, data, user):
        """Update an existing booking record."""
        updatable_fields = [
            'payment_type', 'bank_account', 'booking_date',
            'payment_date',
            'total_payment_amount', 'total_payment_remarks',
            'received_amount', 'received_amount_remarks',
            'remaining_amount', 'remaining_amount_remarks',
            'after_fund_disbursement_percentage', 'after_fund_disbursement_remarks',
            'remarks', 'status',
        ]
        updated_fields = []

        for field in updatable_fields:
            if field in data:
                setattr(booking, field, data[field])
                updated_fields.append(field)

        if 'total_payment_amount' in data or 'received_amount' in data or 'remaining_amount' in data:
            booking.remaining_amount = BookingService._resolve_remaining_amount(data, booking)
            if 'remaining_amount' not in updated_fields:
                updated_fields.append('remaining_amount')

        if data.get('remove_attachment'):
            if booking.attachment:
                booking.attachment.delete(save=False)
            booking.attachment = None
            updated_fields.append('attachment')

        if 'attachment' in data:
            if booking.attachment and data['attachment'] and booking.attachment.name != data['attachment'].name:
                booking.attachment.delete(save=False)
            booking.attachment = data['attachment']
            updated_fields.append('attachment')

        booking.full_clean()  # Run model-level validation
        booking.save()

        AuditLog.objects.create(
            tenant=booking.tenant,
            user=user,
            action='booking.updated',
            module='bookings',
            details={
                'booking_id': str(booking.id),
                'updated_fields': updated_fields,
            },
        )

        return booking

    @staticmethod
    def list_bookings(tenant_id, user=None, filters=None):
        """
        List bookings for a tenant with optional filtering.
        BDE users see only their bookings.
        Supports: client_id, status, date_from, date_to
        """
        queryset = Booking.tenant_objects.for_tenant(tenant_id).select_related(
            'client', 'bde_user'
        )

        if user and getattr(user, 'role', None) and user.role.name == 'BDE':
            queryset = queryset.filter(bde_user=user)

        if filters:
            if filters.get('client_id'):
                queryset = queryset.filter(client_id=filters['client_id'])
            if filters.get('status'):
                queryset = queryset.filter(status=filters['status'])
            if filters.get('date_from'):
                queryset = queryset.filter(booking_date__gte=filters['date_from'])
            if filters.get('date_to'):
                queryset = queryset.filter(booking_date__lte=filters['date_to'])

        return queryset

    @staticmethod
    def get_booking(booking_id, tenant_id):
        """Get a single booking within a tenant."""
        return Booking.tenant_objects.for_tenant(tenant_id).select_related(
            'client', 'bde_user'
        ).get(id=booking_id)

    @staticmethod
    def delete_booking(booking, user):
        """Delete a booking. Only Super Admin/Admin can do this."""
        AuditLog.objects.create(
            tenant=booking.tenant,
            user=user,
            action='booking.deleted',
            module='bookings',
            details={
                'booking_id': str(booking.id),
                'client_name': booking.client.client_name,
            },
        )
        booking.delete()
