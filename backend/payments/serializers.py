from rest_framework import serializers

from payments.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    payment_type_name = serializers.CharField(source='payment_type.name', read_only=True)
    bank_name = serializers.CharField(source='bank.bank_name', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    attachment_url = serializers.SerializerMethodField()
    booking_id = serializers.UUIDField(source='booking.id', read_only=True)
    booking_client_name = serializers.CharField(source='booking.client.client_name', read_only=True)
    is_editable = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id',
            'booking',
            'booking_id',
            'booking_client_name',
            'client',
            'client_name',
            'company_name',
            'gst_pan',
            'email',
            'mobile',
            'source',
            'source_display',
            'payment_type',
            'payment_type_name',
            'bank',
            'bank_name',
            'reference_number',
            'payment_date',
            'total_payment_amount',
            'received_amount',
            'remaining_amount',
            'after_fund_disbursement_percentage',
            'attachment_url',
            'services',
            'is_editable',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'booking',
            'booking_id',
            'booking_client_name',
            'source',
            'source_display',
            'attachment_url',
            'is_editable',
            'created_at',
            'updated_at',
        ]

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            url = obj.attachment.url
            return request.build_absolute_uri(url) if request else url

        if obj.booking and obj.booking.attachment:
            request = self.context.get('request')
            url = obj.booking.attachment.url
            return request.build_absolute_uri(url) if request else url

        return None

    def get_is_editable(self, obj):
        return obj.source == Payment.SOURCE_MANUAL


class PaymentListSerializer(serializers.ModelSerializer):
    payment_type_name = serializers.CharField(source='payment_type.name', read_only=True)
    bank_name = serializers.CharField(source='bank.bank_name', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    booking_id = serializers.UUIDField(source='booking.id', read_only=True)
    is_editable = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id',
            'booking_id',
            'client_name',
            'company_name',
            'source',
            'source_display',
            'payment_type',
            'payment_type_name',
            'bank',
            'bank_name',
            'reference_number',
            'payment_date',
            'received_amount',
            'remaining_amount',
            'is_editable',
            'created_at',
        ]

    def get_is_editable(self, obj):
        return obj.source == Payment.SOURCE_MANUAL


class PaymentCreateUpdateSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False, allow_null=True)
    booking_id = serializers.UUIDField(required=False, allow_null=True)
    client_id = serializers.UUIDField(required=False, allow_null=True)
    client_name = serializers.CharField(required=False, allow_blank=True)
    company_name = serializers.CharField(required=False, allow_blank=True)
    gst_pan = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    mobile = serializers.CharField(required=False, allow_blank=True)
    payment_type = serializers.UUIDField(required=False, allow_null=True)
    bank = serializers.UUIDField(required=False, allow_null=True)
    reference_number = serializers.CharField(required=False, allow_blank=True)
    payment_date = serializers.DateField(required=False, allow_null=True)
    total_payment_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    received_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    after_fund_disbursement_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    attachment = serializers.FileField(required=False, allow_null=True)
    remove_attachment = serializers.BooleanField(required=False, default=False)
    services = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
    )

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

        percentage = attrs.get('after_fund_disbursement_percentage')
        if percentage is not None and percentage > 100:
            raise serializers.ValidationError(
                {'after_fund_disbursement_percentage': "Percentage cannot be greater than 100."}
            )

        total_payment = attrs.get('total_payment_amount')
        received_amount = attrs.get('received_amount')
        remaining_amount = attrs.get('remaining_amount')
        if remaining_amount is None and total_payment is not None and received_amount is not None:
            attrs['remaining_amount'] = total_payment - received_amount

        services = attrs.get('services')
        if services is not None and len(services) > 1:
            raise serializers.ValidationError({'services': "Select only one service for each payment."})

        return attrs
