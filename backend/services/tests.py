from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from clients.models import Client
from bookings.models import Booking
from services.models import Service, ServiceRequest
from datetime import date


class ServicesModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='manager@test.com',
            email='manager@test.com',
            password='testpass',
            name='Test Manager',
        )
        self.client_record = Client.objects.create(
            client_name='Test Client',
            company_name='Test Corp',
            email='test@test.com',
            mobile='9999999999',
            created_by=self.user,
        )
        self.booking = Booking.objects.create(
            client=self.client_record,
            booking_date=date.today(),
            status='pending',
        )

    def test_create_service(self):
        service = Service.objects.create(name='Website Development')
        self.assertEqual(service.name, 'Website Development')

    def test_create_service_request(self):
        service = Service.objects.create(name='SEO')
        request = ServiceRequest.objects.create(
            booking=self.booking,
            service=service,
            priority='high',
            status='pending',
        )
        self.assertEqual(request.status, 'pending')
        self.assertEqual(request.priority, 'high')


class ServicesAPITest(TestCase):
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
        self.sales_user = User.objects.create_user(
            username='sales@test.com',
            email='sales@test.com',
            password='testpass',
            name='Sales User',
            role='sales_manager',
        )
        self.client_record = Client.objects.create(
            client_name='Test Client',
            company_name='Test Corp',
            email='test@test.com',
            mobile='9999999999',
            created_by=self.admin_user,
        )
        self.booking = Booking.objects.create(
            client=self.client_record,
            booking_date=date.today(),
        )

    def test_list_services_authenticated(self):
        Service.objects.create(name='SEO')
        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.get('/api/v1/services/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_service_requests(self):
        service = Service.objects.create(name='SEO')
        ServiceRequest.objects.create(
            booking=self.booking,
            service=service,
            status='pending',
        )
        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.get('/api/v1/service-requests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_staff_booking_scoped_list_includes_unassigned_requests(self):
        service = Service.objects.create(name='SEO')
        service_request = ServiceRequest.objects.create(
            booking=self.booking,
            service=service,
            status='pending',
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.sales_user)

        general_response = self.api_client.get('/api/v1/service-requests/')
        self.assertEqual(general_response.status_code, status.HTTP_200_OK)
        self.assertEqual(general_response.data['data'], [])

        booking_response = self.api_client.get(
            '/api/v1/service-requests/',
            {'booking_id': str(self.booking.id)},
        )
        self.assertEqual(booking_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(booking_response.data['data']), 1)
        self.assertEqual(booking_response.data['data'][0]['id'], str(service_request.id))
