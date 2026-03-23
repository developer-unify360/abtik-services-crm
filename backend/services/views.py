from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from django.db import models
from django.db.models import ProtectedError
from .models import Service, ServiceRequest
from .serializers import (
    ServiceSerializer, ServiceRequestSerializer,
    ServiceRequestCreateUpdateSerializer, ServiceRequestAssignSerializer,
    ServiceRequestStatusUpdateSerializer
)
from .services import ServiceManagementService, ServiceRequestService
from .permissions import CanManageServices, CanAssignTasks, CanUpdateTaskStatus
from django.core.exceptions import ValidationError


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [CanManageServices()]

    def get_queryset(self):
        return ServiceManagementService.get_services()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "Services retrieved successfully"
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = ServiceManagementService.create_service(
            data=serializer.validated_data,
            user=request.user,
        )
        return Response(
            {"success": True, "data": ServiceSerializer(service).data, "message": "Service created successfully"},
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        service = self.get_object()
        try:
            service.delete()
        except ProtectedError:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "SERVICE_IN_USE",
                        "message": "This service is already linked to service requests.",
                    },
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class ServiceRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

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

        queryset = ServiceRequestService.list_requests(filters or None)

        if not (self.request.user.is_staff or self.request.user.is_superuser):
            queryset = queryset.filter(assigned_to=self.request.user)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "Service requests retrieved successfully"
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service_request = ServiceRequestService.create_request(
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
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        service_request = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_request = ServiceRequestService.assign_task(
            service_request=service_request,
            assigned_to_user=serializer.validated_data.get('assigned_to'),
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
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_request = ServiceRequestService.update_status(
                service_request=service_request,
                new_status=serializer.validated_data.get('status'),
                user=request.user
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_TRANSITION", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"success": True, "data": ServiceRequestSerializer(updated_request).data, "message": "Status updated successfully"}
        )
