from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import BaseModel


class User(AbstractUser, BaseModel):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('sales_manager', 'Sales Manager'),
        ('booking_ops', 'Booking Ops'),
        ('finance', 'Finance'),
        ('service_ops', 'Service Ops'),
    ]

    name = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    status = models.BooleanField(default=True)
    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        null=True,
        blank=True,
        help_text="System role for access control. BDEs use public forms and do not have system roles.",
    )

    # Email as username
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'

    def __str__(self):
        return self.email
