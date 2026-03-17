from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from tenants.models import Tenant
from users.models import User
from roles.models import Role, Permission
from clients.models import Client


class ClientModelTest(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name='Test Org', industry='Tech')
        self.role = Role.objects.create(name='BDE', description='BDE role')
        # Add client permissions
        for action in ['create', 'view', 'update']:
            perm = Permission.objects.create(module='client', action=action)
            self.role.permissions.add(perm)
        
        self.user = User.objects.create_user(
            username='bde@test.com', email='bde@test.com', password='testpass',
            name='Test BDE', tenant=self.tenant, role=self.role,
        )

    def test_create_client(self):
        client = Client.objects.create(
            tenant=self.tenant,
            client_name='Amit Shah',
            company_name='Shah Industries',
            email='amit@shah.com',
            mobile='9999999999',
            industry='Manufacturing',
            created_by=self.user,
        )
        self.assertEqual(client.client_name, 'Amit Shah')
        self.assertEqual(client.tenant, self.tenant)
        self.assertIsNotNone(client.id)

    def test_tenant_isolation(self):
        """Clients from different tenants should be isolated."""
        tenant2 = Tenant.objects.create(name='Other Org')
        Client.objects.create(
            tenant=self.tenant, client_name='Client A',
            company_name='A Corp', email='a@a.com', mobile='1111111111',
            created_by=self.user,
        )
        Client.objects.create(
            tenant=tenant2, client_name='Client B',
            company_name='B Corp', email='b@b.com', mobile='2222222222',
        )
        # Tenant 1 should only see their client
        clients = Client.tenant_objects.for_tenant(self.tenant.id)
        self.assertEqual(clients.count(), 1)
        self.assertEqual(clients.first().client_name, 'Client A')


class ClientAPITest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.tenant = Tenant.objects.create(name='Test Org', industry='Tech')
        
        # Create BDE role with permissions
        self.bde_role = Role.objects.create(name='BDE')
        for action in ['create', 'view', 'update']:
            perm = Permission.objects.create(module='client', action=action)
            self.bde_role.permissions.add(perm)

        # Create Viewer role with view-only permission
        self.viewer_role = Role.objects.create(name='Viewer')
        view_perm = Permission.objects.get(module='client', action='view')
        self.viewer_role.permissions.add(view_perm)

        self.bde_user = User.objects.create_user(
            username='bde@test.com', email='bde@test.com', password='testpass',
            name='Test BDE', tenant=self.tenant, role=self.bde_role,
        )
        self.viewer_user = User.objects.create_user(
            username='viewer@test.com', email='viewer@test.com', password='testpass',
            name='Test Viewer', tenant=self.tenant, role=self.viewer_role,
        )

    def test_create_client_as_bde(self):
        self.api_client.force_authenticate(user=self.bde_user)
        # Simulate tenant middleware
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        
        data = {
            'client_name': 'Rahul Shah',
            'company_name': 'Shah Industries',
            'email': 'rahul@shah.com',
            'mobile': '9999999999',
            'industry': 'Manufacturing',
        }
        response = self.api_client.post('/api/v1/clients/', data, format='json')
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

    def test_list_clients(self):
        # Create clients including one with no created_by (legacy or import data)
        Client.objects.create(
            tenant=self.tenant, client_name='Test Client',
            company_name='Test Corp', email='test@test.com',
            mobile='9999999999', created_by=self.bde_user,
        )
        Client.objects.create(
            tenant=self.tenant, client_name='Orphan Client',
            company_name='Orphan Corp', email='orphan@test.com',
            mobile='8888888888',
        )

        self.api_client.force_authenticate(user=self.bde_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        
        response = self.api_client.get('/api/v1/clients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue('results' in response.data)
        self.assertEqual(len(response.data['results']), 2)
        orphan = next((c for c in response.data['results'] if c['email'] == 'orphan@test.com'), None)
        self.assertIsNotNone(orphan)
        self.assertIsNone(orphan['created_by_name'])
