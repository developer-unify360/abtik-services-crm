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
    category = serializers.PrimaryKeyRelatedField(
        queryset=ServiceCategory.objects.all(),
        required=False,
        allow_null=True,
    )
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = ['id', 'tenant', 'category', 'category_name', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def validate_category(self, value):
        request = self.context.get('request')
        if value is None or request is None:
            return value

        if str(value.tenant_id) != str(request.tenant_id):
            raise serializers.ValidationError('Selected category does not belong to your organization.')

        return value

    def validate_name(self, value):
        cleaned_value = value.strip()
        if not cleaned_value:
            raise serializers.ValidationError('Service name cannot be empty.')
        return cleaned_value


class ServiceRequestSerializer(serializers.ModelSerializer):
    # For list views, we often want to see details of related objects
    service_name = serializers.CharField(source='service.name', read_only=True)
    category_name = serializers.SerializerMethodField()
    assigned_user = UserSerializer(source='assigned_to', read_only=True)
    booking_details = BookingListSerializer(source='booking', read_only=True)
    created_by_user = UserSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'tenant', 'booking', 'booking_details', 'service', 'service_name', 
            'category_name', 'assigned_to', 'assigned_user', 'created_by', 'created_by_user',
            'status', 'priority', 
            'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'completed_at', 'created_at', 'updated_at']

    def get_category_name(self, obj):
        return obj.service.category.name if obj.service.category else None

class ServiceRequestCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ['booking', 'service', 'priority']

    def validate_booking(self, value):
        request = self.context.get('request')
        if request is not None and str(value.tenant_id) != str(request.tenant_id):
            raise serializers.ValidationError('Selected booking does not belong to your organization.')
        return value

    def validate_service(self, value):
        request = self.context.get('request')
        if request is not None and str(value.tenant_id) != str(request.tenant_id):
            raise serializers.ValidationError('Selected service does not belong to your organization.')
        return value

class ServiceRequestAssignSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ['assigned_to']

class ServiceRequestStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = ['status']
