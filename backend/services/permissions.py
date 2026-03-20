from rest_framework import permissions

class CanManageServices(permissions.BasePermission):
    """Admin-only permission for service management."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)

class CanAssignTasks(permissions.BasePermission):
    """Admin-only permission for assigning tasks."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)

class CanUpdateTaskStatus(permissions.BasePermission):
    """Assigned user or Admin can update status."""
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        return obj.assigned_to == request.user
