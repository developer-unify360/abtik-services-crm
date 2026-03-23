from rest_framework import serializers
from .models import Service, ServiceRequest
from users.serializers import UserSerializer
from bookings.serializers import BookingListSerializer


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_name(self, value):
        cleaned_value = value.strip()
        if not cleaned_value:
            raise serializers.ValidationError('Service name cannot be empty.')
        return cleaned_value


class ServiceRequestSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    assigned_user = UserSerializer(source='assigned_to', read_only=True)
    booking_details = BookingListSerializer(source='booking', read_only=True)
    created_by_user = UserSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'booking', 'booking_details', 'service', 'service_name',
            'assigned_to', 'assigned_user', 'created_by', 'created_by_user',
            'status', 'priority', 
            'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']

class ServiceRequestCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ['booking', 'service', 'priority']

class ServiceRequestAssignSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ['assigned_to']

class ServiceRequestStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ['status']
