import re
from django.db import models
from django.core.validators import EmailValidator
from core.models import TenantAwareModel


class Client(TenantAwareModel):
    """
    Represents a business client onboarded by BDE.
    Each client belongs to a single tenant.
    """
    client_name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255)
    gst_pan = models.CharField(max_length=50, null=True, blank=True)
    email = models.EmailField(validators=[EmailValidator()])
    mobile = models.CharField(max_length=20)
    industry = models.CharField(max_length=255, null=True, blank=True)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_clients',
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email'], name='idx_client_email'),
            models.Index(fields=['company_name'], name='idx_client_company'),
            models.Index(fields=['tenant', 'created_at'], name='idx_client_tenant_date'),
        ]

    def __str__(self):
        return f"{self.client_name} ({self.company_name})"
