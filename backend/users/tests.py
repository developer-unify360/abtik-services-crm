import pytest
from django.core.exceptions import ValidationError
from users.models import User
from users.services import UserService


@pytest.mark.django_db
class TestUserService:
    def test_create_user(self):
        data = {
            'email': 'test@example.com',
            'name': 'Test User',
            'phone': '1234567890',
            'password': 'securepassword123',
        }

        user = UserService.create_user(data)
        assert user.email == 'test@example.com'
        assert user.name == 'Test User'
        assert user.check_password('securepassword123')

    def test_duplicate_email(self):
        data = {'email': 'dup@example.com', 'name': 'Dup User'}
        UserService.create_user(data)

        with pytest.raises(ValidationError):
            UserService.create_user(data)

    def test_update_user(self):
        user = UserService.create_user({
            'email': 'update@example.com',
            'name': 'Original',
        })
        updated = UserService.update_user(user, {'name': 'Updated'})
        assert updated.name == 'Updated'

    def test_delete_user_soft(self):
        user = UserService.create_user({
            'email': 'delete@example.com',
            'name': 'To Delete',
        })
        UserService.delete_user(user)
        user.refresh_from_db()
        assert user.status is False
