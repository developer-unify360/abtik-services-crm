import uuid
from django.db import models


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantAwareManager(models.Manager):
    """
    Custom manager that auto-filters querysets by tenant_id.
    Usage: Model.tenant_objects.for_tenant(tenant_id)
    """
    def for_tenant(self, tenant_id):
        return self.get_queryset().filter(tenant_id=tenant_id)


class TenantAwareModel(UUIDModel):
    """
    Abstract base for all business models that require tenant isolation.
    Provides a tenant FK and a tenant-aware manager.
    """
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='%(class)s_set',
    )

    objects = models.Manager()
    tenant_objects = TenantAwareManager()

    class Meta:
        abstract = True
