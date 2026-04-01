import os
import secrets
import uuid

from django.db import models
from django.utils.text import get_valid_filename

from core.models import BaseModel


CLIENT_DOCUMENT_FILE_MAX_LENGTH = 255
CLIENT_DOCUMENT_FILENAME_MAX_LENGTH = 120


def generate_document_portal_token():
    return secrets.token_urlsafe(24)


def normalize_client_document_filename(filename):
    original_name = os.path.basename(filename or '') or 'document'
    cleaned_name = get_valid_filename(original_name) or 'document'
    stem, extension = os.path.splitext(cleaned_name)
    max_stem_length = max(1, CLIENT_DOCUMENT_FILENAME_MAX_LENGTH - len(extension))
    return f"{stem[:max_stem_length]}{extension}"


def client_document_upload_to(instance, filename):
    submission_id = instance.id or uuid.uuid4()
    safe_filename = normalize_client_document_filename(filename)
    return f"client-documents/{instance.portal.client_id}/{submission_id}/{safe_filename}"

class Service(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class ServiceRequest(BaseModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('waiting_client', 'Waiting for Client'),
        ('completed', 'Completed'),
        ('closed', 'Closed'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    HANDOFF_STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    HANDOFF_REQUIRED_FIELDS = {
        'promised_timeline': 'Promised timeline',
        'client_primary_contact': 'Client primary contact',
        'documents_received': 'Documents received',
        'payment_visibility_summary': 'Payment visibility summary',
        'note': 'Note from BDE to IT',
    }

    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='service_requests'
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.PROTECT,
        related_name='requests'
    )
    assigned_to = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks'
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_service_requests'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    note = models.TextField(blank=True, default='')
    promised_timeline = models.CharField(max_length=255, blank=True, default='')
    client_primary_contact = models.TextField(blank=True, default='')
    documents_received = models.BooleanField(default=False)
    payment_visibility_summary = models.TextField(blank=True, default='')
    handoff_status = models.CharField(
        max_length=20,
        choices=HANDOFF_STATUS_CHOICES,
        default='draft',
    )
    handoff_rejection_reason = models.TextField(blank=True, default='')
    handoff_submitted_at = models.DateTimeField(null=True, blank=True)
    handoff_reviewed_at = models.DateTimeField(null=True, blank=True)
    handoff_reviewed_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_service_handoffs',
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status'], name='idx_service_req_status'),
            models.Index(fields=['assigned_to'], name='idx_service_req_assigned'),
            models.Index(fields=['handoff_status'], name='idx_service_req_handoff'),
        ]

    def __str__(self):
        return f"Request {self.id} - {self.service.name} ({self.status})"

    def get_handoff_missing_fields(self):
        missing_fields = []

        for field_name, label in self.HANDOFF_REQUIRED_FIELDS.items():
            value = getattr(self, field_name, '')
            if value is None or (isinstance(value, str) and not value.strip()):
                missing_fields.append(label)

        return missing_fields

    @property
    def handoff_is_complete(self):
        return len(self.get_handoff_missing_fields()) == 0


class ClientDocumentPortal(BaseModel):
    client = models.OneToOneField(
        'clients.Client',
        on_delete=models.CASCADE,
        related_name='document_portal',
    )
    title = models.CharField(max_length=255, blank=True, default='')
    instructions = models.TextField(blank=True, default='')
    token = models.CharField(max_length=64, unique=True, default=generate_document_portal_token)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_document_portals',
    )
    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_document_portals',
    )
    last_shared_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['client__company_name', 'client__client_name']

    def __str__(self):
        return self.title or f"{self.client.company_name} Document Portal"


class ClientDocumentRequirement(BaseModel):
    portal = models.ForeignKey(
        ClientDocumentPortal,
        on_delete=models.CASCADE,
        related_name='requirements',
    )
    label = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    is_required = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'created_at']

    def __str__(self):
        return self.label


class ClientDocumentSubmission(BaseModel):
    portal = models.ForeignKey(
        ClientDocumentPortal,
        on_delete=models.CASCADE,
        related_name='submissions',
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.CASCADE,
        related_name='document_submissions',
    )
    requirement = models.ForeignKey(
        ClientDocumentRequirement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submissions',
    )
    document_name = models.CharField(max_length=255)
    file = models.FileField(upload_to=client_document_upload_to, max_length=CLIENT_DOCUMENT_FILE_MAX_LENGTH)
    note = models.TextField(blank=True, default='')
    submitted_by_name = models.CharField(max_length=255, blank=True, default='')
    submitted_by_email = models.EmailField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client'], name='idx_doc_submission_client'),
            models.Index(fields=['portal'], name='idx_doc_submission_portal'),
        ]

    def __str__(self):
        return self.document_name
