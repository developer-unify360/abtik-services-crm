import jwt
from django.conf import settings
from django.http import JsonResponse
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

            if auth_header and auth_header.startswith('Bearer '):
                try:
                    token = auth_header.split(' ')[1]
                    validated_token = self.jwt_authenticator.get_validated_token(token)
                    tenant_id = validated_token.get('tenant_id')
                    
                    if tenant_id:
                        request.tenant_id = tenant_id
                        try:
                            request.tenant = Tenant.objects.get(id=tenant_id)
                        except Tenant.DoesNotExist:
                            pass
                except (InvalidToken, TokenError):
                    pass # Handled by DRF Auth later
            elif tenant_id_header:
                try:
                    request.tenant = Tenant.objects.get(id=tenant_id_header)
                    request.tenant_id = request.tenant.id
                except Tenant.DoesNotExist:
                     pass

        response = self.get_response(request)
        return response
