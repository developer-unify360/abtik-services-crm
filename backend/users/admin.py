from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin configuration for User model.
    All fields are editable for Super Admin.
    """
    list_display = ('email', 'username', 'name', 'tenant', 'role', 'status', 'is_active', 'is_staff', 'created_at')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'tenant', 'role', 'status')
    search_fields = ('email', 'username', 'name', 'phone')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('email', 'username', 'password', 'name', 'phone')
        }),
        ('Tenant & Role', {
            'fields': ('tenant', 'role', 'status')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important Dates', {
            'fields': ('last_login', 'created_at', 'updated_at')
        }),
    )
    
    add_fieldsets = (
        ('Create User', {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2', 'tenant', 'role', 'status', 'is_staff', 'is_active'),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_login')
    
    filter_horizontal = ('groups', 'user_permissions',)
    
    list_per_page = 50
