from rest_framework import viewsets, filters, status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from rest_framework import permissions
from rest_framework.permissions import AllowAny
from leads.models import Lead, LeadActivity
from attributes.models import LeadSource
from leads.serializers import (
    LeadSerializer, 
    LeadListSerializer, 
    LeadCreateSerializer,
    LeadActivitySerializer,
    LeadUpdateStatusSerializer,
    ExternalLeadSerializer
)

class LeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing leads.
    Provides standard CRUD plus custom actions.
    """
    queryset = Lead.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'source', 'assigned_to']
    search_fields = ['first_name', 'last_name', 'email', 'company_name', 'phone']
    ordering_fields = ['created_at', 'updated_at', 'lead_score', 'priority']
    ordering = ['-priority', '-lead_score', '-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return LeadListSerializer
        if self.action == 'update_status':
            return LeadUpdateStatusSerializer
        if self.action == 'public':
            return LeadCreateSerializer
        return LeadSerializer

    def get_permissions(self):
        if self.action == 'public':
            return [AllowAny()]
        return super().get_permissions()

    def perform_create(self, serializer):
        lead = serializer.save()
        # Log lead creation as an activity
        LeadActivity.objects.create(
            lead=lead,
            activity_type='note',
            description='Lead created in system.',
            performed_by=self.request.user
        )

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        """Update lead status and log the change."""
        lead = self.get_object()
        serializer = self.get_serializer(lead, data=request.data, partial=True)
        
        if serializer.is_valid():
            old_status = lead.get_status_display()
            serializer.save()
            new_status = lead.get_status_display()
            
            # Log the change as an activity
            LeadActivity.objects.create(
                lead=lead,
                activity_type='status_change',
                description=f'Status changed from "{old_status}" to "{new_status}".',
                performed_by=self.request.user
            )
            
            return Response(LeadSerializer(lead).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='log-activity')
    def log_activity(self, request, pk=None):
        """Log an interaction with the lead."""
        lead = self.get_object()
        serializer = LeadActivitySerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(
                lead=lead,
                performed_by=self.request.user
            )
            
            # Update last_contacted_at on lead
            lead.last_contacted_at = timezone.now()
            lead.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """Prepare lead for conversion to booking - status will be updated when booking is created."""
        lead = self.get_object()
        
        LeadActivity.objects.create(
            lead=lead,
            activity_type='note',
            description="Lead conversion to booking initiated",
            performed_by=request.user if request.user.is_authenticated else None
        )
        
        return Response({"status": "Lead ready for conversion", "lead_id": str(lead.id)})

    @action(detail=False, methods=['post'], url_path='public')
    def public(self, request):
        """Public endpoint for lead creation."""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            lead = serializer.save()
            # Log lead creation
            LeadActivity.objects.create(
                lead=lead,
                activity_type='note',
                description='Lead created via public form.',
            )
            return Response(LeadSerializer(lead).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary statistics for lead management dashboard."""
        total_leads = Lead.objects.count()
        new_leads = Lead.objects.filter(status='new').count()
        qualified_leads = Lead.objects.filter(status='qualified').count()
        closed_won = Lead.objects.filter(status='closed_won').count()
        
        # Simple stats by source
        stats_by_source = {}
        for lead_source in LeadSource.objects.all():
            stats_by_source[lead_source.name] = Lead.objects.filter(source=lead_source).count()
            
        return Response({
            'total_leads': total_leads,
            'new_leads': new_leads,
            'qualified_leads': qualified_leads,
            'closed_won': closed_won,
            'conversion_rate': round((closed_won / total_leads * 100), 2) if total_leads > 0 else 0,
            'stats_by_source': stats_by_source
        })

class ActivityViewSet(viewsets.ModelViewSet):
    """ViewSet for managing lead activities directly."""
    queryset = LeadActivity.objects.all()
    serializer_class = LeadActivitySerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['lead', 'activity_type']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    permission_classes = [permissions.AllowAny]

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def external_lead_create(request):
    serializer = ExternalLeadSerializer(data=request.data)
    
    if serializer.is_valid():
        lead = serializer.save()
        LeadActivity.objects.create(
            lead=lead,
            activity_type='note',
            description='Lead created via external website form.',
        )
        return Response(
            {
                'success': True,
                'message': 'Lead created successfully'
            },
            status=status.HTTP_201_CREATED
        )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
