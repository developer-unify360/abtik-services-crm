from django.db import models, transaction
from django.core.exceptions import ValidationError
from clients.models import Client
from audit.models import AuditLog
from bookings.services import BookingService
from services.services import ServiceRequestService


class ClientService:
    @staticmethod
    @transaction.atomic
    def create_client(tenant_id, data, user):
        """
        Create a new client record.
        Per Workflow Document: client creation triggers booking + service request generation.
        Booking creation is handled separately in the booking module.
        """
        # Check for duplicate email within the tenant
        if Client.tenant_objects.for_tenant(tenant_id).filter(email=data['email']).exists():
            raise ValidationError("A client with this email already exists in your organization.")

        client = Client.objects.create(
            tenant_id=tenant_id,
            client_name=data['client_name'],
            company_name=data['company_name'],
            gst_pan=data.get('gst_pan', ''),
            email=data['email'],
            mobile=data['mobile'],
            industry=data.get('industry', ''),
            created_by=user,
        )

        # Audit log
        AuditLog.objects.create(
            tenant_id=tenant_id,
            user=user,
            action='client.created',
            module='clients',
            details={
                'client_id': str(client.id),
                'client_name': client.client_name,
                'company_name': client.company_name,
            },
        )

        return client

    @staticmethod
    @transaction.atomic
    def create_client_with_booking_and_request(tenant_id, client_data, booking_data, request_data, user):
        """Create client, booking and service request in one call for BDE workflow."""
        client = ClientService.create_client(tenant_id, client_data, user)

        # booking_data expects keys: payment_type, booking_date, payment_date, bank_account, remarks, status
        booking_payload = dict(booking_data)
        booking_payload['client_id'] = client.id
        booking = BookingService.create_booking(
            tenant_id=tenant_id,
            data=booking_payload,
            user=user,
        )

        service_request = None
        if request_data:
            request_payload = dict(request_data)
            request_payload['booking'] = booking
            service_request = ServiceRequestService.create_request(
                tenant_id=tenant_id,
                data=request_payload,
                user=user,
            )

        return {
            'client': client,
            'booking': booking,
            'service_request': service_request,
        }

    @staticmethod
    def update_client(client, data, user):
        """Update an existing client record."""
        updatable_fields = ['client_name', 'company_name', 'gst_pan', 'email', 'mobile', 'industry']
        updated_fields = []

        for field in updatable_fields:
            if field in data:
                setattr(client, field, data[field])
                updated_fields.append(field)

        client.save()

        AuditLog.objects.create(
            tenant=client.tenant,
            user=user,
            action='client.updated',
            module='clients',
            details={
                'client_id': str(client.id),
                'updated_fields': updated_fields,
            },
        )

        return client

    @staticmethod
    def list_clients(tenant_id, user=None, filters=None):
        """
        List clients for a tenant with optional filtering.
        For BDE users return only clients they created (and those mapped to their bookings).
        Supports: company, industry, date_from, date_to, search
        """
        queryset = Client.tenant_objects.for_tenant(tenant_id).select_related('created_by')

        if user and getattr(user, 'role', None) and user.role.name == 'BDE':
            queryset = queryset.filter(models.Q(created_by=user) | models.Q(bookings__bde_user=user)).distinct()

        if filters:
            if filters.get('company'):
                queryset = queryset.filter(company_name__icontains=filters['company'])
            if filters.get('industry'):
                queryset = queryset.filter(industry__icontains=filters['industry'])
            if filters.get('date_from'):
                queryset = queryset.filter(created_at__date__gte=filters['date_from'])
            if filters.get('date_to'):
                queryset = queryset.filter(created_at__date__lte=filters['date_to'])
            if filters.get('search'):
                search = filters['search']
                queryset = queryset.filter(
                    models.Q(client_name__icontains=search) |
                    models.Q(company_name__icontains=search) |
                    models.Q(email__icontains=search)
                )

        return queryset

    @staticmethod
    def get_client(client_id, tenant_id):
        """Get a single client within a tenant."""
        return Client.tenant_objects.for_tenant(tenant_id).select_related('created_by').get(id=client_id)

    @staticmethod
    def delete_client(client, user):
        """Hard delete a client. Only Super Admin/Admin can do this."""
        AuditLog.objects.create(
            tenant=client.tenant,
            user=user,
            action='client.deleted',
            module='clients',
            details={
                'client_id': str(client.id),
                'client_name': client.client_name,
            },
        )
        client.delete()
