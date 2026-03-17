from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('auth_app.urls')),
    path('api/v1/users/', include('users.urls')),
    path('api/v1/tenants/', include('tenants.urls')),
    path('api/v1/clients/', include('clients.urls')),
    path('api/v1/bookings/', include('bookings.urls')),
]

