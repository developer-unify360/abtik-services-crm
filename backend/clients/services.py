from django.db import models, transaction
from django.core.exceptions import ValidationError
from clients.models import Client
from audit.models import AuditLog
from bookings.services import BookingService
from services.services import ServiceRequestService
from leads.services import LeadService


class ClientService:
    @staticmethod
    @transaction.atomic
    def create_client(data, user):
        """Create a new client record."""
        # Check for duplicate email
        if Client.objects.filter(email=data['email']).exists():
            raise ValidationError("A client with this email already exists.")

        client = Client.objects.create(
            client_name=data['client_name'],
            company_name=data['company_name'],
            gst_pan=data.get('gst_pan', ''),
            email=data['email'],
            mobile=data['mobile'],
            industry=data.get('industry', ''),
            created_by=user,
        )

        AuditLog.objects.create(
            user=user,
            action='client.created',
            module='clients',
            details={
                'client_id': str(client.id),
                'client_name': client.client_name,
            },
        )

        return client

    @staticmethod
    @transaction.atomic
    def create_client_with_booking_and_request(client_data, booking_data, request_data, user):
        """Create or update client, then create booking and optional service request."""
        email = client_data.get('email')
        mobile = client_data.get('mobile')
        
        # Try to find existing client by email or mobile
        client = Client.objects.filter(models.Q(email=email) | models.Q(mobile=mobile)).first()
        
        if client:
            # Update existing client with latest info
            client = ClientService.update_client(client, client_data, user=user)
        else:
            # Create new client
            client = ClientService.create_client(data=client_data, user=user)

        booking_payload = dict(booking_data)
        booking_payload['client_id'] = client.id
        booking = BookingService.create_booking(data=booking_payload, user=user)

        # Ensure a lead record exists (clients are the leads)
        LeadService.ensure_lead_exists(
            client=client, 
            user=user, 
            source=booking_payload.get('lead_source')
        )

        service_request = None
        if request_data:
            request_payload = dict(request_data)
            request_payload['booking'] = booking
            service_request = ServiceRequestService.create_request(
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
            user=user,
            action='client.updated',
            module='clients',
            details={'client_id': str(client.id), 'updated_fields': updated_fields},
        )

        return client

    @staticmethod
    def list_clients(filters=None):
        """List all clients with optional filtering."""
        # Hide leads that haven't been converted to bookings yet
        queryset = Client.objects.select_related('created_by').annotate(
            num_bookings=models.Count('bookings')
        ).filter(
            models.Q(num_bookings__gt=0) | models.Q(lead_info__isnull=True)
        )

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

        return queryset.order_by('-created_at')

    @staticmethod
    def delete_client(client, user):
        """Delete a client record."""
        AuditLog.objects.create(
            user=user,
            action='client.deleted',
            module='clients',
            details={'client_id': str(client.id), 'client_name': client.client_name},
        )
        client.delete()
