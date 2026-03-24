from django.core.management.base import BaseCommand
from attributes.models import Industry, LeadSource, PaymentType


class Command(BaseCommand):
    help = 'Seed essential master data for the CRM'

    def handle(self, *args, **options):
        # Lead Sources
        lead_sources = [
            'Website', 'Referral', 'Social Media', 'Advertisement',
            'Walk-in', 'Cold Call', 'Email Campaign', 'Partner',
        ]
        for name in lead_sources:
            obj, created = LeadSource.objects.get_or_create(name=name, defaults={'is_active': True})
            if created:
                self.stdout.write(self.style.SUCCESS(f'  Created LeadSource: {name}'))

        # Industries
        industries = [
            'Technology', 'Manufacturing', 'Services', 'Consulting',
            'Healthcare', 'Education', 'Retail', 'Finance',
            'Real Estate', 'Hospitality', 'Agriculture', 'Other',
        ]
        for name in industries:
            obj, created = Industry.objects.get_or_create(name=name, defaults={'is_active': True})
            if created:
                self.stdout.write(self.style.SUCCESS(f'  Created Industry: {name}'))

        # Payment Types
        payment_types = [
            'New Payment', 'Renewal', 'Advance', 'Full Payment', 'EMI',
        ]
        for name in payment_types:
            obj, created = PaymentType.objects.get_or_create(name=name, defaults={'is_active': True})
            if created:
                self.stdout.write(self.style.SUCCESS(f'  Created PaymentType: {name}'))

        self.stdout.write(self.style.SUCCESS('Seed data complete.'))
