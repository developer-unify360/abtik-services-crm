from rest_framework import serializers
from .models import ServiceCategory, Service, ServiceRequest
from users.serializers import UserSerializer
from bookings.serializers import BookingListSerializer


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ['id', 'tenant', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']


class ServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'tenant', 'category', 'category_name', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']


class ServiceRequestSerializer(serializers.ModelSerializer):
    # For list views, we often want to see details of related objects
    service_name = serializers.CharField(source='service.name', read_only=True)
    category_name = serializers.CharField(source='service.category.name', read_only=True)
    assigned_user = UserSerializer(source='assigned_to', read_only=True)
    booking_details = BookingListSerializer(source='booking', read_only=True)
    
    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'tenant', 'booking', 'booking_details', 'service', 'service_name', 
            'category_name', 'assigned_to', 'assigned_user', 'status', 'priority', 
            'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'completed_at', 'created_at', 'updated_at']

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

