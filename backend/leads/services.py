from core.models import BaseModel
from django.db import transaction
from leads.models import Lead, LeadActivity

class LeadService:
    @staticmethod
    @transaction.atomic
    def ensure_lead_exists(client, user=None, source=None, bde_name=None, industry=None, service=None, status=None):
        """
        Ensure a lead record exists for a client.
        If lead already exists, updates status if it was closed/lost (optional).
        """        
        if industry is None and client and client.industry:
            industry = client.industry
        
        lead_status = status if status else 'new'
        
        defaults = {
            'source': source if source else None,
            'status': lead_status,
            'assigned_to': user if (user and not user.is_anonymous) else None,
        }
        
        if client:
            defaults.update({
                'client_name': client.client_name,
                'company_name': client.company_name,
                'email': client.email,
                'mobile': client.mobile,
            })
        
        if bde_name:
            defaults['bde_name'] = bde_name
        if industry:
            defaults['industry'] = industry
        if service:
            defaults['service'] = service
        
        
        lead, created = Lead.objects.get_or_create(
            client=client,
            defaults=defaults
        )
        
        
        if created:
            LeadActivity.objects.create(
                lead=lead,
                activity_type='note',
                description='Lead automatically created from client profile.' if lead_status != 'closed_won' else 'Lead automatically created from booking (Closed Won).',
                performed_by=user if (user and not user.is_anonymous) else None
            )
        else:
            update_fields = []
            if source and lead.source != source:
                lead.source = source
                update_fields.append('source')
            if bde_name and lead.bde_name != bde_name:
                lead.bde_name = bde_name
                update_fields.append('bde_name')
            if industry and lead.industry != industry:
                lead.industry = industry
                update_fields.append('industry')
            if service and lead.service != service:
                lead.service = service
                update_fields.append('service')
            
            if client:
                if lead.client_name != client.client_name:
                    lead.client_name = client.client_name
                    update_fields.append('client_name')
                if lead.company_name != client.company_name:
                    lead.company_name = client.company_name
                    update_fields.append('company_name')
                if lead.email != client.email:
                    lead.email = client.email
                    update_fields.append('email')
                if lead.mobile != client.mobile:
                    lead.mobile = client.mobile
                    update_fields.append('mobile')

            if status and lead.status != status:
                old_status = lead.get_status_display()
                lead.status = status
                lead.save()
                LeadActivity.objects.create(
                    lead=lead,
                    activity_type='status_change',
                    description=f'Status changed from "{old_status}" to "{lead.get_status_display()}" (booking created)',
                    performed_by=user if (user and not user.is_anonymous) else None
                )
            elif update_fields:
                lead.save(update_fields=update_fields)
            
        return lead
