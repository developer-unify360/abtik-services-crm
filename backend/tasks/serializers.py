from rest_framework import serializers
from .models import (
    TaskBoard, TaskColumn, TaskLabel, Task, TaskSubtask,
    TaskLabelAssignment, TaskAttachment, TaskComment, TaskTimeLog,
    TaskActivity, TaskWatcher, TaskDependency
)
from users.serializers import UserSerializer


class TaskBoardSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    columns_count = serializers.SerializerMethodField()
    tenant = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = TaskBoard
        fields = '__all__'
    
    def get_columns_count(self, obj):
        return obj.columns.count()


class TaskColumnSerializer(serializers.ModelSerializer):
    tasks_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskColumn
        fields = '__all__'
        extra_kwargs = {
            'tenant': {'required': False},
        }
    
    def get_tasks_count(self, obj):
        return obj.tasks.count()


class TaskLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskLabel
        fields = '__all__'
        extra_kwargs = {
            'tenant': {'required': False},
        }


class TaskSubtaskSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.CharField(source='completed_by.name', read_only=True)
    
    class Meta:
        model = TaskSubtask
        fields = '__all__'


class TaskAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskAttachment
        fields = '__all__'
    
    def get_file_url(self, obj):
        # Return the file URL - in production this would be a full URL
        return obj.file_path


class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True)
    author_email = serializers.CharField(source='author.email', read_only=True)
    edited_by_name = serializers.CharField(source='edited_by.name', read_only=True)
    
    class Meta:
        model = TaskComment
        fields = '__all__'


class TaskTimeLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskTimeLog
        fields = '__all__'
    
    def get_duration_formatted(self, obj):
        hours = obj.time_spent // 60
        minutes = obj.time_spent % 60
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"


class TaskActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = TaskActivity
        fields = '__all__'


class TaskWatcherSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = TaskWatcher
        fields = '__all__'


class TaskDependencySerializer(serializers.ModelSerializer):
    depends_on_task_number = serializers.CharField(source='depends_on.task_number', read_only=True)
    depends_on_title = serializers.CharField(source='depends_on.title', read_only=True)
    dependency_type_display = serializers.CharField(source='get_dependency_type_display', read_only=True)
    
    class Meta:
        model = TaskDependency
        fields = '__all__'


class TaskLabelAssignmentSerializer(serializers.ModelSerializer):
    label = TaskLabelSerializer(read_only=True)
    label_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = TaskLabelAssignment
        fields = '__all__'


class TaskSerializer(serializers.ModelSerializer):
    # Task relations
    board_name = serializers.CharField(source='board.name', read_only=True)
    column_name = serializers.CharField(source='column.name', read_only=True)
    assignee_name = serializers.CharField(source='assignee.name', read_only=True)
    assignee_email = serializers.CharField(source='assignee.email', read_only=True)
    reporter_name = serializers.CharField(source='reporter.name', read_only=True)
    
    # Status and priority display
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    
    # Related counts
    subtasks_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    attachments_count = serializers.SerializerMethodField()
    time_spent_total = serializers.SerializerMethodField()
    subtasks_completed = serializers.SerializerMethodField()
    
    # Labels
    labels = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = '__all__'
    
    def get_subtasks_count(self, obj):
        return obj.subtasks.count()
    
    def get_subtasks_completed(self, obj):
        return obj.subtasks.filter(is_completed=True).count()
    
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    def get_attachments_count(self, obj):
        return obj.attachments.count()
    
    def get_time_spent_total(self, obj):
        total_minutes = sum(log.time_spent for log in obj.time_logs.all())
        hours = total_minutes // 60
        minutes = total_minutes % 60
        if hours > 0:
            return f"{hours}h {minutes}m"
        return f"{minutes}m"
    
    def get_labels(self, obj):
        labels = obj.label_assignments.select_related('label').all()
        return TaskLabelSerializer([la.label for la in labels], many=True).data


class TaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating tasks"""
    labels = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    assignee_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = Task
        fields = [
            'board', 'column', 'title', 'description', 'task_type',
            'priority', 'assignee_id', 'reporter', 'start_date', 'due_date',
            'estimated_hours', 'labels', 'service_request'
        ]
    
    def create(self, validated_data):
        labels_data = validated_data.pop('labels', [])
        assignee_id = validated_data.pop('assignee_id', None)
        
        if assignee_id:
            from users.models import User
            try:
                validated_data['assignee'] = User.objects.get(id=assignee_id)
            except User.DoesNotExist:
                pass
        
        task = Task.objects.create(**validated_data)
        
        # Add labels
        if labels_data:
            from tasks.models import TaskLabel
            labels = TaskLabel.objects.filter(id__in=labels_data, tenant=validated_data.get('tenant'))
            for label in labels:
                TaskLabelAssignment.objects.create(task=task, label=label)
        
        # Log activity
        TaskActivity.objects.create(
            task=task,
            user=self.context['request'].user,
            action='created',
            description=f'Task created'
        )
        
        return task


class TaskUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating tasks"""
    labels = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    assignee_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'task_type', 'status', 'priority',
            'assignee_id', 'start_date', 'due_date', 'estimated_hours',
            'actual_hours', 'is_blocked', 'blocking_reason', 'completion_notes',
            'column', 'labels'
        ]
    
    def update(self, instance, validated_data):
        labels_data = validated_data.pop('labels', None)
        assignee_id = validated_data.pop('assignee_id', None)
        user = self.context['request'].user
        
        # Track changes for activity log
        for field_name, new_value in validated_data.items():
            old_value = getattr(instance, field_name)
            if old_value != new_value:
                TaskActivity.objects.create(
                    task=instance,
                    user=user,
                    action='updated',
                    field_name=field_name,
                    old_value=str(old_value) if old_value else None,
                    new_value=str(new_value) if new_value else None,
                    description=f'{field_name} changed from {old_value} to {new_value}'
                )
        
        if assignee_id is not None:
            from users.models import User
            if assignee_id:
                try:
                    instance.assignee = User.objects.get(id=assignee_id)
                    TaskActivity.objects.create(
                        task=instance,
                        user=user,
                        action='assigned',
                        new_value=str(instance.assignee.name),
                        description=f'Task assigned to {instance.assignee.name}'
                    )
                except User.DoesNotExist:
                    instance.assignee = None
            else:
                old_assignee = instance.assignee
                instance.assignee = None
                TaskActivity.objects.create(
                    task=instance,
                    user=user,
                    action='unassigned',
                    old_value=str(old_assignee.name) if old_assignee else None,
                    description='Task unassigned'
                )
        
        # Update labels if provided
        if labels_data is not None:
            instance.label_assignments.all().delete()
            from tasks.models import TaskLabel
            labels = TaskLabel.objects.filter(id__in=labels_data, tenant=instance.tenant)
            for label in labels:
                TaskLabelAssignment.objects.create(task=instance, label=label)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class TaskMoveSerializer(serializers.Serializer):
    """Serializer for moving tasks between columns (drag and drop)"""
    column_id = serializers.UUIDField()
    position = serializers.IntegerField(required=False, min_value=0)


class TaskStatusChangeSerializer(serializers.Serializer):
    """Serializer for changing task status"""
    status = serializers.ChoiceField(choices=Task.STATUS_CHOICES)
    completion_notes = serializers.CharField(required=False, allow_blank=True)


# Kanban Board Serializers
class KanbanColumnSerializer(serializers.ModelSerializer):
    """Serializer for kanban column with tasks"""
    tasks = serializers.SerializerMethodField()
    WIP_LIMIT = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = TaskColumn
        fields = ['id', 'name', 'status_key', 'color', 'position', 'WIP_LIMIT', 'tasks']
    
    def get_tasks(self, obj):
        tasks = obj.tasks.filter(is_archived=False).order_by('position')
        return TaskSerializer(tasks, many=True).data


class KanbanBoardSerializer(serializers.ModelSerializer):
    """Full kanban board with columns and tasks"""
    columns = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskBoard
        fields = ['id', 'name', 'description', 'columns']
    
    def get_columns(self, obj):
        columns = obj.columns.all().order_by('position')
        return KanbanColumnSerializer(columns, many=True).data


# Service Request Integration Serializers
class TaskFromServiceRequestSerializer(serializers.ModelSerializer):
    """Create task from existing service request"""
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'priority', 'assignee', 'due_date',
            'estimated_hours', 'service_request'
        ]
