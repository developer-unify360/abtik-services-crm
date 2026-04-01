from django.contrib import admin
from .models import (
    ClientDocumentPortal,
    ClientDocumentRequirement,
    ClientDocumentSubmission,
    Service,
    ServiceRequest,
)


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'booking', 'service', 'assigned_to', 'status',
        'priority', 'handoff_status', 'created_at',
    )
    list_filter = ('status', 'priority', 'handoff_status', 'created_at')
    search_fields = ('booking__client__client_name', 'service__name')
    readonly_fields = ('created_at', 'updated_at', 'completed_at')


class ClientDocumentRequirementInline(admin.TabularInline):
    model = ClientDocumentRequirement
    extra = 0


@admin.register(ClientDocumentPortal)
class ClientDocumentPortalAdmin(admin.ModelAdmin):
    list_display = ('client', 'title', 'is_active', 'last_shared_at', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('client__client_name', 'client__company_name', 'title', 'token')
    readonly_fields = ('token', 'created_at', 'updated_at', 'last_shared_at')
    inlines = [ClientDocumentRequirementInline]


@admin.register(ClientDocumentSubmission)
class ClientDocumentSubmissionAdmin(admin.ModelAdmin):
    list_display = ('document_name', 'client', 'requirement', 'submitted_by_name', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('document_name', 'client__client_name', 'client__company_name', 'submitted_by_name', 'submitted_by_email')
    readonly_fields = ('created_at', 'updated_at')
