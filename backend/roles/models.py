import uuid
from django.db import models
from core.models import UUIDModel

class Permission(UUIDModel):
    module = models.CharField(max_length=100)
    action = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)

    class Meta:
        unique_together = ('module', 'action')

    def __str__(self):
        return f"{self.module}.{self.action}"

class Role(UUIDModel):
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    permissions = models.ManyToManyField(Permission, related_name='roles')

    def __str__(self):
        return self.name
