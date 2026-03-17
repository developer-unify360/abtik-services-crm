import uuid
from django.db import models
from core.models import UUIDModel
from tenants.models import Tenant
from users.models import User

class AuditLog(UUIDModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='audit_logs', null=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=255)
    module = models.CharField(max_length=100)
    details = models.JSONField(default=dict)

    def __str__(self):
        return f"{self.action} by {self.user} at {self.created_at}"
