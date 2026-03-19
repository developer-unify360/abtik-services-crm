import json

from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from bookings.models import Booking, Bank
from bookings.permissions import CanCreateBooking, CanDeleteBooking, CanUpdateBooking
from bookings.serializers import (
    BankSerializer,
    BookingCreateUpdateSerializer,
    BookingListSerializer,
    BookingSerializer,
)
from bookings.services import BookingService
from clients.serializers import ClientCreateUpdateSerializer, ClientSerializer
from clients.services import ClientService
from roles.permissions import IsTenantUser
from services.serializers import ServiceRequestCreateUpdateSerializer, ServiceRequestSerializer
from services.services import ServiceRequestService


class BankViewSet(viewsets.ModelViewSet):
    """ViewSet for Bank model."""
    serializer_class = BankSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]

    def get_queryset(self):
        return Bank.tenant_objects.for_tenant(self.request.tenant_id).filter(
            is_active=True
        ).order_by('bank_name', 'account_number')

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant_id)

    def perform_update(self, serializer):
        serializer.save()


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        filters = {
            'client_id': self.request.query_params.get('client_id'),
            'status': self.request.query_params.get('status'),
            'date_from': self.request.query_params.get('date_from'),
            'date_to': self.request.query_params.get('date_to'),
        }
        filters = {k: v for k, v in filters.items() if v}
        return BookingService.list_bookings(self.request.tenant_id, user=self.request.user, filters=filters or None)

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
            raise ValidationError({payload_name: f"Invalid JSON supplied for '{payload_name}'."})

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
            normalized_service_payload = {
                'service': service_payload.get('service'),
                'priority': service_payload.get('priority', 'medium'),
            }
            if service_payload.get('booking'):
                normalized_service_payload['booking'] = service_payload.get('booking')
            service_serializer = ServiceRequestCreateUpdateSerializer(data=normalized_service_payload, partial=True)
            service_serializer.is_valid(raise_exception=True)

        return client_serializer, booking_serializer, service_serializer

    def create(self, request, *args, **kwargs):
        if not CanCreateBooking().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to create bookings"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = BookingCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if 'client_id' not in serializer.validated_data:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": "{'client_id': ['This field is required.']}"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            booking = BookingService.create_booking(
                tenant_id=request.tenant_id,
                data=serializer.validated_data,
                user=request.user,
            )
            return Response(
                {"success": True, "data": BookingSerializer(booking, context={'request': request}).data, "message": "Booking created successfully"},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def update(self, request, *args, **kwargs):
        if not CanUpdateBooking().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to update bookings"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        booking = self.get_object()
        serializer = BookingCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            updated_booking = BookingService.update_booking(booking, serializer.validated_data, user=request.user)
            return Response(
                {"success": True, "data": BookingSerializer(updated_booking, context={'request': request}).data, "message": "Booking updated successfully"},
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

    def destroy(self, request, *args, **kwargs):
        if not CanDeleteBooking().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to delete bookings"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        booking = self.get_object()
        BookingService.delete_booking(booking, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='bde-form')
    def bde_form_create(self, request):
        role_name = request.user.role.name if getattr(request.user, 'role', None) else None
        if role_name not in ['BDE', 'Admin', 'Super Admin']:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to access this booking form."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            client_serializer, booking_serializer, service_serializer = self._validate_full_form_payload()
            if not client_serializer:
                return Response(
                    {"success": False, "error": {"code": "INVALID_INPUT", "message": "Client information is required.", "details": {"client": ["Client details are required."]}}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Check for validation errors in serializers
            client_errors = client_serializer.errors if client_serializer else {}
            booking_errors = booking_serializer.errors
            
            if client_errors or booking_errors:
                error_details = {}
                if client_errors:
                    error_details['client'] = client_errors
                if booking_errors:
                    error_details['booking'] = booking_errors
                return Response(
                    {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": error_details}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            booking_payload = dict(booking_serializer.validated_data)
            client_payload = dict(client_serializer.validated_data) if client_serializer else {}
            request_payload = dict(service_serializer.validated_data) if service_serializer else {}

            result = ClientService.create_client_with_booking_and_request(
                tenant_id=request.tenant_id,
                client_data=client_payload,
                booking_data=booking_payload,
                request_data=request_payload,
                user=request.user,
            )
            return Response(
                {
                    "success": True,
                    "data": {
                        "client": ClientSerializer(result['client']).data,
                        "booking": BookingSerializer(result['booking'], context={'request': request}).data,
                        "service_request": (
                            ServiceRequestSerializer(result['service_request']).data
                            if result['service_request']
                            else None
                        ),
                    },
                    "message": "Booking form submitted successfully",
                },
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['put', 'patch'], url_path='bde-form')
    def bde_form_update(self, request, pk=None):
        role_name = request.user.role.name if getattr(request.user, 'role', None) else None
        if role_name not in ['BDE', 'Admin', 'Super Admin']:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to access this booking form."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not CanUpdateBooking().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to update bookings"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        booking = self.get_object()

        try:
            client_serializer, booking_serializer, service_serializer = self._validate_full_form_payload(partial=True)

            with transaction.atomic():
                if client_serializer:
                    ClientService.update_client(booking.client, client_serializer.validated_data, user=request.user)

                updated_booking = BookingService.update_booking(
                    booking,
                    booking_serializer.validated_data,
                    user=request.user,
                )

                existing_request = updated_booking.service_requests.order_by('created_at').first()
                updated_service_request = existing_request
                if service_serializer:
                    request_data = dict(service_serializer.validated_data)
                    request_data['booking'] = updated_booking
                    if existing_request:
                        updated_service_request = ServiceRequestService.update_request(
                            existing_request,
                            {
                                'service': request_data['service'],
                                'priority': request_data.get('priority', existing_request.priority),
                                'booking': updated_booking,
                            },
                            user=request.user,
                        )
                    else:
                        updated_service_request = ServiceRequestService.create_request(
                            tenant_id=request.tenant_id,
                            data=request_data,
                            user=request.user,
                        )

            return Response(
                {
                    "success": True,
                    "data": {
                        "client": ClientSerializer(updated_booking.client).data,
                        "booking": BookingSerializer(updated_booking, context={'request': request}).data,
                        "service_request": (
                            ServiceRequestSerializer(updated_service_request).data
                            if updated_service_request
                            else None
                        ),
                    },
                    "message": "Booking form updated successfully",
                }
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )
