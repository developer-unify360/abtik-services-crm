from django.urls import include, path
from rest_framework.routers import DefaultRouter

from payroll.views import PayrollConfigurationView, PayrollEmployeeViewSet, PayslipViewSet

router = DefaultRouter()
router.register(r'employees', PayrollEmployeeViewSet, basename='payroll-employee')
router.register(r'payslips', PayslipViewSet, basename='payslip')

urlpatterns = [
    path('configuration/', PayrollConfigurationView.as_view(), name='payroll-configuration'),
    path('', include(router.urls)),
]

