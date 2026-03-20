from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """
    Admin configuration for Client model.
    """
    list_display = ('client_name', 'company_name', 'email', 'mobile', 'industry', 'created_by', 'created_at')
    list_filter = ('industry', 'created_at')
    search_fields = ('client_name', 'company_name', 'email', 'mobile', 'gst_pan')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Client Information', {
            'fields': ('client_name', 'company_name', 'gst_pan', 'email', 'mobile', 'industry')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50
    
    def get_queryset(self, request):
        return super().get_queryset(request)
