from django.urls import path, include
from rest_framework.routers import DefaultRouter
from leads.views import LeadViewSet, ActivityViewSet

router = DefaultRouter()
router.register(r'', LeadViewSet, basename='lead') # Empty string to mount LeadViewSet directly on /api/leads/
router.register(r'activities', ActivityViewSet, basename='activity')

urlpatterns = [
    path('', include(router.urls)),
]
