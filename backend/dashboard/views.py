from django.db.models import F, Q, Count, CharField, Sum, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import views, response, permissions
from clients.models import Client
from leads.models import Lead
from bookings.models import Booking
from payments.models import Payment
from users.models import User
from users.permissions import IsAdmin
from .serializers import DashboardOverviewSerializer, TodayStatsSerializer, UserPerformanceSerializer


class DashboardOverviewView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        today = timezone.localtime(timezone.now()).date()
        money_field = DecimalField(max_digits=14, decimal_places=2)

        summary = {
            'total_clients': Client.objects.count(),
            'total_bookings': Booking.objects.count(),
            'pending_bookings': Booking.objects.filter(status='pending').count(),
            'completed_bookings': Booking.objects.filter(status='completed').count(),
            'today_leads': Lead.objects.filter(created_at__date=today).count(),
            'today_bookings': Booking.objects.filter(created_at__date=today).count(),
            'total_collections': Payment.objects.filter(source=Payment.SOURCE_BOOKING).aggregate(
                total=Coalesce(Sum('received_amount'), 0, output_field=money_field)
            )['total'] or 0,
        }

        service_revenue = list(
            Payment.objects.filter(
                source=Payment.SOURCE_BOOKING,
                services__isnull=False,
            )
            .values('services')
            .annotate(
                service_id=F('services'),
                name=F('services__name'),
                revenue=Coalesce(Sum('received_amount'), 0, output_field=money_field),
                payments_count=Count('id', distinct=True),
            )
            .values('service_id', 'name', 'revenue', 'payments_count')
            .order_by('-revenue', 'name')
        )

        bde_performance = list(
            Lead.objects.filter(created_by__role='bde')
            .values('created_by_id')
            .annotate(
                user_id=F('created_by_id'),
                name=Coalesce(F('created_by__name'), F('created_by__email'), output_field=CharField()),
                lead_count=Count('id'),
                won_count=Count('id', filter=Q(status='closed_won')),
            )
            .values('user_id', 'name', 'lead_count', 'won_count')
            .order_by('-lead_count', 'name')
        )

        bdm_performance = list(
            Payment.objects.filter(
                source=Payment.SOURCE_BOOKING,
                booking__source_lead__assigned_to__role='sales_manager',
            )
            .values('booking__source_lead__assigned_to_id')
            .annotate(
                user_id=F('booking__source_lead__assigned_to_id'),
                name=Coalesce(
                    F('booking__source_lead__assigned_to__name'),
                    F('booking__source_lead__assigned_to__email'),
                    output_field=CharField(),
                ),
                revenue=Coalesce(Sum('received_amount'), 0, output_field=money_field),
                bookings_count=Count('booking_id', distinct=True),
                payments_count=Count('id', distinct=True),
            )
            .values('user_id', 'name', 'revenue', 'bookings_count', 'payments_count')
            .order_by('-revenue', 'name')
        )

        serializer = DashboardOverviewSerializer(
            data={
                'summary': summary,
                'service_revenue': service_revenue,
                'bde_performance': bde_performance,
                'bdm_performance': bdm_performance,
            }
        )
        serializer.is_valid(raise_exception=True)
        return response.Response(serializer.data)

class TodayStatsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get(self, request):
        today = timezone.localtime(timezone.now()).date()
        
        # Leads Today
        leads_today_qs = Lead.objects.filter(created_at__date=today)
        total_leads_today = leads_today_qs.count()
        
        leads_by_bde = list(
            leads_today_qs.filter(created_by__isnull=False)
            .values('created_by_id')
            .annotate(
                user_id=F('created_by_id'),
                name=Coalesce(F('created_by__name'), F('created_by__email'), output_field=CharField()),
                count=Count('id')
            )
            .values('user_id', 'name', 'count')
        )
        
        # Bookings Today
        bookings_today_qs = Booking.objects.filter(created_at__date=today)
        total_bookings_today = bookings_today_qs.count()
        
        bookings_by_bdm = list(
            Booking.objects.filter(
                created_at__date=today,
                source_lead__assigned_to__isnull=False
            )
            .values('source_lead__assigned_to_id')
            .annotate(
                user_id=F('source_lead__assigned_to_id'),
                name=Coalesce(F('source_lead__assigned_to__name'), F('source_lead__assigned_to__email'), output_field=CharField()),
                count=Count('id', distinct=True)
            )
            .values('user_id', 'name', 'count')
        )
        
        data = {
            'total_leads_today': total_leads_today,
            'leads_by_bde': leads_by_bde,
            'total_bookings_today': total_bookings_today,
            'bookings_by_bdm': bookings_by_bdm
        }
        
        serializer = TodayStatsSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return response.Response(serializer.data)

