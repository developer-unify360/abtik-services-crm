from rest_framework import serializers
from clients.models import Client

from .models import (
    ClientDocumentPortal,
    ClientDocumentRequirement,
    ClientDocumentSubmission,
    Service,
    ServiceRequest,
)
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
    handoff_status_display = serializers.CharField(source='get_handoff_status_display', read_only=True)
    handoff_reviewed_by_name = serializers.CharField(source='handoff_reviewed_by.name', read_only=True)
    handoff_is_complete = serializers.SerializerMethodField()
    handoff_missing_fields = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'booking', 'booking_details', 'service', 'service_name',
            'assigned_to', 'assigned_user', 'created_by', 'created_by_user',
            'status', 'priority',
            'note', 'promised_timeline',
            'client_primary_contact', 'documents_received',
            'payment_visibility_summary',
            'handoff_status', 'handoff_status_display',
            'handoff_rejection_reason', 'handoff_submitted_at',
            'handoff_reviewed_at', 'handoff_reviewed_by', 'handoff_reviewed_by_name',
            'handoff_is_complete', 'handoff_missing_fields',
            'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']

    def get_handoff_is_complete(self, obj):
        return obj.handoff_is_complete

    def get_handoff_missing_fields(self, obj):
        return obj.get_handoff_missing_fields()

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


class ServiceRequestHandoffSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequest
        fields = [
            'note',
            'promised_timeline',
            'client_primary_contact',
            'documents_received',
            'payment_visibility_summary',
        ]


class ServiceRequestHandoffReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=['accepted', 'rejected'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)


class ClientDocumentRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientDocumentRequirement
        fields = ['id', 'label', 'description', 'is_required', 'sort_order', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClientDocumentRequirementWriteSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False)
    label = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    is_required = serializers.BooleanField(required=False, default=True)
    sort_order = serializers.IntegerField(required=False, min_value=0)


class ClientDocumentSubmissionSerializer(serializers.ModelSerializer):
    requirement_label = serializers.CharField(source='requirement.label', read_only=True)
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    company_name = serializers.CharField(source='client.company_name', read_only=True)
    portal_title = serializers.CharField(source='portal.title', read_only=True)

    class Meta:
        model = ClientDocumentSubmission
        fields = [
            'id', 'portal', 'portal_title', 'client', 'client_name', 'company_name',
            'requirement', 'requirement_label', 'document_name', 'file', 'note',
            'submitted_by_name', 'submitted_by_email',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClientDocumentPortalSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    company_name = serializers.CharField(source='client.company_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.name', read_only=True)
    requirements = ClientDocumentRequirementSerializer(many=True, read_only=True)
    submissions = ClientDocumentSubmissionSerializer(many=True, read_only=True)
    required_documents_count = serializers.SerializerMethodField()
    submitted_documents_count = serializers.SerializerMethodField()
    missing_required_documents = serializers.SerializerMethodField()

    class Meta:
        model = ClientDocumentPortal
        fields = [
            'id', 'client', 'client_name', 'company_name', 'title', 'instructions',
            'token', 'is_active', 'created_by', 'created_by_name',
            'updated_by', 'updated_by_name', 'last_shared_at',
            'required_documents_count', 'submitted_documents_count',
            'missing_required_documents', 'requirements', 'submissions',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'token', 'created_by', 'updated_by', 'created_at', 'updated_at']

    def get_required_documents_count(self, obj):
        return obj.requirements.count()

    def get_submitted_documents_count(self, obj):
        return obj.submissions.count()

    def get_missing_required_documents(self, obj):
        uploaded_requirement_ids = {
            str(submission.requirement_id)
            for submission in obj.submissions.all()
            if submission.requirement_id
        }
        return [
            requirement.label
            for requirement in obj.requirements.all()
            if requirement.is_required and str(requirement.id) not in uploaded_requirement_ids
        ]


class ClientDocumentPortalWriteSerializer(serializers.Serializer):
    client = serializers.PrimaryKeyRelatedField(queryset=Client.objects.all())
    title = serializers.CharField(required=False, allow_blank=True)
    instructions = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False, default=True)
    requirements = ClientDocumentRequirementWriteSerializer(many=True)

    def validate_requirements(self, value):
        if not value:
            raise serializers.ValidationError('Add at least one requested document.')

        labels = set()
        for item in value:
            label = item['label'].strip().lower()
            if not label:
                raise serializers.ValidationError('Document labels cannot be empty.')
            if label in labels:
                raise serializers.ValidationError('Document labels must be unique within a portal.')
            labels.add(label)

        return value


class PublicClientDocumentPortalSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    company_name = serializers.CharField(source='client.company_name', read_only=True)
    requirements = ClientDocumentRequirementSerializer(many=True, read_only=True)
    submissions = ClientDocumentSubmissionSerializer(many=True, read_only=True)

    class Meta:
        model = ClientDocumentPortal
        fields = [
            'id', 'client_name', 'company_name', 'title', 'instructions',
            'token', 'requirements', 'submissions',
        ]


class PublicClientDocumentSubmissionItemSerializer(serializers.Serializer):
    requirement_id = serializers.UUIDField(required=False, allow_null=True)
    document_name = serializers.CharField(required=False, allow_blank=True)
    note = serializers.CharField(required=False, allow_blank=True)
    file_key = serializers.CharField()


class PublicClientDocumentSubmissionSerializer(serializers.Serializer):
    submitted_by_name = serializers.CharField(required=False, allow_blank=True)
    submitted_by_email = serializers.EmailField(required=False, allow_blank=True)
    documents = PublicClientDocumentSubmissionItemSerializer(many=True)
