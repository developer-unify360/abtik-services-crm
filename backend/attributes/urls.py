from django.urls import path, include
from rest_framework.routers import DefaultRouter
from attributes.views import IndustryViewSet, LeadSourceViewSet, PaymentTypeViewSet

router = DefaultRouter()
router.register(r'industries', IndustryViewSet)
router.register(r'lead-sources', LeadSourceViewSet)
router.register(r'payment-types', PaymentTypeViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
