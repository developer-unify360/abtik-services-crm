import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from services.models import ServiceCategory, Service, ServiceRequest
from bookings.models import Booking
from tenants.models import Tenant
from users.models import User
from rest_framework.test import APIClient
from roles.models import Role

# Setup
tenant = Tenant.objects.create(name='T1')
role_bde = Role.objects.create(name='BDE')
role_it = Role.objects.create(name='IT Staff')
manager, _ = User.objects.update_or_create(username='manager', defaults={'email': 'manager@example.com', 'tenant': tenant})
manager.set_password('pass')
manager.save()
staff, _ = User.objects.update_or_create(username='staff', defaults={'email': 'staff@example.com', 'tenant': tenant})
staff.set_password('pass')
staff.save()
manager.role = role_bde
manager.save()
staff.role = role_it
staff.save()

from django.utils import timezone
from clients.models import Client
client = Client.objects.create(tenant=tenant, client_name='Acme', company_name='Acme Corp', email='acme@example.com', mobile='1234567890', created_by=manager)
booking = Booking.objects.create(tenant=tenant, client=client, bde_user=manager, booking_date=timezone.now())
category = ServiceCategory.objects.create(tenant=tenant, name='Digital')
service = Service.objects.create(tenant=tenant, category=category, name='SEO')

ServiceRequest.objects.create(tenant=tenant, booking=booking, service=service, status='pending')
ServiceRequest.objects.create(tenant=tenant, booking=booking, service=service, status='assigned', assigned_to=staff)

client = APIClient()
client.force_authenticate(user=manager)
client.credentials(HTTP_TENANT_ID=str(tenant.id))
response = client.get('/api/v1/service-requests/')
print('status', response.status_code)
print('data', response.data)
print('content', response.content)
