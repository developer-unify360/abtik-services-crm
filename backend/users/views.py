from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from users.models import User
from users.serializers import UserSerializer, UserCreateUpdateSerializer
from users.services import UserService
from django.core.exceptions import ValidationError

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        # Admins can see all users
        return User.objects.all()

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
