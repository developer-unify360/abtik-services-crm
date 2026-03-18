from rest_framework import permissions


class CanManageServices(permissions.BasePermission):
    """
    Allows management (create/update/delete) of services and categories.
    Typically reserved for Super Admin, Admin, and IT Manager.
    """
    def has_permission(self, request, view):
        if request.user.is_authenticated and request.user.role:
            role_name = request.user.role.name
            if role_name in ['Super Admin', 'Admin', 'IT Manager']:
                return True
        return False


class CanAssignTasks(permissions.BasePermission):
    """
    Allows assigning service requests to IT Staff.
    Reserved for IT Manager (and potentially Super Admin/Admin).
    """
    def has_permission(self, request, view):
        if request.user.is_authenticated and request.user.role:
            role_name = request.user.role.name
            if role_name in ['Super Admin', 'Admin', 'IT Manager']:
                return True
        return False


class CanUpdateTaskStatus(permissions.BasePermission):
    """
    Allows updating the status of a service request.
    Allowed for the assigned IT Staff, IT Manager, Admin, and Super Admin.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated or not request.user.role:
            return False

        role_name = request.user.role.name
        
        # Managers and Admins can update any task
        if role_name in ['Super Admin', 'Admin', 'IT Manager']:
            return True
            
        # IT Staff can only update tasks assigned to them
        if role_name == 'IT Staff':
            return obj.assigned_to == request.user
            
        return False
