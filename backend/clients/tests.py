from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from clients.models import Client


class ClientModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='bde@test.com',
            email='bde@test.com',
            password='testpass',
            name='Test BDE',
        )

    def test_create_client(self):
        client = Client.objects.create(
            client_name='Amit Shah',
            company_name='Shah Industries',
            email='amit@shah.com',
            mobile='9999999999',
            created_by=self.user,
        )
        self.assertEqual(client.client_name, 'Amit Shah')
        self.assertIsNotNone(client.id)

    def test_client_str(self):
        client = Client.objects.create(
            client_name='Test',
            company_name='Corp',
            email='t@t.com',
            mobile='1111111111',
        )
        self.assertIn('Test', str(client))


class ClientAPITest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin@test.com',
            email='admin@test.com',
            password='testpass',
            name='Admin',
            is_staff=True,
            is_superuser=True,
        )

    def test_list_clients_unauthenticated(self):
        response = self.api_client.get('/api/v1/clients/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_clients_authenticated(self):
        Client.objects.create(
            client_name='Test Client',
            company_name='Test Corp',
            email='test@test.com',
            mobile='9999999999',
            created_by=self.admin_user,
        )
        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.get('/api/v1/clients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
