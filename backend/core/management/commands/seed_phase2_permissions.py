"""
Management command to seed Phase 2 permissions for clients and bookings.
Run: python manage.py seed_phase2_permissions
"""
from django.core.management.base import BaseCommand
from roles.models import Role, Permission


# Phase 2 permissions for client and booking modules
PHASE2_PERMISSIONS = [
    # Tenant management
    ('tenants', 'create', 'Create tenant'),
    ('tenants', 'view', 'View tenants'),
    ('tenants', 'update', 'Update tenant'),
    ('tenants', 'delete', 'Delete tenant'),
    # Client management
    ('client', 'create', 'Create client'),
    ('client', 'view', 'View clients'),
    ('client', 'update', 'Update client'),
    ('client', 'delete', 'Delete client'),
    # Booking management
    ('booking', 'create', 'Create booking'),
    ('booking', 'view', 'View bookings'),
    ('booking', 'update', 'Update booking'),
    ('booking', 'delete', 'Delete booking'),
    # User management
    ('users', 'view', 'View users'),
    ('users', 'create', 'Create user'),
    ('users', 'update', 'Update user'),
    ('users', 'delete', 'Delete user'),
]

# Role → permission mapping per Role & Permission Matrix document
ROLE_PERMISSIONS = {
    'Super Admin': [
        # Super Admin has all permissions (handled in code via role name check)
        # But we still assign them for completeness
        'tenants.create', 'tenants.view', 'tenants.update', 'tenants.delete',
        'client.create', 'client.view', 'client.update', 'client.delete',
        'booking.create', 'booking.view', 'booking.update', 'booking.delete',
        'users.view', 'users.create', 'users.update', 'users.delete',
    ],
    'Admin': [
        'tenants.view',
        'client.create', 'client.view', 'client.update', 'client.delete',
        'booking.create', 'booking.view', 'booking.update', 'booking.delete',
        'users.view', 'users.create', 'users.update', 'users.delete',
    ],
    'BDE': [
        'client.create', 'client.view', 'client.update',
        'booking.create', 'booking.view', 'booking.update',
    ],
    'IT Manager': [
        'client.view',
        'booking.view',
    ],
    'IT Staff': [
        'client.view',
        'booking.view',
    ],
    'Viewer': [
        'client.view',
        'booking.view',
    ],
}


class Command(BaseCommand):
    help = 'Seed Phase 2 permissions for clients and bookings modules'

    def handle(self, *args, **options):
        self.stdout.write('Seeding Phase 2 permissions...\n')

        # Create permissions
        created_count = 0
        for module, action, description in PHASE2_PERMISSIONS:
            perm, created = Permission.objects.get_or_create(
                module=module,
                action=action,
                defaults={'description': description},
            )
            if created:
                created_count += 1
                self.stdout.write(f'  Created permission: {module}.{action}')

        self.stdout.write(f'\nCreated {created_count} new permissions.\n')

        # Create roles if they don't exist and assign permissions
        for role_name, perm_strings in ROLE_PERMISSIONS.items():
            role, role_created = Role.objects.get_or_create(
                name=role_name,
                defaults={'description': f'{role_name} role'},
            )
            if role_created:
                self.stdout.write(f'  Created role: {role_name}')

            for perm_str in perm_strings:
                module, action = perm_str.split('.')
                try:
                    perm = Permission.objects.get(module=module, action=action)
                    role.permissions.add(perm)
                except Permission.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'  Permission {perm_str} not found, skipping.')
                    )

            self.stdout.write(f'  Assigned {len(perm_strings)} permissions to {role_name}')

        self.stdout.write(self.style.SUCCESS('\nPhase 2 permissions seeded successfully!'))
