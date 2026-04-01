from django.db import models, transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from audit.models import AuditLog

from .models import (
    ClientDocumentPortal,
    ClientDocumentRequirement,
    ClientDocumentSubmission,
    Service,
    ServiceRequest,
)

class ServiceManagementService:
    @staticmethod
    def get_services():
        return Service.objects.all()

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
    TERMINAL_EXECUTION_STATUSES = {'completed', 'closed'}

    @staticmethod
    def list_requests(filters=None):
        queryset = ServiceRequest.objects.all().select_related(
            'service', 'assigned_to', 'booking', 'booking__client', 'handoff_reviewed_by'
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
            if 'handoff_status' in filters:
                queryset = queryset.filter(handoff_status=filters['handoff_status'])
            if 'handoff_incomplete' in filters:
                required_field_filters = (
                    models.Q(promised_timeline__isnull=True) | models.Q(promised_timeline__exact='')
                    | models.Q(client_primary_contact__isnull=True) | models.Q(client_primary_contact__exact='')
                    | models.Q(documents_received=False)
                    | models.Q(payment_visibility_summary__isnull=True) | models.Q(payment_visibility_summary__exact='')
                    | models.Q(note__isnull=True) | models.Q(note__exact='')
                )

                handoff_incomplete = str(filters['handoff_incomplete']).lower() in {'1', 'true', 'yes'}
                queryset = queryset.filter(required_field_filters) if handoff_incomplete else queryset.exclude(required_field_filters)
                
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
    def delete_request(service_request, user):
        details = {
            'request_id': str(service_request.id),
            'booking_id': str(service_request.booking.id),
            'service_id': str(service_request.service.id),
        }
        service_request.delete()

        AuditLog.objects.create(
            user=user,
            action='service_request.delete',
            module='services',
            details=details,
        )

    @staticmethod
    def sync_requests(booking, request_data_list, user):
        existing_requests = list(
            booking.service_requests.select_related('service').order_by('created_at', 'id')
        )
        requests_by_service_id = {}
        for existing_request in existing_requests:
            requests_by_service_id.setdefault(str(existing_request.service_id), []).append(existing_request)

        synced_requests = []
        for request_data in request_data_list:
            request_payload = dict(request_data)
            service = request_payload['service']
            service_key = str(service.id)
            matching_requests = requests_by_service_id.get(service_key, [])

            if matching_requests:
                current_request = matching_requests.pop(0)
                updates = {}

                if current_request.booking_id != booking.id:
                    updates['booking'] = booking
                if request_payload.get('priority') and current_request.priority != request_payload['priority']:
                    updates['priority'] = request_payload['priority']

                if updates:
                    current_request = ServiceRequestService.update_request(current_request, updates, user=user)

                synced_requests.append(current_request)
                continue

            request_payload['booking'] = booking
            synced_requests.append(ServiceRequestService.create_request(data=request_payload, user=user))

        for remaining_requests in requests_by_service_id.values():
            for stale_request in remaining_requests:
                ServiceRequestService.delete_request(stale_request, user=user)

        return synced_requests

    @staticmethod
    def assign_task(service_request, assigned_to_user, user):
        ServiceRequestService._ensure_request_not_closed(service_request)
        service_request.assigned_to = assigned_to_user
        if service_request.status == 'pending':
            service_request.status = 'assigned'
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
        'pending': ['assigned', 'closed'],
        'assigned': ['in_progress', 'closed'],
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
    def _validate_fulfillment_handoff(service_request, new_status):
        if new_status in ['in_progress', 'waiting_client', 'completed'] and service_request.handoff_status != 'accepted':
            raise ValidationError('IT handoff must be accepted before fulfillment can start.')

    @staticmethod
    def _ensure_request_not_closed(service_request):
        if service_request.status == 'closed':
            raise ValidationError('Closed execution requests cannot be edited.')

    @staticmethod
    def _sync_booking_status_from_execution(service_request, user):
        booking = service_request.booking

        if booking.status == 'cancelled':
            return

        has_active_requests = booking.service_requests.exclude(
            status__in=ServiceRequestService.TERMINAL_EXECUTION_STATUSES,
        ).exists()

        if has_active_requests or booking.status == 'completed':
            return

        previous_status = booking.status
        booking.status = 'completed'
        booking.save(update_fields=['status', 'updated_at'])

        AuditLog.objects.create(
            user=user,
            action='booking.auto_completed_from_execution',
            module='bookings',
            details={
                'booking_id': str(booking.id),
                'old_status': previous_status,
                'new_status': booking.status,
                'trigger_request_id': str(service_request.id),
            },
        )

    @staticmethod
    def update_status(service_request, new_status, user):
        old_status = service_request.status
        ServiceRequestService._validate_transition(old_status, new_status)
        ServiceRequestService._validate_fulfillment_handoff(service_request, new_status)

        service_request.status = new_status

        if new_status in ['completed', 'closed'] and not service_request.completed_at:
            service_request.completed_at = timezone.now()
        elif new_status not in ['completed', 'closed'] and old_status in ['completed', 'closed']:
            service_request.completed_at = None

        service_request.save()

        if new_status in ServiceRequestService.TERMINAL_EXECUTION_STATUSES:
            ServiceRequestService._sync_booking_status_from_execution(service_request, user)

        AuditLog.objects.create(
            user=user,
            action='service_request.status_update',
            module='services',
            details={'request_id': str(service_request.id), 'old_status': old_status, 'new_status': new_status}
        )
        return service_request

    @staticmethod
    def update_handoff(service_request, data, user):
        ServiceRequestService._ensure_request_not_closed(service_request)
        handoff_fields = [
            'note',
            'promised_timeline',
            'client_primary_contact',
            'documents_received',
            'payment_visibility_summary',
        ]
        updated_fields = []

        for field_name in handoff_fields:
            if field_name in data:
                value = data[field_name]
                if isinstance(value, str):
                    value = value.strip()
                setattr(service_request, field_name, value)
                updated_fields.append(field_name)

        if service_request.handoff_status == 'rejected':
            service_request.handoff_status = 'draft'
            service_request.handoff_rejection_reason = ''
            updated_fields.extend(['handoff_status', 'handoff_rejection_reason'])

        service_request.save()

        AuditLog.objects.create(
            user=user,
            action='service_request.handoff_updated',
            module='services',
            details={
                'request_id': str(service_request.id),
                'updated_fields': updated_fields,
            },
        )
        return service_request

    @staticmethod
    def submit_handoff(service_request, user):
        ServiceRequestService._ensure_request_not_closed(service_request)
        missing_fields = service_request.get_handoff_missing_fields()
        if missing_fields:
            raise ValidationError(f"Incomplete handoff. Missing fields: {', '.join(missing_fields)}")

        service_request.handoff_status = 'submitted'
        service_request.handoff_submitted_at = timezone.now()
        service_request.handoff_rejection_reason = ''
        service_request.save(update_fields=[
            'handoff_status',
            'handoff_submitted_at',
            'handoff_rejection_reason',
            'updated_at',
        ])

        AuditLog.objects.create(
            user=user,
            action='service_request.handoff_submitted',
            module='services',
            details={'request_id': str(service_request.id)},
        )
        return service_request

    @staticmethod
    def review_handoff(service_request, decision, rejection_reason, user):
        ServiceRequestService._ensure_request_not_closed(service_request)
        if decision == 'accepted':
            missing_fields = service_request.get_handoff_missing_fields()
            if missing_fields:
                raise ValidationError(f"Incomplete handoff. Missing fields: {', '.join(missing_fields)}")

            service_request.handoff_status = 'accepted'
            service_request.handoff_rejection_reason = ''
        else:
            if not rejection_reason or not rejection_reason.strip():
                raise ValidationError('Rejection reason is required when rejecting a handoff.')
            service_request.handoff_status = 'rejected'
            service_request.handoff_rejection_reason = rejection_reason.strip()

        service_request.handoff_reviewed_at = timezone.now()
        service_request.handoff_reviewed_by = user
        service_request.save(update_fields=[
            'handoff_status',
            'handoff_rejection_reason',
            'handoff_reviewed_at',
            'handoff_reviewed_by',
            'updated_at',
        ])

        AuditLog.objects.create(
            user=user,
            action='service_request.handoff_reviewed',
            module='services',
            details={
                'request_id': str(service_request.id),
                'decision': decision,
                'rejection_reason': service_request.handoff_rejection_reason,
            },
        )
        return service_request


class DocumentPortalService:
    @staticmethod
    def list_portals(filters=None):
        queryset = ClientDocumentPortal.objects.select_related(
            'client',
            'created_by',
            'updated_by',
        ).prefetch_related('requirements', 'submissions', 'submissions__requirement')

        if filters:
            if filters.get('client_id'):
                queryset = queryset.filter(client_id=filters['client_id'])
            if filters.get('has_submissions') is not None:
                has_submissions = str(filters['has_submissions']).lower() in {'1', 'true', 'yes'}
                queryset = queryset.filter(submissions__isnull=False).distinct() if has_submissions else queryset.filter(submissions__isnull=True)
            if filters.get('is_active') is not None:
                is_active = str(filters['is_active']).lower() in {'1', 'true', 'yes'}
                queryset = queryset.filter(is_active=is_active)

        return queryset

    @staticmethod
    def list_submissions(filters=None):
        queryset = ClientDocumentSubmission.objects.select_related(
            'portal',
            'portal__client',
            'requirement',
            'client',
        )

        if filters:
            if filters.get('client_id'):
                queryset = queryset.filter(client_id=filters['client_id'])
            if filters.get('portal_id'):
                queryset = queryset.filter(portal_id=filters['portal_id'])

        return queryset

    @staticmethod
    @transaction.atomic
    def create_or_update_portal(data, user):
        client = data['client']
        portal, created = ClientDocumentPortal.objects.get_or_create(
            client=client,
            defaults={
                'title': data.get('title', ''),
                'instructions': data.get('instructions', ''),
                'is_active': data.get('is_active', True),
                'created_by': user,
                'updated_by': user,
            },
        )

        if not created:
            portal.title = data.get('title', portal.title)
            portal.instructions = data.get('instructions', portal.instructions)
            portal.is_active = data.get('is_active', portal.is_active)
            portal.updated_by = user
            portal.save()

        DocumentPortalService.sync_requirements(
            portal=portal,
            requirements=data.get('requirements', []),
        )

        AuditLog.objects.create(
            user=user,
            action='document_portal.created' if created else 'document_portal.updated',
            module='services',
            details={
                'portal_id': str(portal.id),
                'client_id': str(portal.client_id),
                'requirement_count': portal.requirements.count(),
            },
        )

        return portal

    @staticmethod
    @transaction.atomic
    def sync_requirements(portal, requirements):
        existing_requirements = {
            str(requirement.id): requirement
            for requirement in portal.requirements.all()
        }
        retained_ids = set()

        for index, item in enumerate(requirements):
            requirement_id = str(item.get('id')) if item.get('id') else None
            payload = {
                'label': item.get('label', '').strip(),
                'description': item.get('description', '').strip(),
                'is_required': item.get('is_required', True),
                'sort_order': item.get('sort_order', index),
            }

            if requirement_id and requirement_id in existing_requirements:
                requirement = existing_requirements[requirement_id]
                for key, value in payload.items():
                    setattr(requirement, key, value)
                requirement.save()
                retained_ids.add(requirement_id)
                continue

            created_requirement = ClientDocumentRequirement.objects.create(
                portal=portal,
                **payload,
            )
            retained_ids.add(str(created_requirement.id))

        for requirement_id, requirement in existing_requirements.items():
            if requirement_id not in retained_ids:
                requirement.delete()

    @staticmethod
    def get_portal(portal_id):
        return ClientDocumentPortal.objects.select_related(
            'client',
            'created_by',
            'updated_by',
        ).prefetch_related('requirements', 'submissions', 'submissions__requirement').get(id=portal_id)

    @staticmethod
    def get_public_portal(token):
        return ClientDocumentPortal.objects.select_related('client').prefetch_related(
            'requirements',
            'submissions',
            'submissions__requirement',
        ).get(token=token, is_active=True)

    @staticmethod
    def record_share(portal):
        portal.last_shared_at = timezone.now()
        portal.save(update_fields=['last_shared_at', 'updated_at'])
        return portal

    @staticmethod
    @transaction.atomic
    def submit_documents(portal, submitted_by_name, submitted_by_email, documents):
        if not documents:
            raise ValidationError('Upload at least one document before submitting.')

        requirements_by_id = {
            str(requirement.id): requirement
            for requirement in portal.requirements.all()
        }
        created_submissions = []

        for document in documents:
            requirement = requirements_by_id.get(str(document.get('requirement_id'))) if document.get('requirement_id') else None
            file_obj = document.get('file')
            if not file_obj:
                continue

            document_name = (document.get('document_name') or (requirement.label if requirement else '')).strip()
            if not document_name:
                raise ValidationError('Document name is required for each uploaded file.')

            created_submissions.append(
                ClientDocumentSubmission.objects.create(
                    portal=portal,
                    client=portal.client,
                    requirement=requirement,
                    document_name=document_name,
                    file=file_obj,
                    note=(document.get('note') or '').strip(),
                    submitted_by_name=(submitted_by_name or '').strip(),
                    submitted_by_email=(submitted_by_email or '').strip(),
                )
            )

        if not created_submissions:
            raise ValidationError('Upload at least one document before submitting.')

        AuditLog.objects.create(
            user=None,
            action='document_portal.documents_uploaded',
            module='services',
            details={
                'portal_id': str(portal.id),
                'client_id': str(portal.client_id),
                'submission_count': len(created_submissions),
            },
        )

        return created_submissions
