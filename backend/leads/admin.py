from django.contrib import admin
from .models import Lead, LeadActivity


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    """
    Admin configuration for Lead model.
    """
    list_display = ('id', 'client', 'client_name', 'company_name', 'service', 'status', 'priority', 'lead_score', 'assigned_to', 'source', 'created_at')
    list_filter = ('status', 'priority', 'source', 'industry', 'created_at')
    search_fields = ('client__client_name', 'client__company_name', 'client_name', 'company_name', 'email', 'mobile', 'bde_name')
    ordering = ('-priority', '-lead_score', '-created_at')
    
    fieldsets = (
        ('Client Information', {
            'fields': ('client', 'client_name', 'company_name', 'email', 'mobile', 'industry')
        }),
        ('Lead Details', {
            'fields': ('bde_name', 'source', 'status', 'priority', 'lead_score', 'service')
        }),
        ('Assignment', {
            'fields': ('assigned_to',)
        }),
        ('Follow-up', {
            'fields': ('notes', 'last_contacted_at', 'next_follow_up_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    """
    Admin configuration for LeadActivity model.
    """
    list_display = ('id', 'lead', 'activity_type', 'performed_by', 'created_at')
    list_filter = ('activity_type', 'created_at')
    search_fields = ('lead__client__client_name', 'lead__client_name', 'description', 'performed_by__username')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Activity Details', {
            'fields': ('lead', 'activity_type', 'description', 'performed_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50
