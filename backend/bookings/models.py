from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import TenantAwareModel


def booking_attachment_upload_to(instance, filename):
    return f"bookings/attachments/{filename}"


class Bank(TenantAwareModel):
    """
    Represents a bank with account details for booking transactions.
    """
    bank_name = models.CharField(max_length=200)
    account_number = models.CharField(max_length=50)
    branch_name = models.CharField(max_length=200, blank=True)
    ifsc_code = models.CharField(max_length=20, blank=True)
    account_holder_name = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['bank_name', 'account_number']
        unique_together = [['tenant', 'bank_name', 'account_number']]

    def __str__(self):
        return f"{self.bank_name} - {self.account_number}"


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
    bde_name = models.CharField(max_length=255, null=True, blank=True)
    payment_type = models.CharField(max_length=30, choices=PAYMENT_TYPE_CHOICES)
    bank = models.ForeignKey(
        'Bank',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
    )
    booking_date = models.DateField()
    payment_date = models.DateField(null=True, blank=True)
    total_payment_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_payment_remarks = models.TextField(null=True, blank=True)
    received_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    received_amount_remarks = models.TextField(null=True, blank=True)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    remaining_amount_remarks = models.TextField(null=True, blank=True)
    after_fund_disbursement_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    after_fund_disbursement_remarks = models.TextField(null=True, blank=True)
    attachment = models.FileField(
        upload_to=booking_attachment_upload_to,
        null=True,
        blank=True,
    )
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
        if self.payment_date and self.payment_date > timezone.now().date():
            raise ValidationError({'payment_date': 'Payment date cannot be in the future.'})

        amount_fields = [
            'total_payment_amount',
            'received_amount',
            'remaining_amount',
            'after_fund_disbursement_percentage',
        ]
        for field_name in amount_fields:
            value = getattr(self, field_name)
            if value is not None and value < 0:
                raise ValidationError({field_name: 'Value cannot be negative.'})

        if (
            self.after_fund_disbursement_percentage is not None
            and self.after_fund_disbursement_percentage > 100
        ):
            raise ValidationError(
                {'after_fund_disbursement_percentage': 'Percentage cannot be greater than 100.'}
            )

    def __str__(self):
        return f"Booking {self.id} - {self.client.client_name} ({self.status})"
