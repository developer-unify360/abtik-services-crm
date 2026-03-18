from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.db.models import Max
from django.utils import timezone

from .models import (
    TaskBoard, TaskColumn, TaskLabel, Task, TaskSubtask,
    TaskLabelAssignment, TaskAttachment, TaskComment, TaskTimeLog,
    TaskActivity, TaskWatcher, TaskDependency
)
from .serializers import (
    TaskBoardSerializer, TaskColumnSerializer, TaskLabelSerializer,
    TaskSerializer, TaskCreateSerializer, TaskUpdateSerializer,
    TaskMoveSerializer, TaskStatusChangeSerializer,
    KanbanBoardSerializer, KanbanColumnSerializer,
    TaskSubtaskSerializer, TaskAttachmentSerializer, TaskCommentSerializer,
    TaskTimeLogSerializer, TaskActivitySerializer, TaskWatcherSerializer,
    TaskDependencySerializer
)
from .permissions import (
    CanManageBoards, CanCreateTask, CanEditTask, CanDeleteTask,
    CanAssignTask, CanUpdateTaskStatus, CanManageLabels,
    CanViewTask, CanLogTime, CanAddComment, CanDeleteComment
)
from roles.permissions import IsTenantUser


class TaskBoardViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Task Boards (Kanban boards)
    """
    serializer_class = TaskBoardSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_queryset(self):
        return TaskBoard.objects.filter(
            tenant=self.request.tenant_id,
            is_active=True
        )
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "Boards retrieved successfully"
        })
    
    def perform_create(self, serializer):
        serializer.save(
            tenant_id=self.request.tenant_id,
            created_by=self.request.user
        )

    def create(self, request, *args, **kwargs):
        print("\n====== CREATE BOARD REQUEST ======")
        print("USER:", request.user)
        print("TENANT_ID:", getattr(request, "tenant_id", None))
        print("DATA:", request.data)
        print("==================================\n")

        if not CanManageBoards().has_permission(request, self):
            print("❌ PERMISSION DENIED")
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to create boards"}},
                status=status.HTTP_403_FORBIDDEN
            )

        tenant_id = request.tenant_id or getattr(getattr(request, 'user', None), 'tenant_id', None)

        if not tenant_id:
            print("❌ MISSING TENANT")
            return Response(
                {"success": False, "error": {"code": "MISSING_TENANT", "message": "Tenant context is not available"}},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            print("❌ SERIALIZER ERRORS:", serializer.errors)
            return Response(
                {"success": False, "error": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        print("✅ SERIALIZER VALID")

        serializer.save(
            tenant_id=tenant_id,
            created_by=request.user
        )

        print("✅ BOARD CREATED")

        return Response(
            {"success": True, "data": serializer.data, "message": "Board created successfully"},
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'], url_path='kanban')
    def kanban(self, request):
        """
        Get kanban board data for a specific board or the default board
        """
        board_id = request.query_params.get('board_id')
        tenant_id = request.tenant_id
        
        try:
            if board_id:
                board = TaskBoard.objects.get(id=board_id, tenant=tenant_id, is_active=True)
            else:
                # Get default board or first active board
                board = TaskBoard.objects.filter(tenant=tenant_id, is_active=True, is_default=True).first()
                if not board:
                    board = TaskBoard.objects.filter(tenant=tenant_id, is_active=True).first()
            
            if not board:
                return Response(
                    {"success": False, "error": {"code": "NOT_FOUND", "message": "No board found"}},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = KanbanBoardSerializer(board)
            return Response({
                "success": True,
                "data": serializer.data,
                "message": "Kanban board retrieved successfully"
            }, status=status.HTTP_200_OK)
        except TaskBoard.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Board not found"}},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"success": False, "error": {"code": "INTERNAL_ERROR", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TaskColumnViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Task Columns (Kanban columns)
    """
    serializer_class = TaskColumnSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_queryset(self):
        board_id = self.request.query_params.get('board_id')
        queryset = TaskColumn.objects.filter(
            board__tenant=self.request.tenant_id
        )
        if board_id:
            queryset = queryset.filter(board_id=board_id)
        return queryset.order_by('position')
    
    def create(self, request, *args, **kwargs):
        if not CanManageBoards().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to create columns"}},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(tenant=request.tenant_id)
        return Response(
            {"success": True, "data": serializer.data, "message": "Column created successfully"},
            status=status.HTTP_201_CREATED
        )


class TaskLabelViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Task Labels
    """
    serializer_class = TaskLabelSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_queryset(self):
        return TaskLabel.objects.filter(tenant=self.request.tenant_id)
    
    def create(self, request, *args, **kwargs):
        if not CanManageLabels().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to create labels"}},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(tenant=request.tenant_id)
        return Response(
            {"success": True, "data": serializer.data, "message": "Label created successfully"},
            status=status.HTTP_201_CREATED
        )


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Tasks (Kanban cards)
    """
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TaskCreateSerializer
        if self.action in ['update', 'partial_update']:
            return TaskUpdateSerializer
        return TaskSerializer
    
    def get_queryset(self):
        # Filter parameters
        filters = {
            'status': self.request.query_params.get('status'),
            'priority': self.request.query_params.get('priority'),
            'assignee': self.request.query_params.get('assignee'),
            'board': self.request.query_params.get('board_id'),
            'column': self.request.query_params.get('column_id'),
            'task_type': self.request.query_params.get('task_type'),
            'is_archived': self.request.query_params.get('is_archived'),
        }
        filters = {k: v for k, v in filters.items() if v}
        
        queryset = Task.objects.filter(tenant=self.request.tenant_id)
        
        # Apply filters
        if filters:
            queryset = queryset.filter(**filters)
        
        # IT Staff can only see their assigned tasks unless they have higher role
        if self.request.user.role and self.request.user.role.name == 'IT Staff':
            queryset = queryset.filter(assignee=self.request.user)
        
        return queryset.select_related(
            'board', 'column', 'assignee', 'reporter'
        ).prefetch_related(
            'label_assignments__label', 'subtasks', 'comments', 'attachments'
        )
    
    def create(self, request, *args, **kwargs):
        if not CanCreateTask().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to create tasks"}},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        task = serializer.save(tenant=request.tenant_id, reporter=request.user)
        
        # Set default column if not provided
        if not task.column and task.board:
            default_column = TaskColumn.objects.filter(
                board=task.board,
                is_default=True
            ).first()
            if default_column:
                task.column = default_column
                task.save()
        
        return Response(
            {"success": True, "data": TaskSerializer(task).data, "message": "Task created successfully"},
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not CanEditTask().has_object_permission(request, self, instance):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to edit this task"}},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance, data=request.data, context={'request': request}, partial=True)
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        
        return Response(
            {"success": True, "data": TaskSerializer(task).data, "message": "Task updated successfully"}
        )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not CanDeleteTask().has_object_permission(request, self, instance):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to delete this task"}},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance.delete()
        return Response(
            {"success": True, "message": "Task deleted successfully"},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """
        Move task to a different column (for drag and drop)
        """
        task = self.get_object()
        if not CanEditTask().has_object_permission(request, self, task):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to move this task"}},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = TaskMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        column_id = serializer.validated_data.get('column_id')
        position = serializer.validated_data.get('position', 0)
        
        try:
            new_column = TaskColumn.objects.get(id=column_id, board__tenant=request.tenant_id)
        except TaskColumn.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Column not found"}},
                status=status.HTTP_404_NOT_FOUND
            )
        
        old_column = task.column
        
        # Update position for tasks in the same column
        Task.objects.filter(
            column=new_column,
            tenant=request.tenant_id
        ).exclude(id=task.id).filter(position__gte=position).update(
            position=models.F('position') + 1
        )
        
        task.column = new_column
        task.position = position
        task.save()
        
        # Log activity
        TaskActivity.objects.create(
            task=task,
            user=request.user,
            action='column_changed',
            old_value=str(old_column.name) if old_column else None,
            new_value=str(new_column.name),
            description=f'Task moved from {old_column.name if old_column else "None"} to {new_column.name}'
        )
        
        return Response(
            {"success": True, "data": TaskSerializer(task).data, "message": "Task moved successfully"}
        )
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """
        Assign task to a user
        """
        task = self.get_object()
        if not CanAssignTask().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to assign tasks"}},
                status=status.HTTP_403_FORBIDDEN
            )
        
        assignee_id = request.data.get('assignee_id')
        from users.models import User
        
        if assignee_id:
            try:
                assignee = User.objects.get(id=assignee_id)
            except User.DoesNotExist:
                return Response(
                    {"success": False, "error": {"code": "NOT_FOUND", "message": "User not found"}},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            assignee = None
        
        old_assignee = task.assignee
        task.assignee = assignee
        task.save()
        
        # Update status to assigned if it was pending
        if task.status == 'pending' and assignee:
            task.status = 'assigned'
            task.save()
        
        # Log activity
        TaskActivity.objects.create(
            task=task,
            user=request.user,
            action='assigned' if assignee else 'unassigned',
            old_value=str(old_assignee.name) if old_assignee else None,
            new_value=str(assignee.name) if assignee else None,
            description=f'Task assigned to {assignee.name if assignee else "Unassigned"}'
        )
        
        return Response(
            {"success": True, "data": TaskSerializer(task).data, "message": "Task assigned successfully"}
        )
    
    @action(detail=True, methods=['post'])
    def status(self, request, pk=None):
        """
        Update task status
        """
        task = self.get_object()
        if not CanUpdateTaskStatus().has_object_permission(request, self, task):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to update task status"}},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = TaskStatusChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_status = task.status
        new_status = serializer.validated_data.get('status')
        completion_notes = serializer.validated_data.get('completion_notes', '')
        
        task.status = new_status
        
        # Set completion dates
        if new_status == 'completed':
            task.completed_at = timezone.now()
            task.completed_by = request.user
            task.completion_notes = completion_notes
            task.resolved_date = timezone.now()
        elif new_status == 'closed':
            task.closed_date = timezone.now()
        
        task.save()
        
        # Log activity
        TaskActivity.objects.create(
            task=task,
            user=request.user,
            action='status_changed',
            old_value=task.get_status_display(old_status),
            new_value=task.get_status_display(new_status),
            description=f'Status changed from {task.get_status_display(old_status)} to {task.get_status_display(new_status)}'
        )
        
        return Response(
            {"success": True, "data": TaskSerializer(task).data, "message": "Status updated successfully"}
        )
    
    @action(detail=False, methods=['get'])
    def kanban(self, request):
        """
        Get Kanban board data
        """
        board_id = request.query_params.get('board_id')
        
        if not board_id:
            # Get default board
            board = TaskBoard.objects.filter(
                tenant=request.tenant_id,
                is_default=True,
                is_active=True
            ).first()
            
            if not board:
                board = TaskBoard.objects.filter(
                    tenant=request.tenant_id,
                    is_active=True
                ).first()
        else:
            board = TaskBoard.objects.filter(
                id=board_id,
                tenant=request.tenant_id
            ).first()
        
        if not board:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Board not found"}},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = KanbanBoardSerializer(board)
        return Response(
            {"success": True, "data": serializer.data}
        )
    
    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """
        Get tasks assigned to current user
        """
        tasks = Task.objects.filter(
            tenant=request.tenant_id,
            assignee=request.user,
            is_archived=False
        ).select_related('board', 'column')
        
        return Response(
            {"success": True, "data": TaskSerializer(tasks, many=True).data}
        )
    
    @action(detail=False, methods=['get'])
    def backlog(self, request):
        """
        Get backlog tasks (not in any column)
        """
        tasks = Task.objects.filter(
            tenant=request.tenant_id,
            column__isnull=True,
            is_archived=False
        ).select_related('board', 'assignee')
        
        return Response(
            {"success": True, "data": TaskSerializer(tasks, many=True).data}
        )


class TaskSubtaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Task Subtasks
    """
    serializer_class = TaskSubtaskSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_queryset(self):
        task_id = self.request.query_params.get('task_id')
        queryset = TaskSubtask.objects.filter(
            parent_task__tenant=self.request.tenant_id
        )
        if task_id:
            queryset = queryset.filter(parent_task_id=task_id)
        return queryset
    
    def perform_create(self, serializer):
        task_id = self.request.data.get('parent_task')
        from tasks.models import Task
        task = Task.objects.get(id=task_id)
        subtask = serializer.save()
        
        TaskActivity.objects.create(
            task=task,
            user=self.request.user,
            action='subtask_added',
            description=f'Subtask added: {subtask.title}'
        )
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark subtask as complete
        """
        subtask = self.get_object()
        subtask.is_completed = True
        subtask.completed_at = timezone.now()
        subtask.completed_by = request.user
        subtask.save()
        
        TaskActivity.objects.create(
            task=subtask.parent_task,
            user=request.user,
            action='subtask_completed',
            description=f'Subtask completed: {subtask.title}'
        )
        
        return Response(
            {"success": True, "data": TaskSubtaskSerializer(subtask).data}
        )


class TaskAttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Task Attachments
    """
    serializer_class = TaskAttachmentSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_queryset(self):
        task_id = self.request.query_params.get('task_id')
        queryset = TaskAttachment.objects.filter(
            task__tenant=self.request.tenant_id
        )
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset
    
    def perform_create(self, serializer):
        attachment = serializer.save(uploaded_by=self.request.user)
        
        TaskActivity.objects.create(
            task=attachment.task,
            user=self.request.user,
            action='attachment_added',
            description=f'Attachment added: {attachment.file_name}'
        )


class TaskCommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Task Comments
    """
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_queryset(self):
        task_id = self.request.query_params.get('task_id')
        queryset = TaskComment.objects.filter(
            task__tenant=self.request.tenant_id
        )
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(author=request.user)
        
        TaskActivity.objects.create(
            task=comment.task,
            user=request.user,
            action='comment_added',
            description=f'Comment added'
        )
        
        return Response(
            {"success": True, "data": serializer.data, "message": "Comment added successfully"},
            status=status.HTTP_201_CREATED
        )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not CanDeleteComment().has_object_permission(request, self, instance):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to delete this comment"}},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.delete()
        return Response(
            {"success": True, "message": "Comment deleted successfully"},
            status=status.HTTP_200_OK
        )


class TaskTimeLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Task Time Logs
    """
    serializer_class = TaskTimeLogSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_queryset(self):
        task_id = self.request.query_params.get('task_id')
        queryset = TaskTimeLog.objects.filter(
            task__tenant=self.request.tenant_id
        )
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        timelog = serializer.save(user=request.user)
        
        # Update task actual hours
        task = timelog.task
        total_minutes = sum(
            log.time_spent for log in task.time_logs.all()
        )
        task.actual_hours = total_minutes / 60
        task.save()
        
        TaskActivity.objects.create(
            task=task,
            user=request.user,
            action='time_logged',
            description=f'Time logged: {timelog.time_spent} minutes'
        )
        
        return Response(
            {"success": True, "data": serializer.data, "message": "Time logged successfully"},
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def start_timer(self, request, pk=None):
        """
        Start a timer for the task
        """
        timelog = self.get_object()
        
        if timelog.is_running:
            return Response(
                {"success": False, "error": {"code": "ALREADY_RUNNING", "message": "Timer already running"}},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        timelog.is_running = True
        timelog.started_at = timezone.now()
        timelog.save()
        
        return Response(
            {"success": True, "data": TaskTimeLogSerializer(timelog).data}
        )
    
    @action(detail=True, methods=['post'])
    def stop_timer(self, request, pk=None):
        """
        Stop a timer for the task
        """
        timelog = self.get_object()
        
        if not timelog.is_running:
            return Response(
                {"success": False, "error": {"code": "NOT_RUNNING", "message": "Timer not running"}},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        timelog.ended_at = timezone.now()
        timelog.is_running = False
        
        # Calculate time spent
        duration = timelog.ended_at - timelog.started_at
        timelog.time_spent = int(duration.total_seconds() / 60)
        timelog.save()
        
        # Update task actual hours
        task = timelog.task
        total_minutes = sum(
            log.time_spent for log in task.time_logs.all()
        )
        task.actual_hours = total_minutes / 60
        task.save()
        
        return Response(
            {"success": True, "data": TaskTimeLogSerializer(timelog).data}
        )


class TaskActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing Task Activities (read-only)
    """
    serializer_class = TaskActivitySerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_queryset(self):
        task_id = self.request.query_params.get('task_id')
        queryset = TaskActivity.objects.filter(
            task__tenant=self.request.tenant_id
        )
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset.order_by('-created_at')[:100]


class TaskWatcherViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Task Watchers
    """
    serializer_class = TaskWatcherSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_queryset(self):
        task_id = self.request.query_params.get('task_id')
        queryset = TaskWatcher.objects.filter(
            task__tenant=self.request.tenant_id
        )
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        task_id = request.data.get('task')
        from tasks.models import Task
        task = Task.objects.get(id=task_id)
        
        # Add current user as watcher if not already watching
        watcher, created = TaskWatcher.objects.get_or_create(
            task=task,
            user=request.user
        )
        
        if created:
            return Response(
                {"success": True, "message": "Now watching this task"},
                status=status.HTTP_201_CREATED
            )
        
        return Response(
            {"success": True, "message": "Already watching this task"}
        )
    
    @action(detail=False, methods=['post'])
    def watch(self, request):
        """
        Watch a task (shorthand)
        """
        task_id = request.data.get('task_id')
        from tasks.models import Task
        task = Task.objects.get(id=task_id)
        
        watcher, created = TaskWatcher.objects.get_or_create(
            task=task,
            user=request.user
        )
        
        return Response(
            {"success": True, "message": "Task watch status updated"}
        )
    
    @action(detail=False, methods=['post'])
    def unwatch(self, request):
        """
        Unwatch a task
        """
        task_id = request.data.get('task_id')
        from tasks.models import Task
        task = Task.objects.get(id=task_id)
        
        deleted, _ = TaskWatcher.objects.filter(
            task=task,
            user=request.user
        ).delete()
        
        return Response(
            {"success": True, "message": "Unwatched task" if deleted else "Not watching this task"}
        )


class TaskDependencyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Task Dependencies
    """
    serializer_class = TaskDependencySerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    
    def get_queryset(self):
        task_id = self.request.query_params.get('task_id')
        queryset = TaskDependency.objects.filter(
            task__tenant=self.request.tenant_id
        )
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset
