from django.contrib import admin
from .models import Tenant, TenantSettings


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    """
    Admin configuration for Tenant model.
    All fields are editable for Super Admin.
    """
    list_display = ('name', 'industry', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'industry')
    search_fields = ('name', 'industry')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'industry', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50


@admin.register(TenantSettings)
class TenantSettingsAdmin(admin.ModelAdmin):
    """
    Admin configuration for TenantSettings model.
    All fields are editable for Super Admin.
    """
    list_display = ('tenant', 'timezone', 'currency', 'date_format', 'theme', 'created_at', 'updated_at')
    list_filter = ('timezone', 'currency', 'theme')
    search_fields = ('tenant__name',)
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Tenant', {
            'fields': ('tenant',)
        }),
        ('Settings', {
            'fields': ('timezone', 'currency', 'date_format', 'theme')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50
