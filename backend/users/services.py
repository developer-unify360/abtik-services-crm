from django.core.exceptions import ValidationError
from users.models import User
from roles.models import Role

class UserService:
    @staticmethod
    def create_user(tenant_id, data):
        email = data.get('email')
        if User.objects.filter(email=email).exists():
            raise ValidationError("User with this email already exists.")
            
        user = User(
            username=email,
            email=email,
            name=data.get('name'),
            phone=data.get('phone'),
            tenant_id=tenant_id,
            role_id=data.get('role')
        )
        if data.get('password'):
            user.set_password(data.get('password'))
            
        user.save()
        return user

    @staticmethod
    def update_user(user, data):
        for field, value in data.items():
            if field == 'password' and value:
                user.set_password(value)
            elif field != 'password':
                 if hasattr(user, field):
                     setattr(user, field, value)
        user.save()
        return user

    @staticmethod
    def delete_user(user):
        user.status = False # Soft delete
        user.save()
        return user
