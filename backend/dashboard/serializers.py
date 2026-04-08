from rest_framework import serializers

class SummaryCountSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    name = serializers.CharField()
    count = serializers.IntegerField()


class DashboardSummarySerializer(serializers.Serializer):
    total_clients = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    pending_bookings = serializers.IntegerField()
    completed_bookings = serializers.IntegerField()
    today_leads = serializers.IntegerField()
    today_bookings = serializers.IntegerField()
    total_collections = serializers.FloatField()


class ServiceRevenueSerializer(serializers.Serializer):
    service_id = serializers.UUIDField()
    name = serializers.CharField()
    revenue = serializers.FloatField()
    payments_count = serializers.IntegerField()


class BDEPerformanceSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    name = serializers.CharField()
    lead_count = serializers.IntegerField()
    won_count = serializers.IntegerField()


class BDMPerformanceSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    name = serializers.CharField()
    revenue = serializers.FloatField()
    bookings_count = serializers.IntegerField()
    payments_count = serializers.IntegerField()


class DashboardOverviewSerializer(serializers.Serializer):
    summary = DashboardSummarySerializer()
    service_revenue = ServiceRevenueSerializer(many=True)
    bde_performance = BDEPerformanceSerializer(many=True)
    bdm_performance = BDMPerformanceSerializer(many=True)

class TodayStatsSerializer(serializers.Serializer):
    total_leads_today = serializers.IntegerField()
    leads_by_bde = SummaryCountSerializer(many=True)
    total_bookings_today = serializers.IntegerField()
    bookings_by_bdm = SummaryCountSerializer(many=True)

class RecentActivitySerializer(serializers.Serializer):
    type = serializers.CharField() # Leads or Booking
    id = serializers.UUIDField()
    title = serializers.CharField()
    created_at = serializers.DateTimeField()
    status = serializers.CharField()

class UserPerformanceSerializer(serializers.Serializer):
    user = serializers.DictField() # { id, name, role }
    leads_created = serializers.IntegerField()
    leads_converted = serializers.IntegerField()
    bookings_created = serializers.IntegerField()
    conversion_rate = serializers.FloatField()
    total_payments = serializers.FloatField()
    recent_activity = RecentActivitySerializer(many=True)
    performance_history = serializers.ListField(child=serializers.DictField())
