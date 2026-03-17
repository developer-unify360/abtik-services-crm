from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['user_id'] = str(user.id)
        if hasattr(user, 'tenant') and user.tenant:
            token['tenant_id'] = str(user.tenant.id)
        if hasattr(user, 'role') and user.role:
            token['role'] = user.role.name
            token['role_id'] = str(user.role.id)

        return token

    def validate(self, attrs):
        authenticate_kwargs = {
            'username': attrs['email'],  # Since USERNAME_FIELD = 'email'
            'password': attrs['password'],
        }
        
        user = authenticate(**authenticate_kwargs)
        
        if user is None:
            raise serializers.ValidationError({'non_field_errors': ['Invalid email or password']})
        
        if not user.is_active:
            raise serializers.ValidationError({'non_field_errors': ['User account is disabled']})

        refresh = self.get_token(user)

        data = {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
        
        # Add user details to response
        data['user'] = {
            'id': str(user.id),
            'name': user.get_full_name() or user.username,
            'email': user.email,
            'role': user.role.name if getattr(user, 'role', None) else None,
            'tenant_id': str(user.tenant.id) if getattr(user, 'tenant', None) else None
        }
        
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
