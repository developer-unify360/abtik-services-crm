from rest_framework import serializers
from django.contrib.auth import get_user_model
from leads.models import Lead, LeadActivity
from clients.models import Client
from attributes.models import LeadSource, Industry

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
    activities = LeadActivitySerializer(many=True, read_only=True)
    client_info = serializers.SerializerMethodField()

    def get_client_info(self, obj):
        return ClientLeadInfoSerializer(instance=obj.client).data

    class Meta:
        model = Lead
        fields = [
            'id', 'client', 'client_info', 'bde_name', 'source', 'source_name',
            'status', 'status_display', 'priority', 'priority_display', 
            'lead_score', 'assigned_to', 'assigned_to_name', 'notes', 
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
    notes = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        client_data = {
            'client_name': validated_data.pop('client_name'),
            'company_name': validated_data.pop('company_name'),
            'email': validated_data.pop('email'),
            'mobile': validated_data.pop('mobile'),
            'industry': validated_data.pop('industry', None),
        }
        
        # Create or get client
        client, created = Client.objects.get_or_create(
            email=client_data['email'],
            defaults=client_data
        )
        if not created and client_data['industry']:
             client.industry = client_data['industry']
             client.save()
        
        # Create lead
        lead = Lead.objects.create(
            client=client,
            **validated_data
        )
        return lead

class LeadListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list view."""
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    company_name = serializers.CharField(source='client.company_name', read_only=True)
    mobile = serializers.CharField(source='client.mobile', read_only=True)
    email = serializers.CharField(source='client.email', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    source_name = serializers.CharField(source='source.name', read_only=True)

    class Meta:
        model = Lead
        fields = [
            'id', 'client_name', 'company_name', 'mobile', 'email', 'bde_name',
            'source', 'source_name', 'status', 'status_display', 
            'priority', 'priority_display', 'lead_score', 'assigned_to_name', 
            'next_follow_up_date', 'created_at'
        ]

class LeadUpdateStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ['status', 'notes']
