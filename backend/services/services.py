from django.utils import timezone
from .models import ServiceCategory, Service, ServiceRequest
from django.core.exceptions import ValidationError
from audit.models import AuditLog

class ServiceManagementService:
    @staticmethod
    def get_categories():
        return ServiceCategory.objects.all()

    @staticmethod
    def get_services(category_id=None):
        queryset = Service.objects.all()
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset

    @staticmethod
    def create_category(data, user):
        category = ServiceCategory.objects.create(**data)
        AuditLog.objects.create(
            user=user,
            action='service_category.create',
            module='services',
            details={'category_id': str(category.id), 'name': category.name}
        )
        return category

    @staticmethod
    def create_service(data, user):
        service = Service.objects.create(**data)
        AuditLog.objects.create(
            user=user,
            action='service.create',
            module='services',
            details={'service_id': str(service.id), 'name': service.name}
        )
        return service


class ServiceRequestService:
    @staticmethod
    def list_requests(filters=None):
        queryset = ServiceRequest.objects.all().select_related(
            'service', 'service__category', 'assigned_to', 'booking', 'booking__client'
        )
        
        if filters:
            if 'status' in filters:
                queryset = queryset.filter(status=filters['status'])
            if 'assigned_to' in filters:
                queryset = queryset.filter(assigned_to_id=filters['assigned_to'])
            if 'priority' in filters:
                queryset = queryset.filter(priority=filters['priority'])
            if 'booking_id' in filters:
                queryset = queryset.filter(booking_id=filters['booking_id'])
                
        return queryset

    @staticmethod
    def create_request(data, user):
        service_request = ServiceRequest.objects.create(
            status='pending',
            created_by=user,
            **data
        )
        AuditLog.objects.create(
            user=user,
            action='service_request.create',
            module='services',
            details={
                'request_id': str(service_request.id), 
                'booking_id': str(service_request.booking.id),
                'service_id': str(service_request.service.id)
            }
        )
        return service_request

    @staticmethod
    def update_request(service_request, data, user):
        for key, value in data.items():
            setattr(service_request, key, value)
        service_request.save()
        
        AuditLog.objects.create(
            user=user,
            action='service_request.update',
            module='services',
            details={'request_id': str(service_request.id), 'updated_fields': list(data.keys())}
        )
        return service_request

    @staticmethod
    def assign_task(service_request, assigned_to_user, user):
        service_request.assigned_to = assigned_to_user
        if service_request.status == 'pending':
            service_request.status = 'in_progress'
        service_request.save()

        AuditLog.objects.create(
            user=user,
            action='service_request.assign',
            module='services',
            details={
                'request_id': str(service_request.id), 
                'assigned_to': str(assigned_to_user.id) if assigned_to_user else None
            }
        )
        return service_request

    STATUS_TRANSITIONS = {
        'pending': ['in_progress', 'closed'],
        'in_progress': ['waiting_client', 'completed', 'closed'],
        'waiting_client': ['in_progress', 'completed', 'closed'],
        'completed': ['closed'],
        'closed': [],
    }

    @staticmethod
    def _validate_transition(current_status, next_status):
        if next_status not in ServiceRequestService.STATUS_TRANSITIONS.get(current_status, []):
            raise ValidationError(
                f"Invalid status transition from '{current_status}' to '{next_status}'"
            )

    @staticmethod
    def update_status(service_request, new_status, user):
        old_status = service_request.status
        ServiceRequestService._validate_transition(old_status, new_status)

        service_request.status = new_status

        if new_status in ['completed', 'closed'] and not service_request.completed_at:
            service_request.completed_at = timezone.now()
        elif new_status not in ['completed', 'closed'] and old_status in ['completed', 'closed']:
            service_request.completed_at = None

        service_request.save()

        AuditLog.objects.create(
            user=user,
            action='service_request.status_update',
            module='services',
            details={'request_id': str(service_request.id), 'old_status': old_status, 'new_status': new_status}
        )
        return service_request
