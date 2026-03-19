from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health(request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health),
    path('api/v1/auth/', include('auth_app.urls')),
    path('api/v1/users/', include('users.urls')),
    path('api/v1/roles/', include('roles.urls')),
    path('api/v1/tenants/', include('tenants.urls')),
    path('api/v1/clients/', include('clients.urls')),
    path('api/v1/bookings/', include('bookings.urls')),
    path('api/v1/', include('services.urls')),
    path('api/v1/tasks/', include('tasks.urls')),
]

