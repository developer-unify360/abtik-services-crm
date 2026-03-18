from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from tenants.models import Tenant
from users.models import User
from roles.models import Role, Permission
from clients.models import Client
from bookings.models import Booking
from services.models import ServiceCategory, Service, ServiceRequest
from datetime import date


class ServicesModelTest(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name='Test Org', industry='Tech')
        self.role = Role.objects.create(name='IT Manager')
        self.user = User.objects.create_user(
            username='manager@test.com', email='manager@test.com', password='testpass',
            name='Test Manager', tenant=self.tenant, role=self.role,
        )
        self.client_record = Client.objects.create(
            tenant=self.tenant, client_name='Test Client',
            company_name='Test Corp', email='test@test.com',
            mobile='9999999999', created_by=self.user,
        )
        self.booking = Booking.objects.create(
            tenant=self.tenant,
            client=self.client_record,
            payment_type='new_payment',
            booking_date=date.today(),
            status='pending',
        )

    def test_create_service_category_and_service(self):
        category = ServiceCategory.objects.create(
            tenant=self.tenant,
            name='Digital Services',
            description='Web and marketing'
        )
        self.assertEqual(category.name, 'Digital Services')

        service = Service.objects.create(
            tenant=self.tenant,
            category=category,
            name='Website Development'
        )
        self.assertEqual(service.category, category)
        self.assertEqual(service.name, 'Website Development')

    def test_create_service_request(self):
        category = ServiceCategory.objects.create(tenant=self.tenant, name='Digital')
        service = Service.objects.create(tenant=self.tenant, category=category, name='SEO')
        
        request = ServiceRequest.objects.create(
            tenant=self.tenant,
            booking=self.booking,
            service=service,
            priority='high',
            status='pending'
        )
        self.assertEqual(request.status, 'pending')
        self.assertEqual(request.priority, 'high')


class ServicesAPITest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.tenant = Tenant.objects.create(name='Test Org', industry='Tech')
        
        # IT Manager role (Can manage, assign, update)
        self.manager_role = Role.objects.create(name='IT Manager')
        self.manager_user = User.objects.create_user(
            username='manager@test.com', email='manager@test.com', password='testpass',
            name='Test Manager', tenant=self.tenant, role=self.manager_role,
        )

        # IT Staff role (Can only update assigned tasks)
        self.staff_role = Role.objects.create(name='IT Staff')
        self.staff_user = User.objects.create_user(
            username='staff@test.com', email='staff@test.com', password='testpass',
            name='Test Staff', tenant=self.tenant, role=self.staff_role,
        )

        self.client_record = Client.objects.create(
            tenant=self.tenant, client_name='Test Client',
            company_name='Test Corp', email='test@test.com',
            mobile='9999999999', created_by=self.manager_user,
        )
        self.booking = Booking.objects.create(
            tenant=self.tenant, client=self.client_record,
            payment_type='new_payment', booking_date=date.today(),
        )

    def test_manager_can_create_category(self):
        self.api_client.force_authenticate(user=self.manager_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        
        data = {'name': 'New Category', 'description': 'Test'}
        response = self.api_client.post('/api/v1/service-categories/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_staff_cannot_create_category(self):
        self.api_client.force_authenticate(user=self.staff_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        
        data = {'name': 'New Category'}
        response = self.api_client.post('/api/v1/service-categories/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assign_and_update_task(self):
        category = ServiceCategory.objects.create(tenant=self.tenant, name='Digital')
        service = Service.objects.create(tenant=self.tenant, category=category, name='SEO')
        service_req = ServiceRequest.objects.create(
            tenant=self.tenant, booking=self.booking, service=service, status='pending'
        )

        # Manager assigns task to staff
        self.api_client.force_authenticate(user=self.manager_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        response = self.api_client.put(
            f'/api/v1/service-requests/{service_req.id}/assign/', 
            {'assigned_to': str(self.staff_user.id)}, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        service_req.refresh_from_db()
        self.assertEqual(service_req.assigned_to, self.staff_user)
        self.assertEqual(service_req.status, 'assigned')

        # Staff updates status
        self.api_client.force_authenticate(user=self.staff_user)
        response = self.api_client.patch(
            f'/api/v1/service-requests/{service_req.id}/status/', 
            {'status': 'completed'}, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        service_req.refresh_from_db()
        self.assertEqual(service_req.status, 'completed')
        self.assertIsNotNone(service_req.completed_at)
