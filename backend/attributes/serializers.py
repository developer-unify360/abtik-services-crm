from rest_framework import serializers
from attributes.models import Industry, LeadSource, PaymentType

class IndustrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Industry
        fields = ['id', 'name', 'is_active', 'created_at', 'updated_at']

class LeadSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadSource
        fields = ['id', 'name', 'is_active', 'created_at', 'updated_at']

class PaymentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentType
        fields = ['id', 'name', 'is_active', 'created_at', 'updated_at']
