from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from clients.models import Client
from clients.serializers import ClientSerializer, ClientListSerializer, ClientCreateUpdateSerializer
from clients.services import ClientService
from clients.permissions import CanCreateClient, CanUpdateClient, CanDeleteClient
from roles.permissions import IsTenantUser
from django.core.exceptions import ValidationError


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]

    def get_queryset(self):
        filters = {
            'company': self.request.query_params.get('company'),
            'industry': self.request.query_params.get('industry'),
            'date_from': self.request.query_params.get('date_from'),
            'date_to': self.request.query_params.get('date_to'),
            'search': self.request.query_params.get('search'),
        }
        # Remove None values
        filters = {k: v for k, v in filters.items() if v}
        return ClientService.list_clients(self.request.tenant_id, filters or None)

    def get_serializer_class(self):
        if self.action == 'list':
            return ClientListSerializer
        return ClientSerializer

    def create(self, request, *args, **kwargs):
        if not CanCreateClient().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to create clients"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ClientCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            client = ClientService.create_client(
                tenant_id=request.tenant_id,
                data=serializer.validated_data,
                user=request.user,
            )
            return Response(
                {"success": True, "data": ClientSerializer(client).data, "message": "Client created successfully"},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def update(self, request, *args, **kwargs):
        if not CanUpdateClient().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to update clients"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        client = self.get_object()
        serializer = ClientCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated_client = ClientService.update_client(client, serializer.validated_data, user=request.user)
        return Response(
            {"success": True, "data": ClientSerializer(updated_client).data, "message": "Client updated successfully"},
        )

    def destroy(self, request, *args, **kwargs):
        if not CanDeleteClient().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to delete clients"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        client = self.get_object()
        ClientService.delete_client(client, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
