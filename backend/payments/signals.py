from django.db.models.signals import post_save
from django.dispatch import receiver

from bookings.models import Booking
from payments.models import Payment
from payments.services import PaymentService


@receiver(post_save, sender=Booking, dispatch_uid='payments.sync_booking_payment')
def sync_booking_payment(sender, instance, **kwargs):
    if instance.payments.filter(source=Payment.SOURCE_BOOKING).count() > 1:
        return

    PaymentService.sync_booking_payment(instance)
