from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DocumentPortalViewSet,
    DocumentSubmissionViewSet,
    PublicDocumentPortalDetailView,
    PublicDocumentPortalSubmitView,
    ServiceRequestViewSet,
    ServiceViewSet,
)

router = DefaultRouter()
router.register(r'services', ServiceViewSet, basename='services')
router.register(r'service-requests', ServiceRequestViewSet, basename='service-requests')
router.register(r'document-portals', DocumentPortalViewSet, basename='document-portals')
router.register(r'document-submissions', DocumentSubmissionViewSet, basename='document-submissions')

urlpatterns = [
    path('document-portals/public/<str:token>/', PublicDocumentPortalDetailView.as_view(), name='public-document-portal-detail'),
    path('document-portals/public/<str:token>/submit/', PublicDocumentPortalSubmitView.as_view(), name='public-document-portal-submit'),
    path('', include(router.urls)),
]
