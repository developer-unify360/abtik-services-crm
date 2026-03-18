from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from .models import ServiceCategory, Service, ServiceRequest
from .serializers import (
    ServiceCategorySerializer, ServiceSerializer, ServiceRequestSerializer,
    ServiceRequestCreateUpdateSerializer, ServiceRequestAssignSerializer,
    ServiceRequestStatusUpdateSerializer
)
from .services import ServiceManagementService, ServiceRequestService
from .permissions import CanManageServices, CanAssignTasks, CanUpdateTaskStatus
from roles.permissions import IsTenantUser
from django.core.exceptions import ValidationError


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsAuthenticated, IsTenantUser]

    def get_queryset(self):
        return ServiceManagementService.get_categories(self.request.tenant_id)

    def create(self, request, *args, **kwargs):
        if not CanManageServices().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to manage service categories"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = ServiceManagementService.create_category(
            tenant_id=request.tenant_id,
            data=serializer.validated_data,
            user=request.user,
        )
        return Response(
            {"success": True, "data": ServiceCategorySerializer(category).data, "message": "Category created successfully"},
            status=status.HTTP_201_CREATED,
        )


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]

    def get_queryset(self):
        category_id = self.request.query_params.get('category_id')
        return ServiceManagementService.get_services(self.request.tenant_id, category_id)

    def create(self, request, *args, **kwargs):
        if not CanManageServices().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to manage services"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = ServiceManagementService.create_service(
            tenant_id=request.tenant_id,
            data=serializer.validated_data,
            user=request.user,
        )
        return Response(
            {"success": True, "data": ServiceSerializer(service).data, "message": "Service created successfully"},
            status=status.HTTP_201_CREATED,
        )


class ServiceRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsTenantUser]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ServiceRequestCreateUpdateSerializer
        if self.action == 'assign':
            return ServiceRequestAssignSerializer
        if self.action == 'status':
            return ServiceRequestStatusUpdateSerializer
        return ServiceRequestSerializer

    def get_queryset(self):
        filters = {
            'status': self.request.query_params.get('status'),
            'assigned_to': self.request.query_params.get('assigned_to'),
            'priority': self.request.query_params.get('priority'),
            'booking_id': self.request.query_params.get('booking_id')
        }
        filters = {k: v for k, v in filters.items() if v}
        return ServiceRequestService.list_requests(self.request.tenant_id, filters or None)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service_request = ServiceRequestService.create_request(
            tenant_id=request.tenant_id,
            data=serializer.validated_data,
            user=request.user,
        )
        return Response(
            {"success": True, "data": ServiceRequestSerializer(service_request).data, "message": "Service Request created successfully"},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['put'])
    def assign(self, request, pk=None):
        if not CanAssignTasks().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to assign tasks"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        service_request = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assigned_to_user = serializer.validated_data.get('assigned_to')
        updated_request = ServiceRequestService.assign_task(
            service_request=service_request,
            assigned_to_user=assigned_to_user,
            user=request.user
        )
        return Response(
            {"success": True, "data": ServiceRequestSerializer(updated_request).data, "message": "Task assigned successfully"}
        )

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        service_request = self.get_object()
        
        if not CanUpdateTaskStatus().has_object_permission(request, self, service_request):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to update this task's status"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        updated_request = ServiceRequestService.update_status(
            service_request=service_request,
            new_status=new_status,
            user=request.user
        )
        return Response(
            {"success": True, "data": ServiceRequestSerializer(updated_request).data, "message": "Status updated successfully"}
        )
