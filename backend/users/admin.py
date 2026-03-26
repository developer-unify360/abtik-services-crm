from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .forms import UserAdminChangeForm, UserAdminCreationForm
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin configuration for User model.
    """
    form = UserAdminChangeForm
    add_form = UserAdminCreationForm
    list_display = ('email', 'username', 'name', 'role', 'status', 'is_active', 'is_staff', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser', 'status')
    search_fields = ('email', 'username', 'name', 'phone')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('email', 'username', 'password', 'name', 'phone', 'role')
        }),
        ('Status', {
            'fields': ('status',)
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
            'fields': (
                'email',
                'username',
                'name',
                'phone',
                'role',
                'status',
                'is_staff',
                'is_active',
                'password1',
                'password2',
            ),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_login')
    filter_horizontal = ('groups', 'user_permissions',)
    list_per_page = 50
