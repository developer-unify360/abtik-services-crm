from .models import AuditLog

class AuditLogService:
    @staticmethod
    def log(*args, **kwargs):
        pass

    @staticmethod
    def log_action(tenant_id, user_id, action, module, details=None):
        if details is None:
            details = {}
        return AuditLog.objects.create(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            module=module,
            details=details
        )