import json

from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from bookings.models import Booking, Bank
from bookings.serializers import (
    BankSerializer,
    BookingCreateUpdateSerializer,
    BookingListSerializer,
    BookingSerializer,
)
from bookings.services import BookingService
from clients.serializers import ClientCreateUpdateSerializer, ClientSerializer
from clients.services import ClientService
from services.serializers import ServiceRequestCreateUpdateSerializer, ServiceRequestSerializer
from services.services import ServiceRequestService


class BankViewSet(viewsets.ModelViewSet):
    """ViewSet for Bank accounts."""
    serializer_class = BankSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Anyone can list banks (needed for public booking form dropdowns)
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Bank.objects.filter(is_active=True).order_by('bank_name', 'account_number')


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        filters = {
            'client_id': self.request.query_params.get('client_id'),
            'status': self.request.query_params.get('status'),
            'date_from': self.request.query_params.get('date_from'),
            'date_to': self.request.query_params.get('date_to'),
        }
        filters = {k: v for k, v in filters.items() if v}
        return BookingService.list_bookings(filters=filters or None)

    def get_serializer_class(self):
        if self.action == 'list':
            return BookingListSerializer
        return BookingSerializer

    def _parse_nested_payload(self, payload_name, default=None):
        raw_value = self.request.data.get(payload_name)
        if raw_value in [None, '']:
            return {} if default is None else default
        if isinstance(raw_value, dict):
            return raw_value
        try:
            return json.loads(raw_value)
        except (TypeError, json.JSONDecodeError):
            raise ValidationError({payload_name: f"Invalid JSON for '{payload_name}'."})

    def _validate_full_form_payload(self, partial=False):
        client_payload = self._parse_nested_payload('client')
        booking_payload = self._parse_nested_payload('booking')
        service_payload = self._parse_nested_payload('service_request', default={})

        attachment = self.request.FILES.get('attachment')
        if attachment is not None:
            booking_payload['attachment'] = attachment

        client_serializer = None
        if client_payload:
            client_serializer = ClientCreateUpdateSerializer(data=client_payload, partial=partial)
            client_serializer.is_valid(raise_exception=True)

        booking_serializer = BookingCreateUpdateSerializer(data=booking_payload, partial=partial)
        booking_serializer.is_valid(raise_exception=True)

        service_serializer = None
        if service_payload.get('service'):
            normalized = {
                'service': service_payload.get('service'),
                'priority': service_payload.get('priority', 'medium'),
            }
            service_serializer = ServiceRequestCreateUpdateSerializer(data=normalized, partial=True)
            service_serializer.is_valid(raise_exception=True)

        return client_serializer, booking_serializer, service_serializer

    def create(self, request, *args, **kwargs):
        serializer = BookingCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if 'client_id' not in serializer.validated_data:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": "client_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            booking = BookingService.create_booking(data=serializer.validated_data, user=request.user)
            return Response(
                {"success": True, "data": BookingSerializer(booking, context={'request': request}).data},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def update(self, request, *args, **kwargs):
        booking = self.get_object()
        serializer = BookingCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            updated = BookingService.update_booking(booking, serializer.validated_data, user=request.user)
            return Response({"success": True, "data": BookingSerializer(updated, context={'request': request}).data})
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        BookingService.delete_booking(booking, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='bde-form')
    def bde_form_create(self, request):
        """Authenticated full-form booking creation (admin creating on behalf of BDE)."""
        try:
            client_serializer, booking_serializer, service_serializer = self._validate_full_form_payload()
            if not client_serializer:
                return Response(
                    {"success": False, "error": {"code": "INVALID_INPUT", "message": "Client information is required."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            result = ClientService.create_client_with_booking_and_request(
                client_data=dict(client_serializer.validated_data),
                booking_data=dict(booking_serializer.validated_data),
                request_data=dict(service_serializer.validated_data) if service_serializer else {},
                user=request.user,
            )
            return Response(
                {
                    "success": True,
                    "data": {
                        "client": ClientSerializer(result['client']).data,
                        "booking": BookingSerializer(result['booking'], context={'request': request}).data,
                        "service_request": ServiceRequestSerializer(result['service_request']).data if result['service_request'] else None,
                    },
                    "message": "Booking submitted successfully",
                },
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=['post'], url_path='public-form', permission_classes=[AllowAny])
    def public_form_create(self, request):
        """Public booking form — no authentication required."""
        try:
            client_serializer, booking_serializer, service_serializer = self._validate_full_form_payload()
            if not client_serializer:
                return Response(
                    {"success": False, "error": {"code": "INVALID_INPUT", "message": "Client information is required."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            result = ClientService.create_client_with_booking_and_request(
                client_data=dict(client_serializer.validated_data),
                booking_data=dict(booking_serializer.validated_data),
                request_data=dict(service_serializer.validated_data) if service_serializer else {},
                user=None,
            )
            return Response(
                {
                    "success": True,
                    "data": {
                        "client": ClientSerializer(result['client']).data,
                        "booking": BookingSerializer(result['booking'], context={'request': request}).data,
                        "service_request": ServiceRequestSerializer(result['service_request']).data if result['service_request'] else None,
                    },
                    "message": "Booking submitted successfully",
                },
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['put', 'patch'], url_path='bde-form')
    def bde_form_update(self, request, pk=None):
        """Full-form booking update (admin edits client + booking in one request)."""
        booking = self.get_object()
        try:
            client_serializer, booking_serializer, service_serializer = self._validate_full_form_payload(partial=True)

            with transaction.atomic():
                if client_serializer:
                    ClientService.update_client(booking.client, client_serializer.validated_data, user=request.user)

                updated_booking = BookingService.update_booking(
                    booking, booking_serializer.validated_data, user=request.user
                )

                existing_request = updated_booking.service_requests.order_by('created_at').first()
                updated_service_request = existing_request
                if service_serializer:
                    request_data = dict(service_serializer.validated_data)
                    request_data['booking'] = updated_booking
                    if existing_request:
                        updated_service_request = ServiceRequestService.update_request(
                            existing_request,
                            {'service': request_data['service'], 'priority': request_data.get('priority', existing_request.priority), 'booking': updated_booking},
                            user=request.user,
                        )
                    else:
                        updated_service_request = ServiceRequestService.create_request(
                            data=request_data, user=request.user
                        )

            return Response({
                "success": True,
                "data": {
                    "client": ClientSerializer(updated_booking.client).data,
                    "booking": BookingSerializer(updated_booking, context={'request': request}).data,
                    "service_request": ServiceRequestSerializer(updated_service_request).data if updated_service_request else None,
                },
                "message": "Booking updated successfully",
            })
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )
