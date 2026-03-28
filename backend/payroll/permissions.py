from rest_framework.permissions import BasePermission


class CanAccessPayroll(BasePermission):
    """Allow payroll access to admins, finance, HR, staff, and superusers."""

    allowed_roles = {'admin', 'finance', 'hr'}

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        normalized_role = (user.role or '').strip().lower()
        return bool(
            user.is_superuser
            or user.is_staff
            or normalized_role in self.allowed_roles
        )
