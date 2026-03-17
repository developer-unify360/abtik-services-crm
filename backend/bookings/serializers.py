from rest_framework import serializers
from bookings.models import Booking
from clients.serializers import ClientListSerializer


class BookingSerializer(serializers.ModelSerializer):
    """Full booking serializer for detail views."""
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    company_name = serializers.CharField(source='client.company_name', read_only=True)
    bde_name = serializers.CharField(source='bde_user.name', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'client', 'client_name', 'company_name',
            'bde_user', 'bde_name',
            'payment_type', 'payment_type_display',
            'bank_account', 'booking_date', 'payment_date',
            'remarks', 'status', 'status_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'bde_user', 'bde_name', 'created_at', 'updated_at']


class BookingListSerializer(serializers.ModelSerializer):
    """Compact serializer for list views."""
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    company_name = serializers.CharField(source='client.company_name', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'client_name', 'company_name',
            'payment_type', 'payment_type_display',
            'booking_date', 'status', 'status_display',
            'created_at',
        ]


class BookingCreateUpdateSerializer(serializers.Serializer):
    """Serializer for creating/updating booking records."""
    client_id = serializers.UUIDField()
    payment_type = serializers.ChoiceField(choices=Booking.PAYMENT_TYPE_CHOICES)
    bank_account = serializers.CharField(max_length=255, required=False, allow_blank=True)
    booking_date = serializers.DateField()
    payment_date = serializers.DateField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Booking.STATUS_CHOICES, required=False, default='pending')

    def validate_booking_date(self, value):
        from django.utils import timezone
        if value > timezone.now().date():
            raise serializers.ValidationError("Booking date cannot be in the future.")
        return value
