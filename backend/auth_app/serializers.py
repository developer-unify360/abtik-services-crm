from rest_framework import serializers
from django.contrib.auth import authenticate
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['user_id'] = str(user.id)
        return token

    def validate(self, attrs):
        authenticate_kwargs = {
            'username': attrs['email'],
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

        data['user'] = {
            'id': str(user.id),
            'name': user.get_full_name() or getattr(user, 'name', user.username),
            'email': user.email,
            'is_staff': user.is_staff,
            'is_admin': user.is_staff or user.is_superuser,
        }

        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
