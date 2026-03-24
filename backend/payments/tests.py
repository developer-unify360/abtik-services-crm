from datetime import date

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from clients.models import Client
from payments.models import Payment
from users.models import User


class PaymentsAPITest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.admin_user = User.objects.create_user(
            username='payments-admin@test.com',
            email='payments-admin@test.com',
            password='testpass',
            name='Payments Admin',
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

    def test_create_manual_payment(self):
        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            '/api/v1/payments/',
            {
                'client_name': 'Manual Client',
                'company_name': 'Manual Corp',
                'email': 'manual@test.com',
                'mobile': '8888888888',
                'payment_date': str(date.today()),
                'total_payment_amount': '1000.00',
                'received_amount': '400.00',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get(client_name='Manual Client')
        self.assertEqual(payment.source, Payment.SOURCE_MANUAL)
        self.assertEqual(str(payment.remaining_amount), '600.00')

    def test_booking_creation_creates_payment_record(self):
        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            '/api/v1/bookings/',
            {
                'client_id': str(self.client_record.id),
                'booking_date': str(date.today()),
                'payment_date': str(date.today()),
                'total_payment_amount': '1500.00',
                'received_amount': '500.00',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        booking = Booking.objects.get(client=self.client_record)
        payment = Payment.objects.get(booking=booking)
        self.assertEqual(payment.source, Payment.SOURCE_BOOKING)
        self.assertEqual(payment.client, self.client_record)
        self.assertEqual(str(payment.remaining_amount), '1000.00')

    def test_booking_linked_payment_cannot_be_updated_directly(self):
        booking = Booking.objects.create(
            client=self.client_record,
            booking_date=date.today(),
            received_amount='200.00',
        )
        payment = Payment.objects.get(booking=booking)

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.put(
            f'/api/v1/payments/{payment.id}/',
            {'received_amount': '250.00'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
