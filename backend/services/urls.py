from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceViewSet, ServiceRequestViewSet

router = DefaultRouter()
router.register(r'services', ServiceViewSet, basename='services')
router.register(r'service-requests', ServiceRequestViewSet, basename='service-requests')

urlpatterns = [
    path('', include(router.urls)),
]
