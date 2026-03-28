from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from django.http import JsonResponse
from leads.views import external_lead_create


def health(request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/health/', health),
    path('api/v1/auth/', include('auth_app.urls')),
    path('api/v1/clients/', include('clients.urls')),
    path('api/v1/bookings/', include('bookings.urls')),
    path('api/v1/payments/', include('payments.urls')),
    path('api/v1/payroll/', include('payroll.urls')),
    path('api/v1/leads/', include('leads.urls')),
    path('api/v1/attributes/', include('attributes.urls')),
    path('api/v1/users/', include('users.urls')),
    path('api/v1/', include('services.urls')),
    path('api/external/leads/', external_lead_create, name='external-lead-create'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
