from django.urls import path, include
from rest_framework.routers import DefaultRouter
from roles.views import RoleViewSet

router = DefaultRouter()
router.register(r'', RoleViewSet, basename='role')

urlpatterns = [
    path('', include(router.urls)),
]
