from django.db.models.signals import post_save
from django.dispatch import receiver

from bookings.models import Booking
from payments.services import PaymentService


@receiver(post_save, sender=Booking, dispatch_uid='payments.sync_booking_payment')
def sync_booking_payment(sender, instance, **kwargs):
    PaymentService.sync_booking_payment(instance)
