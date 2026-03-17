import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from tenants.models import Tenant
from users.models import User
from roles.models import Role, Permission

@pytest.mark.django_db
class TestUserAPI:
    def setup_method(self):
        self.client = APIClient()
        self.tenant = Tenant.objects.create(name="Test Tenant")
        self.role = Role.objects.create(name="Admin")
        perm = Permission.objects.create(module="users", action="view")
        self.role.permissions.add(perm)
        
        self.user = User.objects.create_user(
            username='api@example.com',
            email='api@example.com',
            password='password123',
            tenant=self.tenant,
            role=self.role
        )

    def test_get_users_unauthenticated(self):
        url = reverse('user-list')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_users_authenticated(self):
        # We need to test taking a JWT with custom claims, this normally goes through the CustomTokenObtainPairView
        res = self.client.post(reverse('token_obtain_pair'), {'email': 'api@example.com', 'password': 'password123'})
        token = res.data['access']
        
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        url = reverse('user-list')
        response = self.client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['email'] == 'api@example.com'
