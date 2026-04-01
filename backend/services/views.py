import json

from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView
from django.db.models import ProtectedError
from .models import ClientDocumentPortal, ClientDocumentSubmission, Service, ServiceRequest
from .serializers import (
    ClientDocumentPortalSerializer,
    ClientDocumentPortalWriteSerializer,
    ClientDocumentSubmissionSerializer,
    PublicClientDocumentPortalSerializer,
    PublicClientDocumentSubmissionSerializer,
    ServiceSerializer, ServiceRequestSerializer,
    ServiceRequestCreateUpdateSerializer, ServiceRequestAssignSerializer,
    ServiceRequestHandoffReviewSerializer,
    ServiceRequestHandoffSerializer,
    ServiceRequestStatusUpdateSerializer,
)
from .services import DocumentPortalService, ServiceManagementService, ServiceRequestService
from .permissions import CanManageServices, CanAssignTasks, CanUpdateTaskStatus
from django.core.exceptions import ValidationError


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [CanManageServices()]

    def get_queryset(self):
        return ServiceManagementService.get_services()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "Services retrieved successfully"
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = ServiceManagementService.create_service(
            data=serializer.validated_data,
            user=request.user,
        )
        return Response(
            {"success": True, "data": ServiceSerializer(service).data, "message": "Service created successfully"},
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        service = self.get_object()
        try:
            service.delete()
        except ProtectedError:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "SERVICE_IN_USE",
                        "message": "This service is already linked to service requests.",
                    },
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class ServiceRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def _get_filters(self):
        return {
            'status': self.request.query_params.get('status'),
            'assigned_to': self.request.query_params.get('assigned_to'),
            'priority': self.request.query_params.get('priority'),
            'booking_id': self.request.query_params.get('booking_id'),
            'handoff_status': self.request.query_params.get('handoff_status'),
            'handoff_incomplete': self.request.query_params.get('handoff_incomplete'),
        }

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ServiceRequestCreateUpdateSerializer
        if self.action == 'assign':
            return ServiceRequestAssignSerializer
        if self.action == 'status':
            return ServiceRequestStatusUpdateSerializer
        if self.action == 'handoff':
            return ServiceRequestHandoffSerializer
        if self.action == 'review_handoff':
            return ServiceRequestHandoffReviewSerializer
        return ServiceRequestSerializer

    def get_queryset(self):
        filters = self._get_filters()
        booking_id = filters.get('booking_id')
        filters = {k: v for k, v in filters.items() if v}

        queryset = ServiceRequestService.list_requests(filters or None)

        # Booking forms need to rehydrate all requests for a booking, even before
        # they have been assigned to a delivery user.
        if not booking_id and not (self.request.user.is_staff or self.request.user.is_superuser):
            queryset = queryset.filter(assigned_to=self.request.user)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "Service requests retrieved successfully"
        })

    @action(detail=False, methods=['get'], url_path='delivery-board')
    def delivery_board(self, request):
        filters = {k: v for k, v in self._get_filters().items() if v}
        queryset = ServiceRequestService.list_requests(filters or None)
        serializer = ServiceRequestSerializer(queryset, many=True, context={'request': request})
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "IT delivery board retrieved successfully",
        })

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service_request = ServiceRequestService.create_request(
            data=serializer.validated_data,
            user=request.user,
        )
        return Response(
            {"success": True, "data": ServiceRequestSerializer(service_request).data, "message": "Service Request created successfully"},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['put'])
    def assign(self, request, pk=None):
        if not CanAssignTasks().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        service_request = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_request = ServiceRequestService.assign_task(
                service_request=service_request,
                assigned_to_user=serializer.validated_data.get('assigned_to'),
                user=request.user
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "LOCKED_SERVICE_REQUEST", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"success": True, "data": ServiceRequestSerializer(updated_request).data, "message": "Task assigned successfully"}
        )

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        service_request = self.get_object()
        
        if not CanUpdateTaskStatus().has_object_permission(request, self, service_request):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_request = ServiceRequestService.update_status(
                service_request=service_request,
                new_status=serializer.validated_data.get('status'),
                user=request.user
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_TRANSITION", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"success": True, "data": ServiceRequestSerializer(updated_request).data, "message": "Status updated successfully"}
        )

    @action(detail=True, methods=['patch'])
    def handoff(self, request, pk=None):
        service_request = self.get_object()
        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            updated_request = ServiceRequestService.update_handoff(
                service_request=service_request,
                data=serializer.validated_data,
                user=request.user,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "LOCKED_SERVICE_REQUEST", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"success": True, "data": ServiceRequestSerializer(updated_request).data, "message": "Handoff saved successfully"}
        )

    @action(detail=True, methods=['post'], url_path='submit-handoff')
    def submit_handoff(self, request, pk=None):
        service_request = self.get_object()

        try:
            updated_request = ServiceRequestService.submit_handoff(
                service_request=service_request,
                user=request.user,
            )
        except ValidationError as e:
            error_code = 'LOCKED_SERVICE_REQUEST' if 'Closed execution requests cannot be edited.' in str(e) else 'INCOMPLETE_HANDOFF'
            return Response(
                {"success": False, "error": {"code": error_code, "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"success": True, "data": ServiceRequestSerializer(updated_request).data, "message": "Handoff submitted successfully"}
        )

    @action(detail=True, methods=['post'], url_path='review-handoff')
    def review_handoff(self, request, pk=None):
        if not CanAssignTasks().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Permission denied"}},
                status=status.HTTP_403_FORBIDDEN,
            )

        service_request = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_request = ServiceRequestService.review_handoff(
                service_request=service_request,
                decision=serializer.validated_data['decision'],
                rejection_reason=serializer.validated_data.get('rejection_reason', ''),
                user=request.user,
            )
        except ValidationError as e:
            error_code = 'LOCKED_SERVICE_REQUEST' if 'Closed execution requests cannot be edited.' in str(e) else 'INVALID_HANDOFF_REVIEW'
            return Response(
                {"success": False, "error": {"code": error_code, "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"success": True, "data": ServiceRequestSerializer(updated_request).data, "message": "Handoff review saved successfully"}
        )


class DocumentPortalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'mark_shared']:
            return [CanManageServices()]
        return [IsAuthenticated()]

    def get_queryset(self):
        filters = {
            'client_id': self.request.query_params.get('client_id'),
            'has_submissions': self.request.query_params.get('has_submissions'),
            'is_active': self.request.query_params.get('is_active'),
        }
        return DocumentPortalService.list_portals({k: v for k, v in filters.items() if v is not None})

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ClientDocumentPortalWriteSerializer
        return ClientDocumentPortalSerializer

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True, context={'request': request})
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "Document portals retrieved successfully",
        })

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object(), context={'request': request})
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        portal = DocumentPortalService.create_or_update_portal(serializer.validated_data, request.user)
        return Response(
            {
                "success": True,
                "data": ClientDocumentPortalSerializer(portal, context={'request': request}).data,
                "message": "Document portal saved successfully",
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        portal = DocumentPortalService.create_or_update_portal(serializer.validated_data, request.user)
        return Response(
            {
                "success": True,
                "data": ClientDocumentPortalSerializer(portal, context={'request': request}).data,
                "message": "Document portal updated successfully",
            }
        )

    @action(detail=True, methods=['post'], url_path='mark-shared')
    def mark_shared(self, request, pk=None):
        portal = DocumentPortalService.record_share(self.get_object())
        return Response(
            {
                "success": True,
                "data": ClientDocumentPortalSerializer(portal, context={'request': request}).data,
                "message": "Portal share timestamp updated",
            }
        )


class DocumentSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ClientDocumentSubmissionSerializer

    def get_queryset(self):
        filters = {
            'client_id': self.request.query_params.get('client_id'),
            'portal_id': self.request.query_params.get('portal_id'),
        }
        return DocumentPortalService.list_submissions({k: v for k, v in filters.items() if v})

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True, context={'request': request})
        return Response({
            "success": True,
            "data": serializer.data,
            "message": "Document submissions retrieved successfully",
        })


class PublicDocumentPortalDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            portal = DocumentPortalService.get_public_portal(token)
        except ClientDocumentPortal.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Document portal not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PublicClientDocumentPortalSerializer(portal, context={'request': request})
        return Response({"success": True, "data": serializer.data})


class PublicDocumentPortalSubmitView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, token):
        try:
            portal = DocumentPortalService.get_public_portal(token)
        except ClientDocumentPortal.DoesNotExist:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Document portal not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = request.data.get('payload', {})
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                return Response(
                    {"success": False, "error": {"code": "INVALID_INPUT", "message": "Invalid upload payload."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = PublicClientDocumentSubmissionSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        documents = []
        for item in serializer.validated_data['documents']:
            file_obj = request.FILES.get(item['file_key'])
            if not file_obj:
                continue
            documents.append({
                'requirement_id': item.get('requirement_id'),
                'document_name': item.get('document_name'),
                'note': item.get('note', ''),
                'file': file_obj,
            })

        try:
            submissions = DocumentPortalService.submit_documents(
                portal=portal,
                submitted_by_name=serializer.validated_data.get('submitted_by_name', ''),
                submitted_by_email=serializer.validated_data.get('submitted_by_email', ''),
                documents=documents,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "error": {"code": "INVALID_INPUT", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "data": ClientDocumentSubmissionSerializer(submissions, many=True, context={'request': request}).data,
                "message": "Documents uploaded successfully",
            },
            status=status.HTTP_201_CREATED,
        )
