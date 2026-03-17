from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from bookings.models import Booking
from bookings.serializers import BookingSerializer, BookingListSerializer, BookingCreateUpdateSerializer
from bookings.services import BookingService
from bookings.permissions import CanCreateBooking, CanUpdateBooking, CanDeleteBooking
from roles.permissions import IsTenantUser
from django.core.exceptions import ValidationError


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]

    def get_queryset(self):
        filters = {
            'client_id': self.request.query_params.get('client_id'),
            'status': self.request.query_params.get('status'),
            'date_from': self.request.query_params.get('date_from'),
            'date_to': self.request.query_params.get('date_to'),
        }
        filters = {k: v for k, v in filters.items() if v}
        return BookingService.list_bookings(self.request.tenant_id, filters or None)

    def get_serializer_class(self):
        if self.action == 'list':
            return BookingListSerializer
        return BookingSerializer

    def create(self, request, *args, **kwargs):
        if not CanCreateBooking().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You do not have permission to create bookings"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = BookingCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            booking = BookingService.create_booking(
                tenant_id=request.tenant_id,
                data=serializer.validated_data,
                user=request.user,
            )
            return Response(
                {"success": True, "data": BookingSerializer(booking).data, "message": "Booking created successfully"},
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
                {"success": True, "data": BookingSerializer(updated_booking).data, "message": "Booking updated successfully"},
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
