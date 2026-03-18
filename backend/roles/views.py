from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from roles.models import Role


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for listing roles.
    Used by the frontend to populate role selection when creating/editing users.
    Super Admin bypasses all permission checks.
    """
    serializer_class = None  # We'll use a simple serializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Role.objects.all()
    
    def list(self, request, *args, **kwargs):
        roles = self.get_queryset()
        data = [{'id': str(r.id), 'name': r.name, 'description': r.description} for r in roles]
        return Response(data)
    
    def retrieve(self, request, pk=None):
        try:
            role = self.get_queryset().get(id=pk)
            return Response({'id': str(role.id), 'name': role.name, 'description': role.description})
        except Role.DoesNotExist:
            return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)
