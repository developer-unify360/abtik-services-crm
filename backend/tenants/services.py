from django.db import transaction
from tenants.models import Tenant, TenantSettings
from audit.models import AuditLog


class TenantService:
    @staticmethod
    @transaction.atomic
    def create_tenant(data, user=None):
        """Create a new tenant with default settings."""
        tenant = Tenant.objects.create(
            name=data['name'],
            industry=data.get('industry', ''),
            status=data.get('status', True),
        )

        TenantSettings.objects.create(
            tenant=tenant,
            timezone=data.get('timezone', 'UTC'),
            currency=data.get('currency', 'USD'),
            date_format=data.get('date_format', 'YYYY-MM-DD'),
            theme=data.get('theme', 'light'),
        )

        # Audit log
        if user:
            AuditLog.objects.create(
                tenant=tenant,
                user=user,
                action='tenant.created',
                module='tenants',
                details={'tenant_name': tenant.name},
            )

        return tenant

    @staticmethod
    def update_tenant(tenant, data, user=None):
        """Update tenant details."""
        for field in ['name', 'industry', 'status']:
            if field in data:
                setattr(tenant, field, data[field])
        tenant.save()

        # Update settings if provided
        settings_fields = ['timezone', 'currency', 'date_format', 'theme']
        settings_data = {k: v for k, v in data.items() if k in settings_fields}
        if settings_data:
            settings, _ = TenantSettings.objects.get_or_create(tenant=tenant)
            for field, value in settings_data.items():
                setattr(settings, field, value)
            settings.save()

        if user:
            AuditLog.objects.create(
                tenant=tenant,
                user=user,
                action='tenant.updated',
                module='tenants',
                details={'updated_fields': list(data.keys())},
            )

        return tenant

    @staticmethod
    def list_tenants():
        """List all tenants."""
        return Tenant.objects.select_related('settings').all()

    @staticmethod
    def get_tenant(tenant_id):
        """Get a single tenant by ID."""
        return Tenant.objects.select_related('settings').get(id=tenant_id)

    @staticmethod
    def delete_tenant(tenant, user=None):
        """Soft-delete a tenant by setting status to inactive."""
        tenant.status = False
        tenant.save()

        if user:
            AuditLog.objects.create(
                tenant=tenant,
                user=user,
                action='tenant.deleted',
                module='tenants',
                details={'tenant_name': tenant.name},
            )

        return tenant
