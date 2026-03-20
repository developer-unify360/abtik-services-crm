from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from clients.models import Client
from clients.serializers import ClientSerializer, ClientListSerializer, ClientCreateUpdateSerializer
from bookings.serializers import BookingSerializer, BookingCreateUpdateSerializer
from services.serializers import ServiceRequestSerializer, ServiceRequestCreateUpdateSerializer
from services.services import ServiceRequestService
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
        return ClientService.list_clients(self.request.tenant_id, user=self.request.user, filters=filters or None)

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

    @action(detail=False, methods=['post'], url_path='bde-create-full')
    def create_client_booking_request(self, request):
        """BDE-only helper: create client, booking, and service request in one request."""
        if not request.user.role or request.user.role.name != 'BDE':
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only BDE users can access this endpoint."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        client_data = request.data.get('client', {})
        booking_data = request.data.get('booking', {})
        service_data = request.data.get('service_request', {})

        client_serializer = ClientCreateUpdateSerializer(data=client_data)
        client_serializer.is_valid(raise_exception=True)

        booking_serializer = BookingCreateUpdateSerializer(data=booking_data)
        booking_serializer.is_valid(raise_exception=True)

        request_payload = {}
        if service_data:
            request_payload = {
                'service': service_data.get('service'),
                'priority': service_data.get('priority', 'medium'),
            }
            service_serializer = ServiceRequestCreateUpdateSerializer(data=request_payload)
            service_serializer.is_valid(raise_exception=True)
            request_payload = service_serializer.validated_data

        try:
            result = ClientService.create_client_with_booking_and_request(
                tenant_id=1,
                client_data=client_serializer.validated_data,
                booking_data=booking_serializer.validated_data,
                request_data=request_payload,
                user=request.user,
            )

            return Response(
                {
                    "success": True,
                    "data": {
                        "client": ClientSerializer(result['client']).data,
                        "booking": BookingSerializer(result['booking']).data,
                        "service_request": ServiceRequestSerializer(result['service_request']).data if result['service_request'] else None,
                    },
                    "message": "Client, booking and service request created successfully",
                },
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
