from django.db import transaction
from django.core.exceptions import ValidationError
from bookings.models import Booking, Bank
from clients.models import Client
from audit.models import AuditLog


class BookingService:
    @staticmethod
    def _resolve_payment_type(data):
        payment_type_id = data.get('payment_type')
        if payment_type_id:
            from attributes.models import PaymentType
            try:
                return PaymentType.objects.get(id=payment_type_id)
            except PaymentType.DoesNotExist:
                return None
        return None

    @staticmethod
    def _resolve_bank(data):
        bank_id = data.get('bank')
        if bank_id:
            try:
                return Bank.objects.get(id=bank_id)
            except Bank.DoesNotExist:
                return None
        return None

    @staticmethod
    def _resolve_remaining_amount(data, booking=None):
        if 'remaining_amount' in data:
            return data.get('remaining_amount')

        total = data.get('total_payment_amount', getattr(booking, 'total_payment_amount', None) if booking else None)
        received = data.get('received_amount', getattr(booking, 'received_amount', None) if booking else None)

        if total is not None and received is not None:
            return total - received

        return getattr(booking, 'remaining_amount', None) if booking else None

    @staticmethod
    @transaction.atomic
    def create_booking(data, user):
        """Create a new booking record."""
        try:
            client = Client.objects.get(id=data['client_id'])
        except Client.DoesNotExist:
            raise ValidationError("Client not found.")

        payment_type = BookingService._resolve_payment_type(data)
        bank = BookingService._resolve_bank(data)
        bde_name = data.get('bde_name') or (getattr(user, 'name', None) if user else None)

        booking = Booking.objects.create(
            client=client,
            bde_name=bde_name,
            payment_type=payment_type,
            bank=bank,
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
            lead_source=data.get('lead_source', None),
        )
        
        # Sync with Lead record (clients are leads)
        from leads.services import LeadService
        LeadService.ensure_lead_exists(client, user, source=booking.lead_source)
        
        lead_id = data.get('lead_id')
        if lead_id:
            from leads.models import Lead, LeadActivity
            try:
                lead = Lead.objects.get(id=lead_id)
                if lead.status != 'closed_won':
                    old_status = lead.get_status_display()
                    lead.status = 'closed_won'
                    lead.save()
                    LeadActivity.objects.create(
                        lead=lead,
                        activity_type='status_change',
                        description=f'Status changed from "{old_status}" to "Closed Won" (booking created)',
                        performed_by=user
                    )
            except Lead.DoesNotExist:
                pass

        AuditLog.objects.create(
            user=user,
            action='booking.created',
            module='bookings',
            details={
                'booking_id': str(booking.id),
                'client_id': str(client.id),
                'client_name': client.client_name,
            },
        )

        return booking

    @staticmethod
    def update_booking(booking, data, user):
        """Update an existing booking record."""
        updatable_fields = [
            'booking_date', 'payment_date',
            'total_payment_amount', 'total_payment_remarks',
            'received_amount', 'received_amount_remarks',
            'remaining_amount', 'remaining_amount_remarks',
            'after_fund_disbursement_percentage', 'after_fund_disbursement_remarks',
            'remarks', 'status', 'lead_source', 'bde_name',
        ]
        updated_fields = []

        for field in updatable_fields:
            if field in data:
                setattr(booking, field, data[field])
                updated_fields.append(field)

        if 'payment_type' in data:
            booking.payment_type = BookingService._resolve_payment_type(data)
            updated_fields.append('payment_type')

        if 'bank' in data:
            booking.bank = BookingService._resolve_bank(data)
            updated_fields.append('bank')

        if 'total_payment_amount' in data or 'received_amount' in data or 'remaining_amount' in data:
            booking.remaining_amount = BookingService._resolve_remaining_amount(data, booking)
            if 'remaining_amount' not in updated_fields:
                updated_fields.append('remaining_amount')

        if data.get('remove_attachment'):
            if booking.attachment:
                booking.attachment.delete(save=False)
            booking.attachment = None
            updated_fields.append('attachment')

        if 'attachment' in data and data['attachment']:
            if booking.attachment:
                booking.attachment.delete(save=False)
            booking.attachment = data['attachment']
            updated_fields.append('attachment')

        booking.full_clean()
        booking.save()
        
        # Sync with Lead record if source or client changed
        if 'lead_source' in updated_fields:
            from leads.services import LeadService
            LeadService.ensure_lead_exists(booking.client, user, source=booking.lead_source)

        AuditLog.objects.create(
            user=user,
            action='booking.updated',
            module='bookings',
            details={'booking_id': str(booking.id), 'updated_fields': updated_fields},
        )

        return booking

    @staticmethod
    def list_bookings(filters=None):
        """List all bookings with optional filtering."""
        queryset = Booking.objects.select_related('client', 'bank')

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
    def delete_booking(booking, user):
        """Delete a booking."""
        AuditLog.objects.create(
            user=user,
            action='booking.deleted',
            module='bookings',
            details={'booking_id': str(booking.id)},
        )
        booking.delete()
