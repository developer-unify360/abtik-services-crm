from django.urls import path
from .views import DashboardOverviewView, TodayStatsView, UserPerformanceView

urlpatterns = [
    path('overview/', DashboardOverviewView.as_view(), name='overview'),
    path('today-stats/', TodayStatsView.as_view(), name='today-stats'),
    path('user-performance/', UserPerformanceView.as_view(), name='user-performance'),
]
