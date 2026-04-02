from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from users.models import User
from users.serializers import UserSerializer, UserPublicSerializer, UserCreateUpdateSerializer
from users.services import UserService
from users.permissions import IsAdmin
from django.core.exceptions import ValidationError

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # Admins can see all users
        return User.objects.all()

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def public(self, request):
        """Public list of users for dropdowns."""
        role = request.query_params.get('role')
        search = request.query_params.get('search')
        users = User.objects.filter(is_active=True, status=True)
        if role:
            users = users.filter(role=role)
        if search:
            users = users.filter(
                Q(name__icontains=search) | Q(email__icontains=search)
            )
        serializer = UserPublicSerializer(users, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = UserCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = UserService.create_user(serializer.validated_data)
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = UserCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        updated_user = UserService.update_user(user, serializer.validated_data)
        return Response(UserSerializer(updated_user).data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        UserService.delete_user(user)
        return Response(status=status.HTTP_204_NO_CONTENT)