class UserPerformanceView(views.APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def get(self, request):
        query = request.query_params.get('query', '')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not query:
            target_user = User.objects.filter(role__in=['bde', 'sales_manager']).first()
            if not target_user:
                return response.Response({"detail": "User required"}, status=400)
        else:
            try:
                target_user = User.objects.get(id=query)
            except:
                exact_match = User.objects.filter(
                    Q(name__iexact=query) | Q(email__iexact=query)
                ).first()
                
                if exact_match:
                    target_user = exact_match
                else:
                    matching_users = User.objects.filter(
                        Q(name__icontains=query) | Q(email__icontains=query)
                    ).order_by('name', 'email')
                    
                    if not matching_users.exists():
                        return response.Response({"detail": "User not found"}, status=404)
                    target_user = matching_users.first()
        
        is_bde = target_user.role == 'bde'
        is_bdm = target_user.role in ['sales_manager', 'admin']

        lead_qs = Lead.objects.filter(created_by=target_user)
        booking_qs = Booking.objects.filter(
            Q(source_lead__assigned_to=target_user) | Q(source_lead__created_by=target_user)
        ).distinct()
        
        if start_date:
            lead_qs = lead_qs.filter(created_at__date__gte=start_date)
            booking_qs = booking_qs.filter(created_at__date__gte=start_date)
        if end_date:
            lead_qs = lead_qs.filter(created_at__date__lte=end_date)
            booking_qs = booking_qs.filter(created_at__date__lte=end_date)
            
        leads_created = lead_qs.count()
        leads_converted = lead_qs.filter(status='closed_won').count()
        bookings_count = booking_qs.count()
        conversion_rate = (leads_converted / leads_created * 100) if leads_created > 0 else 0
        
        total_payments = 0
        if is_bdm:
            total_payments = Payment.objects.filter(
                source=Payment.SOURCE_BOOKING,
                booking__in=booking_qs,
            ).aggregate(total=Sum('received_amount'))['total'] or 0
        
        recent_leads = lead_qs.select_related('client').order_by('-created_at')[:10]
        recent_bookings = booking_qs.select_related('client').order_by('-created_at')[:10]
        
        activities = []
        if is_bde:
            for l in recent_leads:
                activities.append({
                    'type': 'lead',
                    'id': l.id,
                    'title': f"Lead: {l.client_name or (l.client.client_name if l.client else 'Unknown')}",
                    'created_at': l.created_at,
                    'status': l.status or 'New'
                })
        else:
            for b in recent_bookings:
                activities.append({
                    'type': 'booking',
                    'id': b.id,
                    'title': f"Booking: {b.client.client_name}",
                    'created_at': b.created_at,
                    'status': b.status,
                    'amount': float(b.received_amount or 0)
                })
        activities.sort(key=lambda x: x['created_at'], reverse=True)
        
        history = []
        for i in range(6, -1, -1):
            day_date = timezone.localtime(timezone.now()).date() - timezone.timedelta(days=i)
            day_name = day_date.strftime("%a")
            l_count = Lead.objects.filter(created_by=target_user, created_at__date=day_date).count()
            b_count = Booking.objects.filter(
                Q(source_lead__assigned_to=target_user) | Q(source_lead__created_by=target_user),
                created_at__date=day_date
            ).distinct().count()
            history.append({
                "day": day_name,
                "leads": l_count,
                "bookings": b_count
            })

        data = {
            'user': {
                'id': str(target_user.id),
                'name': target_user.name or target_user.email,
                'role': target_user.role
            },
            'leads_created': leads_created,
            'leads_converted': leads_converted,
            'bookings_created': bookings_count,
            'conversion_rate': round(conversion_rate, 2),
            'total_payments': float(total_payments),
            'recent_activity': activities[:10],
            'performance_history': history
        }
        
        return response.Response(data)
