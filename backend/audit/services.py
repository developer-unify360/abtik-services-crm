from .models import AuditLog

class AuditLogService:
    @staticmethod
    def log_action(user_id, action, module, details=None):
        """
        Creates an audit log entry for a specific action.
        """
        return AuditLog.objects.create(
            user_id=user_id,
            action=action,
            module=module,
            details=details or {}
        )

    @staticmethod
    def get_logs(filters=None):
        """
        Retrieves audit logs with optional filtering.
        """
        queryset = AuditLog.objects.all().select_related('user')
        
        if filters:
            if 'user_id' in filters:
                queryset = queryset.filter(user_id=filters['user_id'])
            if 'module' in filters:
                queryset = queryset.filter(module=filters['module'])
            if 'action' in filters:
                queryset = queryset.filter(action=filters['action'])
            if 'date_from' in filters:
                queryset = queryset.filter(created_at__gte=filters['date_from'])
            if 'date_to' in filters:
                queryset = queryset.filter(created_at__lte=filters['date_to'])
                
        return queryset