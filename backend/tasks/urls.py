from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .views import (
    TaskBoardViewSet,
    TaskColumnViewSet,
    TaskLabelViewSet,
    TaskViewSet,
    TaskSubtaskViewSet,
    TaskAttachmentViewSet,
    TaskCommentViewSet,
    TaskTimeLogViewSet,
    TaskActivityViewSet,
    TaskWatcherViewSet,
    TaskDependencyViewSet,
)
from .models import TaskBoard, TaskColumn, Task
from .serializers import TaskBoardSerializer, TaskColumnSerializer, TaskSerializer, KanbanBoardSerializer

router = DefaultRouter()
router.register(r'boards', TaskBoardViewSet, basename='task-board')
router.register(r'columns', TaskColumnViewSet, basename='task-column')
router.register(r'labels', TaskLabelViewSet, basename='task-label')
router.register(r'', TaskViewSet, basename='task')
router.register(r'subtasks', TaskSubtaskViewSet, basename='task-subtask')
router.register(r'attachments', TaskAttachmentViewSet, basename='task-attachment')
router.register(r'comments', TaskCommentViewSet, basename='task-comment')
router.register(r'time-logs', TaskTimeLogViewSet, basename='task-time-log')
router.register(r'activities', TaskActivityViewSet, basename='task-activity')
router.register(r'watchers', TaskWatcherViewSet, basename='task-watcher')
router.register(r'dependencies', TaskDependencyViewSet, basename='task-dependency')


class KanbanBoardAPIView(APIView):
    """API view for getting kanban board data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get kanban board data for a specific board or the default board"""
        from .permissions import CanViewTask
        print("\n====== KANBAN REQUEST ======")
        print("TENANT_ID:", request.tenant_id)
        print("BOARD_ID:", request.query_params.get('board_id'))
        print("================================\n")
        if not CanViewTask().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You don't have permission to view tasks"}},
                status=status.HTTP_403_FORBIDDEN
            )
        
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
                print("No active board found for tenant:", tenant_id)
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


urlpatterns = [
    path('kanban/', KanbanBoardAPIView.as_view(), name='task-kanban'),
    path('', include(router.urls)),
]
