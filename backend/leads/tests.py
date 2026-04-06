from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from clients.models import Client
from leads.models import Lead
from users.models import User


class LeadAPITest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin@test.com',
            email='admin@test.com',
            password='testpass',
            name='Admin User',
            role='admin',
            is_staff=True,
            is_superuser=True,
        )
        self.other_user = User.objects.create_user(
            username='sales@test.com',
            email='sales@test.com',
            password='testpass',
            name='Sales User',
            role='sales_manager',
        )

    def create_lead(self, index: int, **overrides):
        defaults = {
            'client': None,
            'client_name': f'Lead {index}',
            'company_name': f'Company {index}',
            'email': f'lead{index}@test.com',
            'mobile': f'9{index:09d}',
            'created_by': self.admin_user,
            'status': 'new',
        }
        defaults.update(overrides)
        return Lead.objects.create(**defaults)

    def test_lead_list_uses_ten_item_pages_by_default(self):
        for index in range(15):
            self.create_lead(index)

        self.api_client.force_authenticate(user=self.admin_user)

        first_page = self.api_client.get('/api/v1/leads/')
        self.assertEqual(first_page.status_code, status.HTTP_200_OK)
        self.assertEqual(first_page.data['count'], 15)
        self.assertEqual(len(first_page.data['results']), 10)
        self.assertIsNotNone(first_page.data['next'])

        second_page = self.api_client.get('/api/v1/leads/', {'page': 2})
        self.assertEqual(second_page.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second_page.data['results']), 5)
        self.assertIsNotNone(second_page.data['previous'])

    def test_lead_list_tab_filters_are_applied_server_side(self):
        unassigned_lead = self.create_lead(1)
        assigned_lead = self.create_lead(2, assigned_to=self.admin_user)
        overdue_lead = self.create_lead(
            3,
            assigned_to=self.other_user,
            next_follow_up_date=timezone.localdate() - timedelta(days=1),
        )
        self.create_lead(
            4,
            next_follow_up_date=timezone.localdate() - timedelta(days=1),
            status='closed_won',
        )

        self.api_client.force_authenticate(user=self.admin_user)

        unassigned_response = self.api_client.get('/api/v1/leads/', {'tab': 'unassigned'})
        self.assertEqual(unassigned_response.status_code, status.HTTP_200_OK)
        self.assertEqual(unassigned_response.data['count'], 2)
        self.assertIn(str(unassigned_lead.id), {lead['id'] for lead in unassigned_response.data['results']})

        my_response = self.api_client.get('/api/v1/leads/', {'tab': 'my'})
        self.assertEqual(my_response.status_code, status.HTTP_200_OK)
        self.assertEqual(my_response.data['count'], 1)
        self.assertEqual(my_response.data['results'][0]['id'], str(assigned_lead.id))

        overdue_response = self.api_client.get('/api/v1/leads/', {'tab': 'overdue'})
        self.assertEqual(overdue_response.status_code, status.HTTP_200_OK)
        self.assertEqual(overdue_response.data['count'], 1)
        self.assertEqual(overdue_response.data['results'][0]['id'], str(overdue_lead.id))

    def test_lead_list_search_matches_linked_client_fields(self):
        linked_client = Client.objects.create(
            client_name='Linked Client',
            company_name='Linked Company',
            email='linked@test.com',
            mobile='9876543210',
            created_by=self.admin_user,
        )
        linked_lead = self.create_lead(
            5,
            client=linked_client,
            client_name=None,
            company_name=None,
            email=None,
            mobile=None,
        )

        self.api_client.force_authenticate(user=self.admin_user)

        response = self.api_client.get('/api/v1/leads/', {'search': 'Linked Client'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], str(linked_lead.id))
