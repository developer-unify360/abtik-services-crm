from django.contrib import admin
from .models import (
    TaskBoard, TaskColumn, TaskLabel, Task, TaskSubtask,
    TaskLabelAssignment, TaskAttachment, TaskComment, TaskTimeLog,
    TaskActivity, TaskWatcher, TaskDependency
)


@admin.register(TaskBoard)
class TaskBoardAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'is_default', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_default', 'is_active', 'tenant']
    search_fields = ['name', 'description']


@admin.register(TaskColumn)
class TaskColumnAdmin(admin.ModelAdmin):
    list_display = ['name', 'board', 'status_key', 'color', 'position', 'is_default']
    list_filter = ['board', 'is_default']
    search_fields = ['name', 'status_key']
    ordering = ['board', 'position']


@admin.register(TaskLabel)
class TaskLabelAdmin(admin.ModelAdmin):
    list_display = ['name', 'color', 'tenant', 'created_at']
    list_filter = ['tenant']
    search_fields = ['name', 'description']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['task_number', 'title', 'task_type', 'status', 'priority', 'assignee', 'column', 'created_at']
    list_filter = ['status', 'priority', 'task_type', 'column', 'tenant']
    search_fields = ['task_number', 'title', 'description']
    readonly_fields = ['task_number', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']


@admin.register(TaskSubtask)
class TaskSubtaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'parent_task', 'is_completed', 'completed_at', 'position']
    list_filter = ['is_completed', 'parent_task']
    search_fields = ['title']


@admin.register(TaskAttachment)
class TaskAttachmentAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'task', 'uploaded_by', 'file_size', 'created_at']
    list_filter = ['task', 'uploaded_by']
    search_fields = ['file_name']


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ['task', 'author', 'content_preview', 'is_internal', 'created_at']
    list_filter = ['is_internal', 'task']
    search_fields = ['content']
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'


@admin.register(TaskTimeLog)
class TaskTimeLogAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'time_spent', 'description', 'started_at', 'is_running']
    list_filter = ['task', 'user', 'is_running']
    search_fields = ['description']


@admin.register(TaskActivity)
class TaskActivityAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'action', 'field_name', 'created_at']
    list_filter = ['action', 'task']
    search_fields = ['description']
    date_hierarchy = 'created_at'


@admin.register(TaskWatcher)
class TaskWatcherAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'created_at']
    list_filter = ['task', 'user']


@admin.register(TaskDependency)
class TaskDependencyAdmin(admin.ModelAdmin):
    list_display = ['task', 'depends_on', 'dependency_type', 'created_at']
    list_filter = ['dependency_type', 'task']
