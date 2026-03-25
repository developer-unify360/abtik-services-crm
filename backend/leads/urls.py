from django.urls import path, include
from rest_framework.routers import DefaultRouter
from leads.views import LeadViewSet, ActivityViewSet, LeadAssignmentRuleViewSet

router = DefaultRouter()
router.register(r'assignment-rules', LeadAssignmentRuleViewSet, basename='assignment-rule')
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'', LeadViewSet, basename='lead') # Put LeadViewSet last to avoid shadowing sub-paths

urlpatterns = [
    path('', include(router.urls)),
]
