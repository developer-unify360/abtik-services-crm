from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from tenants.models import Tenant
from users.models import User
from roles.models import Role
from clients.models import Client
from bookings.models import Booking
from services.models import Service, ServiceRequest
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

    def test_create_service(self):
        service = Service.objects.create(
            tenant=self.tenant,
            name='Website Development'
        )
        self.assertEqual(service.name, 'Website Development')

    def test_create_service_request(self):
        service = Service.objects.create(tenant=self.tenant, name='SEO')
        
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

        self.admin_role = Role.objects.create(name='Admin')
        self.admin_user = User.objects.create_user(
            username='admin@test.com', email='admin@test.com', password='testpass',
            name='Test Admin', tenant=self.tenant, role=self.admin_role,
        )
        
        # IT Manager role (Can assign and update requests)
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

    def test_admin_can_create_service(self):
        self.api_client.force_authenticate(user=self.admin_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        
        response = self.api_client.post('/api/v1/services/', {'name': 'SEO'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['data']['name'], 'SEO')

    def test_superuser_admin_without_tenant_can_create_service_with_selected_tenant_header(self):
        global_admin = User.objects.create_user(
            username='global-admin@test.com',
            email='global-admin@test.com',
            password='testpass',
            name='Global Admin',
            tenant=None,
            role=self.admin_role,
            is_superuser=True,
            is_staff=True,
        )
        access_token = str(RefreshToken.for_user(global_admin).access_token)

        self.api_client.credentials(
            HTTP_AUTHORIZATION=f'Bearer {access_token}',
            HTTP_TENANT_ID=str(self.tenant.id),
        )

        response = self.api_client.post('/api/v1/services/', {'name': 'Global SEO'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['data']['name'], 'Global SEO')
        self.assertEqual(response.data['data']['tenant'], str(self.tenant.id))

    def test_manager_cannot_create_service(self):
        self.api_client.force_authenticate(user=self.manager_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        
        response = self.api_client.post('/api/v1/services/', {'name': 'SEO'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_delete_service_in_use(self):
        service = Service.objects.create(tenant=self.tenant, name='SEO')
        ServiceRequest.objects.create(
            tenant=self.tenant, booking=self.booking, service=service, status='pending'
        )

        self.api_client.force_authenticate(user=self.admin_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))

        response = self.api_client.delete(f'/api/v1/services/{service.id}/')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_assign_and_update_task(self):
        service = Service.objects.create(tenant=self.tenant, name='SEO')
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

        # Staff updates status via in_progress before completed
        self.api_client.force_authenticate(user=self.staff_user)
        response = self.api_client.patch(
            f'/api/v1/service-requests/{service_req.id}/status/', 
            {'status': 'in_progress'}, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        service_req.refresh_from_db()
        self.assertEqual(service_req.status, 'in_progress')

        response = self.api_client.patch(
            f'/api/v1/service-requests/{service_req.id}/status/', 
            {'status': 'completed'}, 
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        service_req.refresh_from_db()
        self.assertEqual(service_req.status, 'completed')
        self.assertIsNotNone(service_req.completed_at)

    def test_status_transition_invalid(self):
        service = Service.objects.create(tenant=self.tenant, name='SEO')
        service_req = ServiceRequest.objects.create(
            tenant=self.tenant, booking=self.booking, service=service, status='pending'
        )

        self.api_client.force_authenticate(user=self.manager_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        response = self.api_client.patch(
            f'/api/v1/service-requests/{service_req.id}/status/',
            {'status': 'completed'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_role_scoped_list(self):
        service = Service.objects.create(tenant=self.tenant, name='SEO')

        # Request created by BDE (booking bde_user = manager)
        service_req1 = ServiceRequest.objects.create(
            tenant=self.tenant, booking=self.booking, service=service, status='pending'
        )

        # Assign to IT staff
        service_req2 = ServiceRequest.objects.create(
            tenant=self.tenant, booking=self.booking, service=service, status='assigned', assigned_to=self.staff_user)

        # BDE list should show requests for their booking
        self.api_client.force_authenticate(user=self.manager_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        response = self.api_client.get('/api/v1/service-requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get('data') if isinstance(response.data, dict) else response.data
        if isinstance(data, dict):
            data = data.get('results', [])
        self.assertIsInstance(data, list)
        self.assertTrue(any(req['id'] == str(service_req1.id) for req in data))

        # IT staff should see only assigned to them
        self.api_client.force_authenticate(user=self.staff_user)
        response = self.api_client.get('/api/v1/service-requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('data') if isinstance(response.data, dict) else response.data
        if isinstance(results, dict):
            results = results.get('results', [])
        self.assertIsInstance(results, list)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], str(service_req2.id))

    def test_create_task_from_request_endpoint(self):
        service = Service.objects.create(tenant=self.tenant, name='SEO')
        service_req = ServiceRequest.objects.create(
            tenant=self.tenant, booking=self.booking, service=service, status='pending'
        )

        from tasks.models import TaskBoard, TaskColumn
        board = TaskBoard.objects.create(
            tenant=self.tenant,
            name='Main Board',
            is_default=True,
            is_active=True,
            created_by=self.manager_user
        )
        TaskColumn.objects.create(
            tenant=self.tenant,
            board=board,
            name='To Do',
            status_key='pending',
            is_default=True,
            position=0
        )

        self.api_client.force_authenticate(user=self.manager_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))

        response = self.api_client.post(f'/api/v1/service-requests/{service_req.id}/create_task/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('data', response.data)
        self.assertIn('task', response.data['data'])

        service_req.refresh_from_db()
        self.assertEqual(service_req.status, 'assigned')
