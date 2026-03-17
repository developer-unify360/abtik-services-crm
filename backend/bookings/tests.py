from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from tenants.models import Tenant
from users.models import User
from roles.models import Role, Permission
from clients.models import Client
from bookings.models import Booking
from datetime import date


class BookingModelTest(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name='Test Org', industry='Tech')
        self.role = Role.objects.create(name='BDE')
        self.user = User.objects.create_user(
            username='bde@test.com', email='bde@test.com', password='testpass',
            name='Test BDE', tenant=self.tenant, role=self.role,
        )
        self.client_record = Client.objects.create(
            tenant=self.tenant, client_name='Test Client',
            company_name='Test Corp', email='test@test.com',
            mobile='9999999999', created_by=self.user,
        )

    def test_create_booking(self):
        booking = Booking.objects.create(
            tenant=self.tenant,
            client=self.client_record,
            bde_user=self.user,
            payment_type='new_payment',
            booking_date=date.today(),
            status='pending',
        )
        self.assertEqual(booking.status, 'pending')
        self.assertEqual(booking.client, self.client_record)
        self.assertIsNotNone(booking.id)

    def test_booking_status_choices(self):
        booking = Booking.objects.create(
            tenant=self.tenant,
            client=self.client_record,
            bde_user=self.user,
            payment_type='new_payment',
            booking_date=date.today(),
            status='pending',
        )
        # Update status
        booking.status = 'confirmed'
        booking.save()
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'confirmed')

    def test_tenant_isolation(self):
        tenant2 = Tenant.objects.create(name='Other Org')
        client2 = Client.objects.create(
            tenant=tenant2, client_name='Other Client',
            company_name='Other Corp', email='other@test.com',
            mobile='8888888888',
        )
        Booking.objects.create(
            tenant=self.tenant, client=self.client_record,
            bde_user=self.user, payment_type='new_payment',
            booking_date=date.today(),
        )
        Booking.objects.create(
            tenant=tenant2, client=client2,
            payment_type='new_payment', booking_date=date.today(),
        )
        # Should only get tenant 1's bookings
        bookings = Booking.tenant_objects.for_tenant(self.tenant.id)
        self.assertEqual(bookings.count(), 1)


class BookingAPITest(TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.tenant = Tenant.objects.create(name='Test Org', industry='Tech')
        
        self.bde_role = Role.objects.create(name='BDE')
        for action in ['create', 'view', 'update']:
            perm, _ = Permission.objects.get_or_create(module='booking', action=action)
            self.bde_role.permissions.add(perm)

        self.bde_user = User.objects.create_user(
            username='bde@test.com', email='bde@test.com', password='testpass',
            name='Test BDE', tenant=self.tenant, role=self.bde_role,
        )
        self.client_record = Client.objects.create(
            tenant=self.tenant, client_name='Test Client',
            company_name='Test Corp', email='test@test.com',
            mobile='9999999999', created_by=self.bde_user,
        )

    def test_create_booking(self):
        self.api_client.force_authenticate(user=self.bde_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        
        data = {
            'client_id': str(self.client_record.id),
            'payment_type': 'new_payment',
            'booking_date': str(date.today()),
            'remarks': 'Initial booking',
        }
        response = self.api_client.post('/api/v1/bookings/', data, format='json')
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

    def test_list_bookings(self):
        Booking.objects.create(
            tenant=self.tenant, client=self.client_record,
            bde_user=self.bde_user, payment_type='new_payment',
            booking_date=date.today(),
        )
        self.api_client.force_authenticate(user=self.bde_user)
        self.api_client.credentials(HTTP_TENANT_ID=str(self.tenant.id))
        
        response = self.api_client.get('/api/v1/bookings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
