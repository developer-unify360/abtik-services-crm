from rest_framework import permissions
from django.core.exceptions import PermissionDenied

class HasModulePermission(permissions.BasePermission):
    """
    Custom DRF permission checking the 'module.action' pattern.
    Usage: Needs to be subclassed or have a view attribute specifying the requirement.
    """
    def has_permission(self, request, view):
        # Allow Super Admin full access globally
        if getattr(request.user, 'is_superuser', False):
            return True

        if request.user.role and request.user.role.name == 'Super Admin':
            return True
            
        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            # If no specific permission required by view, check if user is authenticated
            return request.user and request.user.is_authenticated
            
        # Example validation against assigned roles/permissions
        # We assume `request.user.role.permissions` has strings like 'users.create'
        if not request.user.role:
            return False
            
        module, action = required_permission.split('.')
        
        has_perm = request.user.role.permissions.filter(
            module=module, action=action
        ).exists()
        
        print("USER:", request.user)
        print("ROLE:", request.user.role)
        print("REQUIRED:", required_permission)
        print("HAS PERM:", request.user.role.permissions.all())
        return has_perm

class IsTenantUser(permissions.BasePermission):
    """
    Ensures user belongs to the current tenant scope.
    Super Admin bypasses this check.
    """
    def has_permission(self, request, view):
        # Allow Super Admin full access globally (no tenant isolation)
        if getattr(request.user, 'is_superuser', False):
            return True

        if request.user.role and request.user.role.name == 'Super Admin':
            return True
            
        return bool(request.user and request.tenant_id and str(request.user.tenant_id) == str(request.tenant_id))

    def has_object_permission(self, request, view, obj):
        if getattr(request.user, 'is_superuser', False):
            return True

        if request.user.role and request.user.role.name == 'Super Admin':
            return True

        return hasattr(obj, 'tenant_id') and str(obj.tenant_id) == str(request.user.tenant_id)
