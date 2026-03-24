from rest_framework.permissions import BasePermission


class IsRole(BasePermission):
    """
    Check that the authenticated user has one of the allowed roles.
    Usage: permission_classes = [IsAuthenticated, IsRole]
    Then set allowed_roles on the view or override get_allowed_roles().
    """
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Superusers bypass role checks
        if request.user.is_superuser:
            return True
        roles = getattr(view, 'allowed_roles', self.allowed_roles)
        return request.user.role in roles


class IsAdmin(BasePermission):
    """Only admin role or superuser."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.role == 'admin'


class IsManagerOrAdmin(BasePermission):
    """Admin or sales_manager role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.role in ('admin', 'sales_manager')
