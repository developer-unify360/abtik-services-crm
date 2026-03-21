from core.models import BaseModel
from django.db import transaction

class LeadService:
    @staticmethod
    @transaction.atomic
    def ensure_lead_exists(client, user=None, source=None):
        """
        Ensure a lead record exists for a client.
        If lead already exists, updates status if it was closed/lost (optional).
        """
        from leads.models import Lead, LeadActivity
        
        lead, created = Lead.objects.get_or_create(
            client=client,
            defaults={
                'source': source if source else 'other',
                'status': 'new',
                'assigned_to': user if (user and not user.is_anonymous) else None
            }
        )
        
        if created:
            LeadActivity.objects.create(
                lead=lead,
                activity_type='note',
                description='Lead automatically created from client profile.',
                performed_by=user if (user and not user.is_anonymous) else None
            )
        elif source and lead.source != source:
            lead.source = source
            lead.save()
            
        return lead
