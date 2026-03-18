from rest_framework import permissions
from roles.models import Role
from django.core.exceptions import ValidationError


class CanManageBoards(permissions.BasePermission):
    """
    Permission to manage task boards (create, edit, delete)
    """
    message = "You don't have permission to manage boards"
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super admin can do everything
        if request.user.role and request.user.role.name == 'Super Admin':
            return True
        
        # Admin can manage boards
        if request.user.role and request.user.role.name == 'Admin':
            return True
        
        # IT Manager can also manage boards
        if request.user.role and request.user.role.name == 'IT Manager':
            return True
        
        # Allow any authenticated user with a role to manage boards for now
        # This can be adjusted based on requirements
        if request.user.role:
            return True
        
        return False


class CanCreateTask(permissions.BasePermission):
    """
    Permission to create tasks
    """
    message = "You don't have permission to create tasks"
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super admin, Admin, IT Manager, BDE can create tasks
        if request.user.role:
            allowed_roles = ['Super Admin', 'Admin', 'IT Manager', 'BDE']
            if request.user.role.name in allowed_roles:
                return True
        
        return False


class CanEditTask(permissions.BasePermission):
    """
    Permission to edit tasks
    """
    message = "You don't have permission to edit this task"
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super admin and Admin can edit any task
        if request.user.role:
            if request.user.role.name in ['Super Admin', 'Admin']:
                return True
        
        # IT Manager can edit tasks in their tenant
        if request.user.role and request.user.role.name == 'IT Manager':
            if obj.tenant_id == request.user.tenant_id:
                return True
        
        # IT Staff can only edit tasks assigned to them
        if request.user.role and request.user.role.name == 'IT Staff':
            if obj.assignee and obj.assignee.id == request.user.id:
                return True
        
        # Reporter can edit their own tasks
        if obj.reporter and obj.reporter.id == request.user.id:
            return True
        
        return False


class CanDeleteTask(permissions.BasePermission):
    """
    Permission to delete tasks
    """
    message = "You don't have permission to delete this task"
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super admin and Admin can delete any task
        if request.user.role:
            if request.user.role.name in ['Super Admin', 'Admin']:
                return True
        
        return False


class CanAssignTask(permissions.BasePermission):
    """
    Permission to assign tasks to users
    """
    message = "You don't have permission to assign tasks"
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super admin and Admin can assign any task
        if request.user.role:
            if request.user.role.name in ['Super Admin', 'Admin']:
                return True
        
        # IT Manager can assign tasks
        if request.user.role and request.user.role.name == 'IT Manager':
            return True
        
        return False


class CanUpdateTaskStatus(permissions.BasePermission):
    """
    Permission to update task status
    """
    message = "You don't have permission to update task status"
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super admin and Admin can update any task status
        if request.user.role:
            if request.user.role.name in ['Super Admin', 'Admin']:
                return True
        
        # IT Manager can update status of any task in their tenant
        if request.user.role and request.user.role.name == 'IT Manager':
            if obj.tenant_id == request.user.tenant_id:
                return True
        
        # IT Staff can update status of assigned tasks
        if request.user.role and request.user.role.name == 'IT Staff':
            if obj.assignee and obj.assignee.id == request.user.id:
                return True
        
        return False


class CanManageLabels(permissions.BasePermission):
    """
    Permission to manage task labels
    """
    message = "You don't have permission to manage labels"
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super admin and Admin can manage labels
        if request.user.role:
            if request.user.role.name in ['Super Admin', 'Admin']:
                return True
        
        return False


class CanViewTask(permissions.BasePermission):
    """
    Permission to view tasks
    """
    message = "You don't have permission to view this task"
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # All authenticated users in the tenant can view tasks
        return True
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # All authenticated users in the tenant can view tasks
        if obj.tenant_id == request.user.tenant_id:
            return True
        
        return False


class CanLogTime(permissions.BasePermission):
    """
    Permission to log time on tasks
    """
    message = "You don't have permission to log time on this task"
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check tenant
        if obj.tenant_id != request.user.tenant_id:
            return False
        
        # Super admin, Admin, IT Manager can log time on any task
        if request.user.role:
            if request.user.role.name in ['Super Admin', 'Admin', 'IT Manager']:
                return True
        
        # IT Staff can log time on assigned tasks
        if request.user.role and request.user.role.name == 'IT Staff':
            if obj.assignee and obj.assignee.id == request.user.id:
                return True
        
        return False


class CanAddComment(permissions.BasePermission):
    """
    Permission to add comments to tasks
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # All users in tenant can comment
        if obj.tenant_id == request.user.tenant_id:
            return True
        
        return False


class CanDeleteComment(permissions.BasePermission):
    """
    Permission to delete comments
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Comment author can delete their own comment
        if obj.author and obj.author.id == request.user.id:
            return True
        
        # Super admin and Admin can delete any comment
        if request.user.role:
            if request.user.role.name in ['Super Admin', 'Admin']:
                return True
        
        return False
