from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    """
    Admin configuration for Booking model.
    All fields are editable for Super Admin.
    """
    list_display = ('id', 'client', 'bde_user', 'payment_type', 'booking_date', 'payment_date', 'status', 'tenant', 'created_at')
    list_filter = ('status', 'payment_type', 'tenant', 'booking_date', 'created_at')
    search_fields = ('client__client_name', 'client__company_name', 'bank_account', 'remarks', 'id')
    ordering = ('-booking_date', '-created_at')
    
    fieldsets = (
        ('Booking Details', {
            'fields': ('client', 'bde_user', 'payment_type', 'bank_account', 'booking_date', 'payment_date', 'status', 'remarks')
        }),
        ('Tenant', {
            'fields': ('tenant',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    list_per_page = 50
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Super Admin can see all bookings
        if request.user.is_superuser:
            return qs
        return qs.filter(tenant=request.user.tenant)
