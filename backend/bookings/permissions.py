from rest_framework import permissions


class CanCreateBooking(permissions.BasePermission):
    """Super Admin, Admin, BDE can create bookings."""
    def has_permission(self, request, view):
        if not request.user or not request.user.role:
            return False
        if request.user.role.name == 'Super Admin':
            return True
        return request.user.role.permissions.filter(module='booking', action='create').exists()


class CanUpdateBooking(permissions.BasePermission):
    """Super Admin, Admin, BDE can update bookings."""
    def has_permission(self, request, view):
        if not request.user or not request.user.role:
            return False
        if request.user.role.name == 'Super Admin':
            return True
        return request.user.role.permissions.filter(module='booking', action='update').exists()


class CanDeleteBooking(permissions.BasePermission):
    """Only Super Admin and Admin can delete bookings."""
    def has_permission(self, request, view):
        if not request.user or not request.user.role:
            return False
        if request.user.role.name == 'Super Admin':
            return True
        return request.user.role.permissions.filter(module='booking', action='delete').exists()
