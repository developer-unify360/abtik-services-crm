from rest_framework import serializers
from tenants.models import Tenant, TenantSettings


class TenantSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantSettings
        fields = ['timezone', 'currency', 'date_format', 'theme']


class TenantSerializer(serializers.ModelSerializer):
    settings = TenantSettingsSerializer(read_only=True)

    class Meta:
        model = Tenant
        fields = ['id', 'name', 'industry', 'status', 'created_at', 'updated_at', 'settings']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TenantCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    industry = serializers.CharField(max_length=255, required=False, allow_blank=True)
    status = serializers.BooleanField(required=False, default=True)
    timezone = serializers.CharField(max_length=100, required=False, default='UTC')
    currency = serializers.CharField(max_length=10, required=False, default='USD')
    date_format = serializers.CharField(max_length=20, required=False, default='YYYY-MM-DD')
    theme = serializers.CharField(max_length=20, required=False, default='light')
