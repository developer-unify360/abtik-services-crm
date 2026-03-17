from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import TenantAwareModel


class Booking(TenantAwareModel):
    """
    Represents a service engagement/booking initiated by BDE for a client.
    """

    PAYMENT_TYPE_CHOICES = [
        ('new_payment', 'New Payment'),
        ('remaining_payment', 'Remaining Payment'),
        ('complimentary', 'Complimentary'),
        ('converted', 'Converted'),
        ('transfer', 'Transfer'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.CASCADE,
        related_name='bookings',
    )
    bde_user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='bde_bookings',
    )
    payment_type = models.CharField(max_length=30, choices=PAYMENT_TYPE_CHOICES)
    bank_account = models.CharField(max_length=255, null=True, blank=True)
    booking_date = models.DateField()
    payment_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    class Meta:
        ordering = ['-booking_date', '-created_at']
        indexes = [
            models.Index(fields=['client'], name='idx_booking_client'),
            models.Index(fields=['status'], name='idx_booking_status'),
            models.Index(fields=['tenant', 'booking_date'], name='idx_booking_tenant_date'),
        ]

    def clean(self):
        if self.booking_date and self.booking_date > timezone.now().date():
            raise ValidationError({'booking_date': 'Booking date cannot be in the future.'})

    def __str__(self):
        return f"Booking {self.id} - {self.client.client_name} ({self.status})"
