import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import UUIDModel
from tenants.models import Tenant
from roles.models import Role

class User(AbstractUser, UUIDModel):
    name = models.CharField(max_length=255, null=True, blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    phone = models.CharField(max_length=20, null=True, blank=True)
    status = models.BooleanField(default=True)

    # Required for custom AbstractUser definition in django
    email = models.EmailField(unique=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
