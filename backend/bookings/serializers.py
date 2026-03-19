from rest_framework import serializers
from bookings.models import Booking, Bank


class BankSerializer(serializers.ModelSerializer):
    """Serializer for Bank model."""

    class Meta:
        model = Bank
        fields = [
            'id', 'bank_name', 'account_number', 'branch_name',
            'ifsc_code', 'account_holder_name', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BookingSerializer(serializers.ModelSerializer):
    """Full booking serializer for detail views."""
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    company_name = serializers.CharField(source='client.company_name', read_only=True)
    bde_name = serializers.CharField(source='bde_user.name', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    bank_name = serializers.CharField(source='bank.bank_name', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'client', 'client_name', 'company_name',
            'bde_user', 'bde_name',
            'payment_type', 'payment_type_display',
            'bank', 'bank_name',
            'booking_date', 'payment_date',
            'total_payment_amount', 'total_payment_remarks',
            'received_amount', 'received_amount_remarks',
            'remaining_amount', 'remaining_amount_remarks',
            'after_fund_disbursement_percentage', 'after_fund_disbursement_remarks',
            'attachment',
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
    bank_name = serializers.CharField(source='bank.bank_name', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'client_name', 'company_name',
            'payment_type', 'payment_type_display',
            'bank', 'bank_name', 'booking_date', 'status', 'status_display',
            'created_at',
        ]


class BookingCreateUpdateSerializer(serializers.Serializer):
    """Serializer for creating/updating booking records."""
    client_id = serializers.UUIDField(required=False)
    payment_type = serializers.ChoiceField(choices=Booking.PAYMENT_TYPE_CHOICES)
    bank = serializers.UUIDField(required=False, allow_null=True)
    booking_date = serializers.DateField()
    payment_date = serializers.DateField(required=False, allow_null=True)
    total_payment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    total_payment_remarks = serializers.CharField(required=False, allow_blank=True)
    received_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    received_amount_remarks = serializers.CharField(required=False, allow_blank=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    remaining_amount_remarks = serializers.CharField(required=False, allow_blank=True)
    after_fund_disbursement_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    after_fund_disbursement_remarks = serializers.CharField(required=False, allow_blank=True)
    attachment = serializers.FileField(required=False, allow_null=True)
    remove_attachment = serializers.BooleanField(required=False, default=False)
    remarks = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=Booking.STATUS_CHOICES, required=False, default='pending')

    def validate_booking_date(self, value):
        from django.utils import timezone
        if value > timezone.now().date():
            raise serializers.ValidationError("Booking date cannot be in the future.")
        return value

    def validate_payment_date(self, value):
        from django.utils import timezone
        if value and value > timezone.now().date():
            raise serializers.ValidationError("Payment date cannot be in the future.")
        return value

    def validate(self, attrs):
        amount_fields = [
            'total_payment_amount',
            'received_amount',
            'remaining_amount',
            'after_fund_disbursement_percentage',
        ]
        for field_name in amount_fields:
            value = attrs.get(field_name)
            if value is not None and value < 0:
                raise serializers.ValidationError({field_name: "Value cannot be negative."})

        after_fund_disbursement = attrs.get('after_fund_disbursement_percentage')
        if after_fund_disbursement is not None and after_fund_disbursement > 100:
            raise serializers.ValidationError(
                {'after_fund_disbursement_percentage': "Percentage cannot be greater than 100."}
            )

        total_payment = attrs.get('total_payment_amount')
        received_amount = attrs.get('received_amount')
        remaining_amount = attrs.get('remaining_amount')
        if remaining_amount is None and total_payment is not None and received_amount is not None:
            attrs['remaining_amount'] = total_payment - received_amount

        return attrs
