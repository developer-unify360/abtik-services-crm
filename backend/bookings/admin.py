from django.contrib import admin
from .models import Booking, Bank


@admin.register(Bank)
class BankAdmin(admin.ModelAdmin):
    """
    Admin configuration for Bank model.
    """
    list_display = ('bank_name', 'account_number', 'branch_name', 'ifsc_code', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('bank_name', 'account_number', 'branch_name', 'ifsc_code', 'account_holder_name')
    ordering = ('bank_name', 'account_number')

    fieldsets = (
        ('Bank Details', {
            'fields': ('bank_name', 'account_number', 'branch_name', 'ifsc_code', 'account_holder_name', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    """
    Admin configuration for Booking model.
    """
    list_display = ('id', 'client', 'bde_name', 'lead_source', 'payment_type', 'bank', 'booking_date', 'status', 'created_at')
    list_filter = ('status', 'payment_type', 'lead_source', 'booking_date', 'created_at')
    search_fields = ('client__client_name', 'client__company_name', 'remarks', 'id')
    ordering = ('-booking_date', '-created_at')
    
    fieldsets = (
        ('Booking Details', {
            'fields': ('client', 'bde_name', 'lead_source', 'payment_type', 'bank', 'booking_date', 'payment_date', 'status', 'remarks')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50
    
    def get_queryset(self, request):
        return super().get_queryset(request)
