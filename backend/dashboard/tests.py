from datetime import date
from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from clients.models import Client
from leads.models import Lead
from payments.models import Payment
from services.models import Service
from users.models import User


class DashboardOverviewAPITest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin_user = User.objects.create_user(
            username='dashboard-admin@test.com',
            email='dashboard-admin@test.com',
            password='testpass',
            name='Dashboard Admin',
            role='admin',
            is_staff=True,
        )
        self.bde_one = User.objects.create_user(
            username='bde-one@test.com',
            email='bde-one@test.com',
            password='testpass',
            name='BDE One',
            role='bde',
        )
        self.bde_two = User.objects.create_user(
            username='bde-two@test.com',
            email='bde-two@test.com',
            password='testpass',
            name='BDE Two',
            role='bde',
        )
        self.bdm_one = User.objects.create_user(
            username='bdm-one@test.com',
            email='bdm-one@test.com',
            password='testpass',
            name='BDM One',
            role='sales_manager',
        )
        self.bdm_two = User.objects.create_user(
            username='bdm-two@test.com',
            email='bdm-two@test.com',
            password='testpass',
            name='BDM Two',
            role='sales_manager',
        )
        self.client_record = Client.objects.create(
            client_name='Dashboard Client',
            company_name='Dashboard Corp',
            email='dashboard@test.com',
            mobile='9999999999',
            created_by=self.admin_user,
        )
        self.gst_service = Service.objects.create(name='GST Filing')
        self.trademark_service = Service.objects.create(name='Trademark Registration')

    def create_booking_flow(self, *, index, bde_user, bdm_user, service, received_amount, booking_status):
        booking = Booking.objects.create(
            client=self.client_record,
            booking_date=date.today(),
            status=booking_status,
        )
        lead = Lead.objects.create(
            client=self.client_record,
            client_name=f'Lead {index}',
            company_name=f'Company {index}',
            email=f'lead{index}@test.com',
            mobile=f'90000000{index}',
            created_by=bde_user,
            assigned_to=bdm_user,
            status='closed_won',
            converted_booking=booking,
        )
        payment = Payment.objects.create(
            booking=booking,
            client=self.client_record,
            source=Payment.SOURCE_BOOKING,
            payment_date=date.today(),
            total_payment_amount=received_amount,
            received_amount=received_amount,
            remaining_amount=Decimal('0.00'),
        )
        payment.services.set([service])
        return booking, lead, payment

    def test_overview_returns_service_revenue_and_rankings(self):
        self.create_booking_flow(
            index=1,
            bde_user=self.bde_one,
            bdm_user=self.bdm_one,
            service=self.gst_service,
            received_amount=Decimal('700.00'),
            booking_status='completed',
        )
        self.create_booking_flow(
            index=2,
            bde_user=self.bde_one,
            bdm_user=self.bdm_one,
            service=self.trademark_service,
            received_amount=Decimal('300.00'),
            booking_status='pending',
        )
        self.create_booking_flow(
            index=3,
            bde_user=self.bde_two,
            bdm_user=self.bdm_two,
            service=self.gst_service,
            received_amount=Decimal('500.00'),
            booking_status='completed',
        )
        Lead.objects.create(
            client=self.client_record,
            client_name='Lead 4',
            company_name='Company 4',
            email='lead4@test.com',
            mobile='9000000004',
            created_by=self.bde_one,
            assigned_to=self.bdm_two,
            status='new',
        )

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.get('/api/v1/dashboard/overview/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['total_clients'], 1)
        self.assertEqual(response.data['summary']['total_bookings'], 3)
        self.assertEqual(response.data['summary']['pending_bookings'], 1)
        self.assertEqual(response.data['summary']['completed_bookings'], 2)
        self.assertEqual(response.data['summary']['today_leads'], 4)
        self.assertEqual(response.data['summary']['today_bookings'], 3)
        self.assertEqual(response.data['summary']['total_collections'], 1500.0)

        service_revenue = response.data['service_revenue']
        self.assertEqual(service_revenue[0]['name'], 'GST Filing')
        self.assertEqual(service_revenue[0]['revenue'], 1200.0)
        self.assertEqual(service_revenue[0]['payments_count'], 2)
        self.assertEqual(service_revenue[1]['name'], 'Trademark Registration')
        self.assertEqual(service_revenue[1]['revenue'], 300.0)

        bde_performance = response.data['bde_performance']
        self.assertEqual(bde_performance[0]['name'], 'BDE One')
        self.assertEqual(bde_performance[0]['lead_count'], 3)
        self.assertEqual(bde_performance[0]['won_count'], 2)
        self.assertEqual(bde_performance[1]['name'], 'BDE Two')
        self.assertEqual(bde_performance[1]['lead_count'], 1)

        bdm_performance = response.data['bdm_performance']
        self.assertEqual(bdm_performance[0]['name'], 'BDM One')
        self.assertEqual(bdm_performance[0]['revenue'], 1000.0)
        self.assertEqual(bdm_performance[0]['bookings_count'], 2)
        self.assertEqual(bdm_performance[0]['payments_count'], 2)
        self.assertEqual(bdm_performance[1]['name'], 'BDM Two')
        self.assertEqual(bdm_performance[1]['revenue'], 500.0)
