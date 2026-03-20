from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Admin configuration for AuditLog model.
    """
    list_display = ('id', 'user', 'action', 'module', 'created_at')
    list_filter = ('module', 'action', 'created_at')
    search_fields = ('action', 'module', 'user__email', 'details')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Audit Information', {
            'fields': ('user', 'action', 'module')
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
        return super().get_queryset(request)
