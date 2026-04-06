import os
import django
import random
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from leads.models import Lead
from attributes.models import Industry, LeadSource
from services.models import Service
from users.models import User

def seed_leads():
    print("Starting seeding process for Leads...")

    industry_it = Industry.objects.filter(name='IT').first()
    if not industry_it:
        industry_it = Industry.objects.create(name='IT')
        print("Created Industry: IT")

    sources = [
        'Website', 'Google Ads', 'Facebook', 'Instagram', 'LinkedIn',
        'Referral', 'Cold Call', 'Email Campaign', 'Trade Show', 'Webinar'
    ]
    source_objects = []
    for src in sources:
        source_obj, _ = LeadSource.objects.get_or_create(name=src)
        source_objects.append(source_obj)

    services = Service.objects.all()
    if not services.exists():
        print("No services found. Creating sample services...")
        services = [
            Service.objects.create(name='Web Development'),
            Service.objects.create(name='Mobile App'),
            Service.objects.create(name='SEO'),
            Service.objects.create(name='Digital Marketing'),
            Service.objects.create(name='Cloud Services'),
        ]
    service_list = list(services)

    bde_users = User.objects.filter(role='bde')
    bde_names = [f'bde{i}' for i in range(1, 25)]
    bde_name_to_user = {f'bde{i}': None for i in range(1, 25)}

    for bde in bde_users:
        if bde.name in bde_name_to_user:
            bde_name_to_user[bde.name] = bde

    sales_managers = list(User.objects.filter(role='sales_manager'))

    priorities = ['low', 'medium', 'high', 'urgent']
    statuses = ['new']

    base_date = date(2026, 4, 1)

    leads_data = []
    for i in range(1, 51):
        bde_name = f'bde{((i - 1) % 24) + 1}'
        follow_up_day = random.randint(1, 10)
        follow_up_date = date(2026, 4, follow_up_day)

        assigned_sm = random.choice(sales_managers) if sales_managers else None
        
        lead = Lead(
            client_name=f'Company {i}',
            company_name=f'Company {i} Pvt Ltd',
            email=f'company{i}@example.com',
            mobile=f'900000000{i:02d}',
            industry=industry_it,
            bde_name=bde_name,
            created_by=bde_name_to_user.get(bde_name),
            assigned_to=assigned_sm,
            source=random.choice(source_objects),
            status='new',
            priority=random.choice(priorities),
            service=random.choice(service_list),
            next_follow_up_date=follow_up_date,
            notes=f'Lead {i} - Initial contact needed',
        )
        leads_data.append(lead)

    Lead.objects.bulk_create(leads_data)
    print(f"Successfully created 49 leads with varied follow-up dates (1-10 April), BDEs, services, priorities, and sources.")

if __name__ == "__main__":
    seed_leads()
