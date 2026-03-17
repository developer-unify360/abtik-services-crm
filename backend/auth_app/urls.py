from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from auth_app.serializers import CustomTokenObtainPairView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        return Response({"success": True, "message": "Logged out successfully"}, status=status.HTTP_200_OK)

urlpatterns = [
    path('login', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout', LogoutView.as_view(), name='token_logout'),
]
