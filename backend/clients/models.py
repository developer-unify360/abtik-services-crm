from django.db import models
from django.core.validators import EmailValidator
from core.models import BaseModel


class Client(BaseModel):
    """
    Represents a business client onboarded through the BDE booking form.
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
        blank=True,
        related_name='created_clients',
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email'], name='idx_client_email'),
            models.Index(fields=['company_name'], name='idx_client_company'),
        ]

    def __str__(self):
        return f"{self.client_name} ({self.company_name})"
