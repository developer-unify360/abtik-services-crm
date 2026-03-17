from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Admin configuration for AuditLog model.
    All fields are editable for Super Admin.
    """
    list_display = ('id', 'user', 'action', 'module', 'tenant', 'created_at')
    list_filter = ('module', 'action', 'tenant', 'created_at')
    search_fields = ('action', 'module', 'user__email', 'details')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Audit Information', {
            'fields': ('user', 'tenant', 'action', 'module')
        }),
        ('Details', {
            'fields': ('details',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 100
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Super Admin can see all audit logs
        if request.user.is_superuser:
            return qs
        return qs.filter(tenant=request.user.tenant)
