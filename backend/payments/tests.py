import json
from datetime import date

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from clients.models import Client
from payments.models import Payment
from services.models import Service, ServiceRequest
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

    def test_booking_creation_with_explicit_payments_syncs_payload(self):
        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            '/api/v1/bookings/',
            {
                'client_id': str(self.client_record.id),
                'booking_date': str(date.today()),
                'payments': [
                    {
                        'payment_date': str(date.today()),
                        'total_payment_amount': '900.00',
                        'received_amount': '400.00',
                    }
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        booking = Booking.objects.get(client=self.client_record)
        payments = list(Payment.objects.filter(booking=booking))

        self.assertEqual(len(payments), 1)
        self.assertEqual(str(payments[0].total_payment_amount), '900.00')
        self.assertEqual(str(payments[0].remaining_amount), '500.00')

    def test_create_booking_linked_payment_for_single_service(self):
        booking = Booking.objects.create(
            client=self.client_record,
            booking_date=date.today(),
        )
        service = Service.objects.create(name='GST Filing')
        ServiceRequest.objects.create(
            booking=booking,
            service=service,
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            '/api/v1/payments/',
            {
                'client_id': str(self.client_record.id),
                'booking_id': str(booking.id),
                'services': [str(service.id)],
                'payment_date': str(date.today()),
                'total_payment_amount': '1200.00',
                'received_amount': '700.00',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        linked_payment = Payment.objects.get(booking=booking, services=service)
        self.assertEqual(linked_payment.source, Payment.SOURCE_BOOKING)
        self.assertEqual(linked_payment.client, self.client_record)
        self.assertEqual(str(linked_payment.remaining_amount), '500.00')

        booking_response = self.api_client.get(f'/api/v1/bookings/{booking.id}/')
        self.assertEqual(booking_response.status_code, status.HTTP_200_OK)
        matching_payment = next(
            payment for payment in booking_response.data['payments']
            if payment['id'] == str(linked_payment.id)
        )
        self.assertEqual(matching_payment['services'], [str(service.id)])

    def test_create_booking_linked_payment_for_catalog_service_adds_service_request(self):
        booking = Booking.objects.create(
            client=self.client_record,
            booking_date=date.today(),
        )
        pending_service = Service.objects.create(name='GST Filing')
        newly_selected_service = Service.objects.create(name='Trademark Registration')
        ServiceRequest.objects.create(
            booking=booking,
            service=pending_service,
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            '/api/v1/payments/',
            {
                'client_id': str(self.client_record.id),
                'booking_id': str(booking.id),
                'services': [str(newly_selected_service.id)],
                'payment_date': str(date.today()),
                'total_payment_amount': '800.00',
                'received_amount': '300.00',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ServiceRequest.objects.filter(booking=booking, service=newly_selected_service).exists())

        service_request_response = self.api_client.get(
            '/api/v1/service-requests/',
            {'booking_id': str(booking.id)},
        )
        self.assertEqual(service_request_response.status_code, status.HTTP_200_OK)
        response_service_ids = {item['service'] for item in service_request_response.data['data']}
        self.assertEqual(
            response_service_ids,
            {str(pending_service.id), str(newly_selected_service.id)},
        )

    def test_bde_form_create_without_explicit_payments_keeps_summary_payment(self):
        service = Service.objects.create(name='GST Filing')

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            '/api/v1/bookings/bde-form/',
            data={
                'client': json.dumps({
                    'client_name': 'Payment Summary Client',
                    'company_name': 'Payment Summary Corp',
                    'email': 'paymentsummary@test.com',
                    'mobile': '8888888888',
                }),
                'booking': json.dumps({
                    'bde_name': self.admin_user.name,
                    'booking_date': str(date.today()),
                    'payment_date': str(date.today()),
                    'total_payment_amount': '1500.00',
                    'received_amount': '500.00',
                }),
                'service_request': json.dumps({
                    'service': str(service.id),
                    'priority': 'medium',
                }),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        booking = Booking.objects.get(client__email='paymentsummary@test.com')
        payments = list(Payment.objects.filter(booking=booking))

        self.assertEqual(len(payments), 1)
        self.assertEqual(payments[0].source, Payment.SOURCE_BOOKING)
        self.assertEqual(str(payments[0].remaining_amount), '1000.00')

    def test_booking_save_with_multiple_booking_payments_skips_single_payment_sync(self):
        booking = Booking.objects.create(
            client=self.client_record,
            booking_date=date.today(),
            total_payment_amount='1000.00',
            received_amount='200.00',
        )

        Payment.objects.create(
            booking=booking,
            source=Payment.SOURCE_BOOKING,
            client=self.client_record,
            client_name=self.client_record.client_name,
            company_name=self.client_record.company_name,
            email=self.client_record.email,
            mobile=self.client_record.mobile,
            received_amount='300.00',
        )

        booking.received_amount = '250.00'
        booking.save()

        self.assertEqual(Payment.objects.filter(booking=booking).count(), 2)

    def test_booking_update_can_edit_existing_booking_linked_payment(self):
        booking = Booking.objects.create(
            client=self.client_record,
            booking_date=date.today(),
        )
        service = Service.objects.create(name='GST Filing')
        payment = Payment.objects.create(
            booking=booking,
            source=Payment.SOURCE_BOOKING,
            client=self.client_record,
            client_name=self.client_record.client_name,
            company_name=self.client_record.company_name,
            email=self.client_record.email,
            mobile=self.client_record.mobile,
            payment_date=date.today(),
            total_payment_amount='1000.00',
            received_amount='400.00',
            remaining_amount='600.00',
        )
        payment.services.set([service.id])

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.put(
            f'/api/v1/bookings/{booking.id}/',
            {
                'payments': [
                    {
                        'id': str(payment.id),
                        'payment_date': str(date.today()),
                        'total_payment_amount': '1200.00',
                        'received_amount': '700.00',
                        'remaining_amount': '500.00',
                        'services': [str(service.id)],
                    }
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(str(payment.total_payment_amount), '1200.00')
        self.assertEqual(str(payment.received_amount), '700.00')
        self.assertEqual(str(payment.remaining_amount), '500.00')

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
