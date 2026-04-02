from rest_framework import serializers

class SummaryCountSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    name = serializers.CharField()
    count = serializers.IntegerField()

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
    recent_activity = RecentActivitySerializer(many=True)
    performance_history = serializers.ListField(child=serializers.DictField())
