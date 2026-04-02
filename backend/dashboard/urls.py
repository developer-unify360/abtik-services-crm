from django.urls import path
from .views import TodayStatsView, UserPerformanceView

urlpatterns = [
    path('today-stats/', TodayStatsView.as_view(), name='today-stats'),
    path('user-performance/', UserPerformanceView.as_view(), name='user-performance'),
]
