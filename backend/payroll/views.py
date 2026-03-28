import base64
import json
import mimetypes

from django.core.exceptions import ValidationError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from payroll.models import Payslip
from payroll.permissions import CanAccessPayroll
from payroll.serializers import (
    PayrollConfigurationSerializer,
    PayrollConfigurationWriteSerializer,
    PayrollEmployeeSerializer,
    PayslipSerializer,
    PayslipWriteSerializer,
)
from payroll.services import PayrollService


def _coerce_json_payload(data, field_names):
    mutable_data = data.copy()
    for field_name in field_names:
        value = mutable_data.get(field_name)
        if isinstance(value, str):
            stripped_value = value.strip()
            if stripped_value:
                mutable_data[field_name] = json.loads(stripped_value)
    return mutable_data


def _validation_error_response(exc):
    return Response(
        {
            'success': False,
            'error': {
                'code': 'INVALID_INPUT',
                'message': exc.message_dict if hasattr(exc, 'message_dict') else str(exc),
            },
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


def _file_to_data_url(file_field):
    if not file_field:
        return None

    guessed_content_type, _ = mimetypes.guess_type(file_field.name)
    content_type = guessed_content_type or 'application/octet-stream'

    try:
        file_field.open('rb')
        encoded_content = base64.b64encode(file_field.read()).decode('ascii')
        return f'data:{content_type};base64,{encoded_content}'
    except OSError:
        return None
    finally:
        try:
            file_field.close()
        except OSError:
            pass


class PayrollConfigurationView(APIView):
    permission_classes = [IsAuthenticated, CanAccessPayroll]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        configuration = PayrollService.get_configuration()
        serializer = PayrollConfigurationSerializer(configuration, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        return self._save(request, partial=False)

    def patch(self, request):
        return self._save(request, partial=True)

    def _save(self, request, partial=False):
        request_data = _coerce_json_payload(request.data, ['salary_components', 'leave_types'])
        serializer = PayrollConfigurationWriteSerializer(data=request_data, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            configuration = PayrollService.update_configuration(serializer.validated_data, user=request.user)
            response_serializer = PayrollConfigurationSerializer(configuration, context={'request': request})
            return Response({'success': True, 'data': response_serializer.data})
        except ValidationError as exc:
            return _validation_error_response(exc)


class PayrollEmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollEmployeeSerializer
    permission_classes = [IsAuthenticated, CanAccessPayroll]

    def get_queryset(self):
        filters = {
            'search': self.request.query_params.get('search'),
            'is_active': self.request.query_params.get('is_active'),
        }
        filters = {key: value for key, value in filters.items() if value not in [None, '']}
        return PayrollService.list_employees(filters=filters or None)


class PayslipViewSet(viewsets.ModelViewSet):
    serializer_class = PayslipSerializer
    permission_classes = [IsAuthenticated, CanAccessPayroll]
    queryset = Payslip.objects.select_related('employee', 'configuration')

    def get_queryset(self):
        filters = {
            'search': self.request.query_params.get('search'),
            'employee': self.request.query_params.get('employee'),
            'month': self.request.query_params.get('month'),
        }
        filters = {key: value for key, value in filters.items() if value not in [None, '']}
        return PayrollService.list_payslips(filters=filters or None)

    def create(self, request, *args, **kwargs):
        serializer = PayslipWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payslip = PayrollService.create_payslip(serializer.validated_data, user=request.user)
            response_serializer = PayslipSerializer(payslip, context={'request': request})
            return Response({'success': True, 'data': response_serializer.data}, status=status.HTTP_201_CREATED)
        except ValidationError as exc:
            return _validation_error_response(exc)

    def update(self, request, *args, **kwargs):
        payslip = self.get_object()
        partial = kwargs.pop('partial', False)
        serializer = PayslipWriteSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            updated_payslip = PayrollService.update_payslip(payslip, serializer.validated_data, user=request.user)
            response_serializer = PayslipSerializer(updated_payslip, context={'request': request})
            return Response({'success': True, 'data': response_serializer.data})
        except ValidationError as exc:
            return _validation_error_response(exc)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        payslip = self.get_object()
        PayrollService.delete_payslip(payslip, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'])
    def preview(self, request):
        serializer = PayslipWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            preview = PayrollService.preview_payslip(serializer.validated_data)
            configuration = PayrollService.get_configuration()
            preview['company']['company_logo_data_url'] = _file_to_data_url(configuration.company_logo)
            return Response({'success': True, 'data': preview})
        except ValidationError as exc:
            return _validation_error_response(exc)
