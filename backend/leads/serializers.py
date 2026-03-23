from rest_framework import serializers
from django.contrib.auth import get_user_model
from leads.models import Lead, LeadActivity
from clients.models import Client
from attributes.models import LeadSource, Industry
from services.models import Service

User = get_user_model()

class ClientLeadInfoSerializer(serializers.ModelSerializer):
    industry_name = serializers.CharField(source='industry.name', read_only=True)
    class Meta:
        model = Client
        fields = ['id', 'client_name', 'company_name', 'email', 'mobile', 'industry', 'industry_name']

class LeadActivitySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.name', read_only=True)

    class Meta:
        model = LeadActivity
        fields = [
            'id', 'lead', 'activity_type', 'description', 
            'performed_by', 'performed_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'performed_by', 'created_at']

class LeadSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_name = serializers.CharField(source='source.name', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    activities = LeadActivitySerializer(many=True, read_only=True)
    client_info = serializers.SerializerMethodField()

    def get_client_info(self, obj):
        if obj.client:
            return ClientLeadInfoSerializer(instance=obj.client).data
        return {
            'id': None,
            'client_name': getattr(obj, 'client_name', ''),
            'company_name': getattr(obj, 'company_name', ''),
            'email': getattr(obj, 'email', ''),
            'mobile': getattr(obj, 'mobile', ''),
            'industry': obj.industry.id if obj.industry else None,
            'industry_name': obj.industry.name if obj.industry else None,
        }

    class Meta:
        model = Lead
        fields = [
            'id', 'client', 'client_info', 'bde_name', 'source', 'source_name',
            'status', 'status_display', 'priority', 'priority_display', 
            'lead_score', 'assigned_to', 'assigned_to_name', 'service', 'service_name', 'notes', 
            'last_contacted_at', 'next_follow_up_date', 'activities',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'activities', 'client_info']

class LeadCreateSerializer(serializers.Serializer):
    """Serializer for creating both Client and Lead from the public form."""
    bde_name = serializers.CharField(max_length=255)
    client_name = serializers.CharField(max_length=255)
    company_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    mobile = serializers.CharField(max_length=20)
    industry = serializers.PrimaryKeyRelatedField(queryset=Industry.objects.all(), required=False, allow_null=True)
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    source = serializers.PrimaryKeyRelatedField(queryset=LeadSource.objects.all(), required=False, allow_null=True)
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all(), required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        # Create lead
        # Assumes Lead model has client_name, company_name, email, mobile, industry fields
        lead = Lead.objects.create(
            client=None,
            **validated_data
        )
        return lead

class LeadListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list view."""
    client_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    mobile = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    source_name = serializers.CharField(source='source.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)

    def get_client_name(self, obj):
        return obj.client.client_name if obj.client else getattr(obj, 'client_name', '')

    def get_company_name(self, obj):
        return obj.client.company_name if obj.client else getattr(obj, 'company_name', '')

    def get_mobile(self, obj):
        return obj.client.mobile if obj.client else getattr(obj, 'mobile', '')

    def get_email(self, obj):
        return obj.client.email if obj.client else getattr(obj, 'email', '')

    class Meta:
        model = Lead
        fields = [
            'id', 'client_name', 'company_name', 'mobile', 'email', 'bde_name',
            'source', 'source_name', 'status', 'status_display', 
            'priority', 'priority_display', 'lead_score', 'assigned_to_name', 
            'service', 'service_name', 'next_follow_up_date', 'created_at'
        ]

class LeadUpdateStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ['status', 'notes']


class ExternalLeadSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    company_name = serializers.CharField(max_length=255)
    email_address = serializers.EmailField()
    contact_number = serializers.CharField(max_length=20)
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all(), required=False, allow_null=True)
    service_type = serializers.CharField(max_length=255, required=False, allow_blank=True)
    message = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        service = validated_data.pop('service', None)
        service_type = validated_data.pop('service_type', '')
        message = validated_data.pop('message', '')
        
        notes = ''
        if service_type:
            notes = f"Service Type: {service_type}\n"
        if message:
            notes += f"Message: {message}"
        
        lead_source = None
        try:
            lead_source = LeadSource.objects.get(name='Website')
        except LeadSource.DoesNotExist:
            lead_source = LeadSource.objects.create(name='Website', is_active=True)
        
        lead = Lead.objects.create(
            client=None,
            client_name=validated_data.pop('full_name'),
            company_name=validated_data.pop('company_name'),
            email=validated_data.pop('email_address'),
            mobile=validated_data.pop('contact_number'),
            bde_name=validated_data.get('bde_name', ''),
            source=lead_source,
            service=service,
            notes=notes if notes else None,
            assigned_to=validated_data.get('assigned_to', None),
        )
        return lead
