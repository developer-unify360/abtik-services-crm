import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User


@pytest.mark.django_db
class TestUserAPI:
    def setup_method(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin@example.com',
            email='admin@example.com',
            password='password123',
            name='Admin',
            is_staff=True,
            is_superuser=True,
        )

    def test_get_users_unauthenticated(self):
        url = reverse('user-list')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_users_authenticated_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('user-list')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_public_user_list(self):
        url = reverse('user-public')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
