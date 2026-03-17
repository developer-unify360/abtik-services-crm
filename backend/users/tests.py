import pytest
from django.core.exceptions import ValidationError
from users.models import User
from tenants.models import Tenant
from roles.models import Role
from users.services import UserService

@pytest.mark.django_db
class TestUserService:
    def test_create_user(self):
        tenant = Tenant.objects.create(name="Test Tenant")
        role = Role.objects.create(name="Admin")
        
        data = {
            'email': 'test@example.com',
            'name': 'Test User',
            'phone': '1234567890',
            'role': role.id,
            'password': 'securepassword123'
        }
        
        user = UserService.create_user(tenant.id, data)
        assert user.email == 'test@example.com'
        assert user.tenant == tenant
        assert user.check_password('securepassword123')

    def test_duplicate_email(self):
        tenant = Tenant.objects.create(name="Test Tenant")
        data = {'email': 'dup@example.com', 'name': 'Dup User'}
        UserService.create_user(tenant.id, data)
        
        with pytest.raises(ValidationError):
            UserService.create_user(tenant.id, data)
