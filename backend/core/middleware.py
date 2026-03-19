import jwt
from django.conf import settings
from django.http import JsonResponse
from django.core.exceptions import ValidationError
from tenants.models import Tenant
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_authenticator = JWTAuthentication()

    def __call__(self, request):
        if request.path.startswith('/api/'):
            auth_header = request.headers.get('Authorization')
            tenant_id_header = request.headers.get('Tenant-ID')

            request.tenant = None
            request.tenant_id = None
            resolved_tenant_id = None

            if auth_header and auth_header.startswith('Bearer '):
                try:
                    token = auth_header.split(' ')[1]
                    validated_token = self.jwt_authenticator.get_validated_token(token)
                    resolved_tenant_id = validated_token.get('tenant_id')
                except (InvalidToken, TokenError):
                    pass # Handled by DRF Auth later

            # When a global admin logs in without tenant_id in the token, allow an
            # explicit Tenant-ID header to provide the active tenant context.
            if not resolved_tenant_id and tenant_id_header:
                resolved_tenant_id = tenant_id_header

            if resolved_tenant_id:
                request.tenant_id = resolved_tenant_id
                try:
                    request.tenant = Tenant.objects.get(id=resolved_tenant_id)
                except (Tenant.DoesNotExist, ValidationError):
                    pass

        response = self.get_response(request)
        return response
