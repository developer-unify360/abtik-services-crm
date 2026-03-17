from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from tenants.models import Tenant
from tenants.serializers import TenantSerializer, TenantCreateSerializer
from tenants.services import TenantService
from roles.permissions import HasModulePermission


class TenantViewSet(viewsets.ModelViewSet):
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    required_permission = 'tenants.view'

    def get_queryset(self):
        return TenantService.list_tenants()

    def create(self, request, *args, **kwargs):
        self.required_permission = 'tenants.create'
        if not HasModulePermission().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to create tenants"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TenantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = TenantService.create_tenant(serializer.validated_data, user=request.user)
        return Response(
            {"success": True, "data": TenantSerializer(tenant).data, "message": "Tenant created successfully"},
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        self.required_permission = 'tenants.update'
        if not HasModulePermission().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to update tenants"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        tenant = self.get_object()
        TenantService.update_tenant(tenant, request.data, user=request.user)
        return Response(
            {"success": True, "data": TenantSerializer(tenant).data, "message": "Tenant updated successfully"},
        )

    def destroy(self, request, *args, **kwargs):
        self.required_permission = 'tenants.delete'
        if not HasModulePermission().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to delete tenants"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        tenant = self.get_object()
        TenantService.delete_tenant(tenant, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
