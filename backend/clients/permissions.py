from rest_framework import permissions


class CanCreateClient(permissions.BasePermission):
    """Super Admin, Admin, BDE can create clients."""
    def has_permission(self, request, view):
        if not request.user or not request.user.role:
            return False
        if request.user.role.name == 'Super Admin':
            return True
        return request.user.role.permissions.filter(module='client', action='create').exists()


class CanUpdateClient(permissions.BasePermission):
    """Super Admin, Admin, BDE can update clients."""
    def has_permission(self, request, view):
        if not request.user or not request.user.role:
            return False
        if request.user.role.name == 'Super Admin':
            return True
        return request.user.role.permissions.filter(module='client', action='update').exists()


class CanDeleteClient(permissions.BasePermission):
    """Only Super Admin and Admin can delete clients."""
    def has_permission(self, request, view):
        if not request.user or not request.user.role:
            return False
        if request.user.role.name == 'Super Admin':
            return True
        return request.user.role.permissions.filter(module='client', action='delete').exists()
