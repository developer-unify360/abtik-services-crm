import uuid
from django.db import models
from core.models import UUIDModel

class Tenant(UUIDModel):
    name = models.CharField(max_length=255)
    industry = models.CharField(max_length=255, null=True, blank=True)
    status = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

class TenantSettings(UUIDModel):
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='settings')
    timezone = models.CharField(max_length=100, default='UTC')
    currency = models.CharField(max_length=10, default='USD')
    date_format = models.CharField(max_length=20, default='YYYY-MM-DD')
    theme = models.CharField(max_length=20, default='light')

    def __str__(self):
        return f"{self.tenant.name} - Settings"
