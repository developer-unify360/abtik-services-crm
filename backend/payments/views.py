from django.core.exceptions import ValidationError
from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from payments.serializers import PaymentCreateUpdateSerializer, PaymentListSerializer, PaymentSerializer
from payments.services import PaymentService


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        filters = {
            'source': self.request.query_params.get('source'),
            'client_id': self.request.query_params.get('client_id'),
            'payment_type': self.request.query_params.get('payment_type'),
            'booking_id': self.request.query_params.get('booking_id'),
            'date_from': self.request.query_params.get('date_from'),
            'date_to': self.request.query_params.get('date_to'),
            'search': self.request.query_params.get('search'),
        }
        filters = {key: value for key, value in filters.items() if value}
        return PaymentService.list_payments(filters=filters or None)

    def get_serializer_class(self):
        if self.action == 'list':
            return PaymentListSerializer
        return PaymentSerializer

    def create(self, request, *args, **kwargs):
        serializer = PaymentCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = PaymentService.create_payment(serializer.validated_data, user=request.user)
            return Response(
                {"success": True, "data": PaymentSerializer(payment, context={'request': request}).data},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_INPUT",
                        "message": exc.message_dict if hasattr(exc, 'message_dict') else str(exc),
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    def update(self, request, *args, **kwargs):
        payment = self.get_object()
        partial = kwargs.pop('partial', False)
        serializer = PaymentCreateUpdateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        try:
            updated_payment = PaymentService.update_payment(payment, serializer.validated_data, user=request.user)
            return Response({"success": True, "data": PaymentSerializer(updated_payment, context={'request': request}).data})
        except ValidationError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_INPUT",
                        "message": exc.message_dict if hasattr(exc, 'message_dict') else str(exc),
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        payment = self.get_object()
        try:
            PaymentService.delete_payment(payment, user=request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValidationError as exc:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_INPUT",
                        "message": exc.message_dict if hasattr(exc, 'message_dict') else str(exc),
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
