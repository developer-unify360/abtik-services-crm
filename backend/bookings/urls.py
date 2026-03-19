from django.urls import path, include
from rest_framework.routers import DefaultRouter
from bookings.views import BankViewSet, BookingViewSet

router = DefaultRouter()
router.register(r'bank', BankViewSet, basename='bank')
router.register(r'', BookingViewSet, basename='booking')

urlpatterns = [
    path('', include(router.urls)),
]
