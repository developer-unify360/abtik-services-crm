from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from clients.models import Client
from bookings.models import Booking
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
