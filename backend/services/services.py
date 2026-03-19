from django.utils import timezone
from .models import ServiceCategory, Service, ServiceRequest
from django.core.exceptions import ValidationError
from audit.services import AuditLogService

class ServiceManagementService:
    @staticmethod
    def get_categories(tenant_id):
        return ServiceCategory.tenant_objects.for_tenant(tenant_id)

    @staticmethod
    def get_services(tenant_id, category_id=None):
        queryset = Service.tenant_objects.for_tenant(tenant_id)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset

    @staticmethod
    def create_category(tenant_id, data, user):
        category = ServiceCategory.objects.create(tenant_id=tenant_id, **data)
        AuditLogService.log_action(
            tenant_id=tenant_id,
            user_id=user.id,
            action='service_category.create',
            module='services',
            details={'category_id': str(category.id), 'name': category.name}
        )
        return category

    @staticmethod
    def create_service(tenant_id, data, user):
        service = Service.objects.create(tenant_id=tenant_id, **data)
        AuditLogService.log_action(
            tenant_id=tenant_id,
            user_id=user.id,
            action='service.create',
            module='services',
            details={'service_id': str(service.id), 'name': service.name}
        )
        return service


class ServiceRequestService:
    @staticmethod
    def list_requests(tenant_id, filters=None):
        queryset = ServiceRequest.tenant_objects.for_tenant(tenant_id).select_related(
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
    def create_request(tenant_id, data, user):
        service_request = ServiceRequest.objects.create(
            tenant_id=tenant_id, 
            status='pending',
            created_by=user,
            **data
        )
        AuditLogService.log_action(
            tenant_id=tenant_id,
            user_id=user.id,
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
        
        AuditLogService.log_action(
            tenant_id=service_request.tenant_id,
            user_id=user.id,
            action='service_request.update',
            module='services',
            details={'request_id': str(service_request.id), 'updated_fields': list(data.keys())}
        )
        return service_request

    @staticmethod
    def assign_task(service_request, assigned_to_user, user):
        """
        Assigns a service request to a specific user (IT Staff).
        """
        service_request.assigned_to = assigned_to_user
        if service_request.status == 'pending':
            service_request.status = 'assigned'
        service_request.save()

        AuditLogService.log_action(
            tenant_id=service_request.tenant_id,
            user_id=user.id,
            action='service_request.assign',
            module='services',
            details={
                'request_id': str(service_request.id), 
                'assigned_to': str(assigned_to_user.id) if assigned_to_user else None
            }
        )
        return service_request

    STATUS_TRANSITIONS = {
        'pending': ['assigned', 'closed'],
        'assigned': ['in_progress', 'waiting_client', 'closed'],
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
        """
        Updates the status of a service request. Handles completion timestamps and enforces workflow transitions.
        """
        old_status = service_request.status
        ServiceRequestService._validate_transition(old_status, new_status)

        service_request.status = new_status

        if new_status in ['completed', 'closed'] and not service_request.completed_at:
            service_request.completed_at = timezone.now()
        elif new_status not in ['completed', 'closed'] and old_status in ['completed', 'closed']:
            service_request.completed_at = None

        service_request.save()

        AuditLogService.log_action(
            tenant_id=service_request.tenant_id,
            user_id=user.id,
            action='service_request.status_update',
            module='services',
            details={
                'request_id': str(service_request.id), 
                'old_status': old_status,
                'new_status': new_status
            }
        )
        return service_request

    @staticmethod
    def create_task_from_request(service_request, user):
        from tasks.models import Task, TaskBoard, TaskColumn, TaskActivity

        # Check if task already exists for this request
        if hasattr(service_request, 'task') and service_request.task is not None:
            return service_request.task

        # Determine board and column to place task
        board = TaskBoard.tenant_objects.for_tenant(service_request.tenant_id).filter(is_default=True, is_active=True).first()
        if not board:
            board = TaskBoard.tenant_objects.for_tenant(service_request.tenant_id).filter(is_active=True).first()

        if not board:
            raise ValidationError('No active task board configured for this tenant.')

        column = TaskColumn.objects.filter(board=board, is_default=True).first()
        if not column:
            column = TaskColumn.objects.filter(board=board).order_by('position').first()

        task = Task.objects.create(
            tenant_id=service_request.tenant_id,
            board=board,
            column=column,
            title=f"{service_request.service.name} for {service_request.booking.client.client_name}",
            description=f"Auto-created task from Service Request {service_request.id}",
            task_type='task',
            status='pending',
            priority=service_request.priority,
            reporter=user,
            assignee=service_request.assigned_to,
            service_request=service_request
        )

        # Sync service request status
        if service_request.status == 'pending':
            service_request.status = 'assigned'
            service_request.save()

        TaskActivity.objects.create(
            tenant_id=service_request.tenant_id,
            task=task,
            user=user,
            action='created',
            description=f"Task auto-generated from request {service_request.id}"
        )

        return task
