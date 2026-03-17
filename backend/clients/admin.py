from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """
    Admin configuration for Client model.
    All fields are editable for Super Admin.
    """
    list_display = ('client_name', 'company_name', 'email', 'mobile', 'tenant', 'industry', 'created_by', 'created_at')
    list_filter = ('tenant', 'industry', 'created_at')
    search_fields = ('client_name', 'company_name', 'email', 'mobile', 'gst_pan')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Client Information', {
            'fields': ('client_name', 'company_name', 'gst_pan', 'email', 'mobile', 'industry')
        }),
        ('Tenant & Relationships', {
            'fields': ('tenant', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Super Admin can see all clients
        if request.user.is_superuser:
            return qs
        return qs.filter(tenant=request.user.tenant)
