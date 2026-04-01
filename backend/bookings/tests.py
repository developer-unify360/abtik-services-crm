from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
import json
from users.models import User
from clients.models import Client
from bookings.models import Booking
from leads.models import Lead
from services.models import Service, ServiceRequest
from datetime import date


class BookingModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='bde@test.com',
            email='bde@test.com',
            password='testpass',
            name='Test BDE',
        )
        self.client_record = Client.objects.create(
            client_name='Test Client',
            company_name='Test Corp',
            email='test@test.com',
            mobile='9999999999',
            created_by=self.user,
        )

    def test_create_booking(self):
        booking = Booking.objects.create(
            client=self.client_record,
            bde_name=self.user.name,
            booking_date=date.today(),
            status='pending',
        )
        self.assertEqual(booking.status, 'pending')
        self.assertEqual(booking.client, self.client_record)
        self.assertIsNotNone(booking.id)

    def test_booking_status_update(self):
        booking = Booking.objects.create(
            client=self.client_record,
            bde_name=self.user.name,
            booking_date=date.today(),
            status='pending',
        )
        booking.status = 'confirmed'
        booking.save()
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'confirmed')


class BookingAPITest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin@test.com',
            email='admin@test.com',
            password='testpass',
            name='Admin',
            is_staff=True,
            is_superuser=True,
        )
        self.client_record = Client.objects.create(
            client_name='Test Client',
            company_name='Test Corp',
            email='test@test.com',
            mobile='9999999999',
            created_by=self.admin_user,
        )

    def test_list_bookings_unauthenticated(self):
        response = self.api_client.get('/api/v1/bookings/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_bookings_authenticated(self):
        Booking.objects.create(
            client=self.client_record,
            bde_name=self.admin_user.name,
            booking_date=date.today(),
        )
        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.get('/api/v1/bookings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_bde_form_create_accepts_validated_service_instance_and_syncs_lead(self):
        service = Service.objects.create(name='Certificate & Licence')

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            '/api/v1/bookings/bde-form/',
            data={
                'client': json.dumps({
                    'client_name': 'Lead Client',
                    'company_name': 'Lead Corp',
                    'email': 'lead@test.com',
                    'mobile': '8888888888',
                }),
                'booking': json.dumps({
                    'bde_name': self.admin_user.name,
                    'booking_date': str(date.today()),
                }),
                'service_request': json.dumps({
                    'service': str(service.id),
                    'priority': 'medium',
                }),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        booking = Booking.objects.get(client__email='lead@test.com')
        service_request = ServiceRequest.objects.get(booking=booking)
        lead = Lead.objects.get(client=booking.client)

        self.assertEqual(service_request.service, service)
        self.assertEqual(lead.service, service)

    def test_bde_form_create_accepts_multiple_services_and_creates_multiple_requests(self):
        primary_service = Service.objects.create(name='Certificate & Licence')
        secondary_service = Service.objects.create(name='GST Filing')

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            '/api/v1/bookings/bde-form/',
            data={
                'client': json.dumps({
                    'client_name': 'Bundle Client',
                    'company_name': 'Bundle Corp',
                    'email': 'bundle@test.com',
                    'mobile': '6666666666',
                }),
                'booking': json.dumps({
                    'bde_name': self.admin_user.name,
                    'booking_date': str(date.today()),
                }),
                'service_request': json.dumps({
                    'services': [str(primary_service.id), str(secondary_service.id)],
                    'priority': 'high',
                }),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        booking = Booking.objects.get(client__email='bundle@test.com')
        lead = Lead.objects.get(client=booking.client)
        service_requests = list(ServiceRequest.objects.filter(booking=booking).order_by('created_at'))

        self.assertEqual(len(service_requests), 2)
        self.assertCountEqual(
            [service_request.service for service_request in service_requests],
            [primary_service, secondary_service],
        )
        self.assertEqual(lead.service, primary_service)
        self.assertEqual(len(response.data['data']['service_requests']), 2)

    def test_bde_form_create_requires_at_least_one_service(self):
        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            '/api/v1/bookings/bde-form/',
            data={
                'client': json.dumps({
                    'client_name': 'No Service Client',
                    'company_name': 'No Service Corp',
                    'email': 'noservice@test.com',
                    'mobile': '6655443322',
                }),
                'booking': json.dumps({
                    'bde_name': self.admin_user.name,
                    'booking_date': str(date.today()),
                }),
                'service_request': json.dumps({}),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('At least one service must be selected', response.data['error']['message'])

    def test_bde_form_create_updates_existing_lead_service_on_conversion(self):
        existing_lead = Lead.objects.create(
            client=None,
            client_name='Existing Lead',
            company_name='Existing Corp',
            email='existing@test.com',
            mobile='7777777777',
            status='qualified',
        )
        service = Service.objects.create(name='Certificate & Licence')

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            '/api/v1/bookings/bde-form/',
            data={
                'client': json.dumps({
                    'client_name': 'Existing Lead',
                    'company_name': 'Existing Corp',
                    'email': 'existing@test.com',
                    'mobile': '7777777777',
                }),
                'booking': json.dumps({
                    'bde_name': self.admin_user.name,
                    'booking_date': str(date.today()),
                    'lead_id': str(existing_lead.id),
                }),
                'service_request': json.dumps({
                    'service': str(service.id),
                    'priority': 'medium',
                }),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        existing_lead.refresh_from_db()
        self.assertIsNotNone(existing_lead.client)
        self.assertEqual(existing_lead.status, 'closed_won')
        self.assertEqual(existing_lead.service, service)

    def test_bde_form_update_syncs_multiple_service_requests(self):
        original_service = Service.objects.create(name='Original Service')
        replacement_service = Service.objects.create(name='Replacement Service')
        additional_service = Service.objects.create(name='Additional Service')
        booking = Booking.objects.create(
            client=self.client_record,
            bde_name=self.admin_user.name,
            booking_date=date.today(),
        )
        existing_request = ServiceRequest.objects.create(
            booking=booking,
            service=original_service,
            created_by=self.admin_user,
            priority='medium',
        )

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.put(
            f'/api/v1/bookings/{booking.id}/bde-form/',
            data={
                'client': json.dumps({
                    'client_name': self.client_record.client_name,
                    'company_name': self.client_record.company_name,
                    'email': self.client_record.email,
                    'mobile': self.client_record.mobile,
                }),
                'booking': json.dumps({
                    'bde_name': self.admin_user.name,
                    'booking_date': str(booking.booking_date),
                }),
                'service_request': json.dumps({
                    'services': [str(replacement_service.id), str(additional_service.id)],
                    'priority': 'high',
                }),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        booking.refresh_from_db()
        synced_requests = list(ServiceRequest.objects.filter(booking=booking).order_by('created_at'))
        self.assertEqual(len(synced_requests), 2)
        self.assertCountEqual(
            [service_request.service for service_request in synced_requests],
            [replacement_service, additional_service],
        )
        self.assertFalse(ServiceRequest.objects.filter(id=existing_request.id).exists())
        self.assertTrue(all(service_request.priority == 'high' for service_request in synced_requests))
        self.assertEqual(len(response.data['data']['service_requests']), 2)
