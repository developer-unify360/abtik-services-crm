from django.contrib import admin

from payments.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'client_name',
        'company_name',
        'source',
        'payment_type',
        'payment_date',
        'received_amount',
        'remaining_amount',
        'created_at',
    )
    list_filter = ('source', 'payment_type', 'payment_date', 'created_at')
    search_fields = ('client_name', 'company_name', 'reference_number')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (
            'Links',
            {
                'fields': ('source', 'booking', 'client', 'reference_number'),
            },
        ),
        (
            'Client Snapshot',
            {
                'fields': ('client_name', 'company_name', 'gst_pan', 'email', 'mobile'),
            },
        ),
        (
            'Payment Details',
            {
                'fields': (
                    'payment_type',
                    'bank',
                    'payment_date',
                    'total_payment_amount',
                    'received_amount',
                    'remaining_amount',
                    'after_fund_disbursement_percentage',
                    'attachment',
                ),
            },
        ),
        (
            'Timestamps',
            {
                'fields': ('created_at', 'updated_at'),
            },
        ),
    )
