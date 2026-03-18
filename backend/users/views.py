from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from users.models import User
from users.serializers import UserSerializer, UserCreateUpdateSerializer
from users.services import UserService
from roles.permissions import IsTenantUser, HasModulePermission
from django.core.exceptions import ValidationError

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsTenantUser, HasModulePermission]
    required_permission = 'users.view' # Base permission for the viewset

    def get_queryset(self):
        # Super Admin can see all users across all tenants
        if self.request.user.role and self.request.user.role.name == 'Super Admin':
            return User.objects.all()
        # Tenant isolation for regular users
        return User.objects.filter(tenant_id=self.request.tenant_id, status=True)

    def create(self, request, *args, **kwargs):
        self.required_permission = 'users.create'
        if not HasModulePermission().has_permission(request, self):
             return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
             
        serializer = UserCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = UserService.create_user(request.tenant_id, serializer.validated_data)
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        self.required_permission = 'users.update'
        if not HasModulePermission().has_permission(request, self):
             return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
             
        user = self.get_object()
        serializer = UserCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        updated_user = UserService.update_user(user, serializer.validated_data)
        return Response(UserSerializer(updated_user).data)

    def destroy(self, request, *args, **kwargs):
        self.required_permission = 'users.delete'
        if not HasModulePermission().has_permission(request, self):
             return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
             
        user = self.get_object()
        UserService.delete_user(user)
        return Response(status=status.HTTP_204_NO_CONTENT)
