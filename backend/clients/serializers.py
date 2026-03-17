import re
from rest_framework import serializers
from clients.models import Client


class ClientSerializer(serializers.ModelSerializer):
    """Full client serializer for detail views."""
    created_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'client_name', 'company_name', 'gst_pan', 'email',
            'mobile', 'industry', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return obj.created_by.name if obj.created_by else None


class ClientListSerializer(serializers.ModelSerializer):
    """Compact serializer for list views."""
    created_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'client_name', 'company_name', 'email',
            'mobile', 'industry', 'created_by_name', 'created_at',
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.name if obj.created_by else None


class ClientCreateUpdateSerializer(serializers.Serializer):
    """Serializer for creating/updating client records."""
    client_name = serializers.CharField(max_length=255)
    company_name = serializers.CharField(max_length=255)
    gst_pan = serializers.CharField(max_length=50, required=False, allow_blank=True)
    email = serializers.EmailField()
    mobile = serializers.CharField(max_length=20)
    industry = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_mobile(self, value):
        """Ensure mobile number is numeric."""
        cleaned = re.sub(r'[\s\-\+]', '', value)
        if not cleaned.isdigit():
            raise serializers.ValidationError("Mobile number must contain only digits.")
        if len(cleaned) < 10:
            raise serializers.ValidationError("Mobile number must be at least 10 digits.")
        return cleaned

    def validate_gst_pan(self, value):
        """Basic GST/PAN format validation."""
        if not value:
            return value
        value = value.strip().upper()
        # PAN: 5 uppercase letters + 4 digits + 1 uppercase letter
        pan_pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]$'
        # GST: 2 digits + PAN + 1 alphanum + Z + 1 alphanum
        gst_pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'
        if not (re.match(pan_pattern, value) or re.match(gst_pattern, value)):
            raise serializers.ValidationError("Invalid GST/PAN format.")
        return value
