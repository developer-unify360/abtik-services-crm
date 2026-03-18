from rest_framework import serializers
from users.models import User
from roles.models import Role

class UserSerializer(serializers.ModelSerializer):
    # Return role name instead of UUID for easier frontend handling
    role = serializers.CharField(source='role.name', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'role', 'role_name', 'status', 'created_at']
        extra_kwargs = {
            'password': {'write_only': True}
        }

class UserCreateUpdateSerializer(serializers.ModelSerializer):
    # Accept role as a role name string (e.g., 'BDE', 'Admin') instead of UUID
    role = serializers.CharField(required=True)
    
    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'role', 'password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }
