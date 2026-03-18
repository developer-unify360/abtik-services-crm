from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceCategoryViewSet, ServiceViewSet, ServiceRequestViewSet

router = DefaultRouter()
router.register(r'service-categories', ServiceCategoryViewSet, basename='service-categories')
router.register(r'services', ServiceViewSet, basename='services')
router.register(r'service-requests', ServiceRequestViewSet, basename='service-requests')

urlpatterns = [
    path('', include(router.urls)),
]
