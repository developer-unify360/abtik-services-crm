from django.contrib import admin
from .models import Permission, Role


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    """
    Admin configuration for Permission model.
    All fields are editable for Super Admin.
    """
    list_display = ('module', 'action', 'description', 'created_at', 'updated_at')
    list_filter = ('module',)
    search_fields = ('module', 'action', 'description')
    ordering = ('module', 'action')
    
    fieldsets = (
        ('Permission Details', {
            'fields': ('module', 'action', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """
    Admin configuration for Role model.
    All fields are editable for Super Admin.
    """
    list_display = ('name', 'description', 'get_permissions_count', 'created_at', 'updated_at')
    list_filter = ()
    search_fields = ('name', 'description')
    ordering = ('name',)
    
    fieldsets = (
        ('Role Details', {
            'fields': ('name', 'description')
        }),
        ('Permissions', {
            'fields': ('permissions',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    filter_horizontal = ('permissions',)
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50
    
    @admin.display(description='Permissions Count')
    def get_permissions_count(self, obj):
        return obj.permissions.count()
