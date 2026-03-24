from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models import BaseModel


def payment_attachment_upload_to(instance, filename):
    return f"payments/attachments/{instance.id}/{filename}"


class Payment(BaseModel):
    SOURCE_BOOKING = 'booking'
    SOURCE_MANUAL = 'manual'
    SOURCE_CHOICES = [
        (SOURCE_BOOKING, 'Booking'),
        (SOURCE_MANUAL, 'Manual'),
    ]

    booking = models.OneToOneField(
        'bookings.Booking',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payment_record',
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)
    client_name = models.CharField(max_length=255, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    gst_pan = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    payment_type = models.ForeignKey(
        'attributes.PaymentType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    bank = models.ForeignKey(
        'bookings.Bank',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    reference_number = models.CharField(max_length=100, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    total_payment_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_payment_remarks = models.TextField(blank=True)
    received_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    received_amount_remarks = models.TextField(blank=True)
    remaining_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    remaining_amount_remarks = models.TextField(blank=True)
    after_fund_disbursement_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    after_fund_disbursement_remarks = models.TextField(blank=True)
    attachment = models.FileField(upload_to=payment_attachment_upload_to, null=True, blank=True)
    remarks = models.TextField(blank=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['source'], name='idx_payment_source'),
            models.Index(fields=['payment_date'], name='idx_payment_date'),
            models.Index(fields=['client_name'], name='idx_payment_client_name'),
            models.Index(fields=['company_name'], name='idx_payment_company_name'),
        ]

    def clean(self):
        if self.source == self.SOURCE_BOOKING and not self.booking_id:
            raise ValidationError({'booking': 'Booking-linked payments must reference a booking.'})

        if self.source == self.SOURCE_MANUAL and self.booking_id:
            raise ValidationError({'booking': 'Manual payments cannot be linked to a booking.'})

        if not self.client_id and not (self.client_name and self.company_name):
            raise ValidationError(
                {'client_name': 'Select a client or provide client and company names for the payment.'}
            )

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
        if self.source == self.SOURCE_BOOKING and self.booking_id:
            return f"Payment for booking {self.booking_id}"
        return f"Payment - {self.client_name or self.company_name or self.id}"
