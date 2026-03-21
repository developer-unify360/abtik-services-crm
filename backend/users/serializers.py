from rest_framework import serializers
from users.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'status', 'created_at']
        extra_kwargs = {
            'password': {'write_only': True}
        }

class UserPublicSerializer(serializers.ModelSerializer):
    """Lighter user info for public lead generation form."""
    class Meta:
        model = User
        fields = ['id', 'name', 'email']

class UserCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'password', 'status']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }
