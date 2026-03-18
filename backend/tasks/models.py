from django.db import models
from django.conf import settings
from core.models import TenantAwareModel


class TaskBoard(TenantAwareModel):
    """
    Represents a Kanban board for a specific project or workflow.
    Similar to Jira project boards.
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_boards'
    )

    class Meta:
        ordering = ['name']
        unique_together = ['tenant', 'name']

    def __str__(self):
        return self.name


class TaskColumn(TenantAwareModel):
    """
    Represents a column in the Kanban board (e.g., To Do, In Progress, Done).
    Similar to Jira workflow statuses.
    """
    board = models.ForeignKey(
        TaskBoard,
        on_delete=models.CASCADE,
        related_name='columns'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    status_key = models.CharField(max_length=50)  # e.g., 'pending', 'in_progress', 'completed' - unique per board
    color = models.CharField(max_length=20, default='#6B7280')  # Hex color for column
    position = models.PositiveIntegerField(default=0)  # Order of columns
    WIP_LIMIT = models.PositiveIntegerField(null=True, blank=True)  # Work In Progress limit
    is_default = models.BooleanField(default=False)
    allow_task_creation = models.BooleanField(default=True)
    require_completion_notes = models.BooleanField(default=False)

    class Meta:
        ordering = ['position']
        unique_together = ['board', 'name', 'tenant']  # name unique per board

    def __str__(self):
        return f"{self.board.name} - {self.name}"


class TaskLabel(TenantAwareModel):
    """
    Labels for tasks (e.g., Bug, Feature, Enhancement).
    Similar to Jira labels.
    """
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=20, default='#3B82F6')  # Hex color
    description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['name']
        unique_together = ['tenant', 'name']

    def __str__(self):
        return self.name


class Task(TenantAwareModel):
    """
    Main task model - the core of the Kanban board.
    Similar to Jira issues.
    """
    
    # Task Status Choices
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('waiting_client', 'Waiting for Client'),
        ('completed', 'Completed'),
        ('closed', 'Closed'),
    ]

    # Priority Choices
    PRIORITY_CHOICES = [
        ('lowest', 'Lowest'),
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('highest', 'Highest'),
    ]

    # Task Type Choices
    TYPE_CHOICES = [
        ('task', 'Task'),
        ('story', 'Story'),
        ('bug', 'Bug'),
        ('subtask', 'Sub-task'),
        ('epic', 'Epic'),
    ]

    # Link to existing ServiceRequest for backward compatibility
    service_request = models.OneToOneField(
        'services.ServiceRequest',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='task'
    )

    board = models.ForeignKey(
        TaskBoard,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    column = models.ForeignKey(
        TaskColumn,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )

    # Basic Task Info
    task_number = models.CharField(max_length=20, unique=True)  # Auto-generated task ID like 'TASK-001'
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    task_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='task')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')

    # Assignment
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reported_tasks'
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='task_assignments'
    )

    # Dates
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    resolved_date = models.DateTimeField(null=True, blank=True)
    closed_date = models.DateTimeField(null=True, blank=True)
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    actual_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, default=0)

    # Tracking
    position = models.PositiveIntegerField(default=0)  # Position within column for ordering
    is_blocked = models.BooleanField(default=False)
    blocking_reason = models.TextField(blank=True, null=True)
    is_archived = models.BooleanField(default=False)

    # Completion
    completion_notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['board', 'column', 'position']
        indexes = [
            models.Index(fields=['status'], name='idx_task_status'),
            models.Index(fields=['assignee', 'status'], name='idx_task_assignee_status'),
            models.Index(fields=['priority'], name='idx_task_priority'),
            models.Index(fields=['due_date'], name='idx_task_due_date'),
            models.Index(fields=['task_number'], name='idx_task_number'),
        ]

    def __str__(self):
        return f"{self.task_number}: {self.title}"

    def save(self, *args, **kwargs):
        if not self.task_number:
            last_task = Task.objects.filter(tenant=self.tenant).order_by('-id').first()
            if last_task and last_task.task_number:
                try:
                    last_num = int(last_task.task_number.split('-')[1])
                    self.task_number = f"TASK-{str(last_num + 1).zfill(4)}"
                except (ValueError, IndexError):
                    self.task_number = "TASK-0001"
            else:
                self.task_number = "TASK-0001"
        super().save(*args, **kwargs)


class TaskSubtask(TenantAwareModel):
    """
    Subtasks for a parent task.
    Similar to Jira sub-tasks.
    """
    parent_task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='subtasks'
    )
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_subtasks'
    )
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position']
    
    def __str__(self):
        return f"{self.parent_task.task_number} - {self.title}"


class TaskLabelAssignment(TenantAwareModel):
    """
    Many-to-many relationship between tasks and labels.
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='label_assignments'
    )
    label = models.ForeignKey(
        TaskLabel,
        on_delete=models.CASCADE,
        related_name='task_assignments'
    )

    class Meta:
        unique_together = ['task', 'label']

    def __str__(self):
        return f"{self.task.task_number} - {self.label.name}"


class TaskAttachment(TenantAwareModel):
    """
    File attachments for tasks.
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file_name = models.CharField(max_length=500)
    file_path = models.CharField(max_length=1000)
    file_size = models.PositiveIntegerField()  # in bytes
    mime_type = models.CharField(max_length=100)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_attachments'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.task.task_number} - {self.file_name}"


class TaskComment(TenantAwareModel):
    """
    Comments on tasks.
    Similar to Jira comments.
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_comments'
    )
    content = models.TextField()
    is_internal = models.BooleanField(default=False)  # Internal notes not visible to client
    edited_at = models.DateTimeField(null=True, blank=True)
    edited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='edited_comments'
    )

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.task.task_number} - Comment by {self.author}"


class TaskTimeLog(TenantAwareModel):
    """
    Time tracking/logging for tasks.
    Similar to Jira work logs.
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='time_logs'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='time_logs'
    )
    time_spent = models.PositiveIntegerField()  # in minutes
    time_remaining = models.PositiveIntegerField(null=True, blank=True)  # remaining estimate in minutes
    description = models.CharField(max_length=500, blank=True, null=True)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    is_running = models.BooleanField(default=False)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.task.task_number} - {self.time_spent} minutes"


class TaskActivity(TenantAwareModel):
    """
    Activity log for tasks - tracks all changes.
    Similar to Jira issue history.
    """
    ACTION_TYPES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('status_changed', 'Status Changed'),
        ('assigned', 'Assigned'),
        ('unassigned', 'Unassigned'),
        ('priority_changed', 'Priority Changed'),
        ('comment_added', 'Comment Added'),
        ('attachment_added', 'Attachment Added'),
        ('subtask_added', 'Subtask Added'),
        ('subtask_completed', 'Subtask Completed'),
        ('time_logged', 'Time Logged'),
        ('column_changed', 'Column Changed'),
        ('label_added', 'Label Added'),
        ('label_removed', 'Label Removed'),
    ]

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='task_activities'
    )
    action = models.CharField(max_length=30, choices=ACTION_TYPES)
    field_name = models.CharField(max_length=50, null=True, blank=True)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Task Activities'

    def __str__(self):
        return f"{self.task.task_number} - {self.action}"


class TaskWatcher(TenantAwareModel):
    """
    Users watching a task for notifications.
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='watchers'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='watching_tasks'
    )

    class Meta:
        unique_together = ['task', 'user']

    def __str__(self):
        return f"{self.user} watching {self.task.task_number}"


class TaskDependency(TenantAwareModel):
    """
    Task dependencies (blocks/blocked by).
    Similar to Jira issue links.
    """
    DEPENDENCY_TYPES = [
        ('blocks', 'Blocks'),
        ('is_blocked_by', 'Is Blocked By'),
        ('relates_to', 'Relates To'),
        ('duplicates', 'Duplicates'),
        ('is_duplicated_by', 'Is Duplicated By'),
    ]

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='dependencies'
    )
    depends_on = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='dependents'
    )
    dependency_type = models.CharField(max_length=30, choices=DEPENDENCY_TYPES)

    class Meta:
        unique_together = ['task', 'depends_on', 'dependency_type']

    def __str__(self):
        return f"{self.task.task_number} {self.dependency_type} {self.depends_on.task_number}"
