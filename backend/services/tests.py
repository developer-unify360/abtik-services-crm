from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
import json
from users.models import User
from clients.models import Client
from bookings.models import Booking
from services.models import ClientDocumentPortal, ClientDocumentSubmission, Service, ServiceRequest
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

    def test_delivery_board_lists_unassigned_requests_for_authenticated_users(self):
        service = Service.objects.create(name='SEO')
        service_request = ServiceRequest.objects.create(
            booking=self.booking,
            service=service,
            status='pending',
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.sales_user)
        response = self.api_client.get('/api/v1/service-requests/delivery-board/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['id'], str(service_request.id))

    def test_handoff_must_be_accepted_before_fulfillment_can_start(self):
        service = Service.objects.create(name='SEO')
        service_request = ServiceRequest.objects.create(
            booking=self.booking,
            service=service,
            status='pending',
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.patch(
            f'/api/v1/service-requests/{service_request.id}/status/',
            data={'status': 'in_progress'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('accepted before fulfillment can start', response.data['error']['message'])

    def test_handoff_can_be_saved_submitted_and_accepted(self):
        service = Service.objects.create(name='GST Filing')
        service_request = ServiceRequest.objects.create(
            booking=self.booking,
            service=service,
            status='pending',
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.admin_user)

        save_response = self.api_client.patch(
            f'/api/v1/service-requests/{service_request.id}/handoff/',
            data={
                'handoff_note': 'Client expects kickoff on the same week.',
                'service_scope': 'GST registration and first return filing.',
                'promised_timeline': 'Within 7 business days',
                'client_primary_contact': 'Riya Sharma | +91 9999999999 | riya@example.com',
                'documents_received': 'PAN card, Aadhaar, incorporation certificate',
                'dependencies_blockers': 'Waiting on latest electricity bill copy',
                'payment_visibility_summary': '50% received, 50% due on filing completion',
            },
            format='json',
        )
        self.assertEqual(save_response.status_code, status.HTTP_200_OK)
        self.assertTrue(save_response.data['data']['handoff_is_complete'])

        submit_response = self.api_client.post(
            f'/api/v1/service-requests/{service_request.id}/submit-handoff/',
            format='json',
        )
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_response.data['data']['handoff_status'], 'submitted')

        review_response = self.api_client.post(
            f'/api/v1/service-requests/{service_request.id}/review-handoff/',
            data={'decision': 'accepted'},
            format='json',
        )
        self.assertEqual(review_response.status_code, status.HTTP_200_OK)
        self.assertEqual(review_response.data['data']['handoff_status'], 'accepted')

        status_response = self.api_client.patch(
            f'/api/v1/service-requests/{service_request.id}/status/',
            data={'status': 'assigned'},
            format='json',
        )
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)

        service_request.refresh_from_db()
        self.assertEqual(service_request.handoff_status, 'accepted')
        self.assertEqual(service_request.status, 'assigned')

    def test_closed_execution_request_rejects_handoff_updates(self):
        service = Service.objects.create(name='GST Filing')
        service_request = ServiceRequest.objects.create(
            booking=self.booking,
            service=service,
            status='closed',
            handoff_note='Existing locked note',
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.patch(
            f'/api/v1/service-requests/{service_request.id}/handoff/',
            data={'handoff_note': 'Updated after close'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be edited', response.data['error']['message'])

        service_request.refresh_from_db()
        self.assertEqual(service_request.handoff_note, 'Existing locked note')

    def test_closed_execution_request_rejects_assignment_changes(self):
        service = Service.objects.create(name='GST Filing')
        service_request = ServiceRequest.objects.create(
            booking=self.booking,
            service=service,
            status='closed',
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.put(
            f'/api/v1/service-requests/{service_request.id}/assign/',
            data={'assigned_to': str(self.sales_user.id)},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be edited', response.data['error']['message'])

        service_request.refresh_from_db()
        self.assertIsNone(service_request.assigned_to)

    def test_closed_execution_request_rejects_handoff_review(self):
        service = Service.objects.create(name='GST Filing')
        service_request = ServiceRequest.objects.create(
            booking=self.booking,
            service=service,
            status='closed',
            handoff_status='submitted',
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.post(
            f'/api/v1/service-requests/{service_request.id}/review-handoff/',
            data={'decision': 'accepted'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be edited', response.data['error']['message'])

        service_request.refresh_from_db()
        self.assertEqual(service_request.handoff_status, 'submitted')

    def test_booking_is_marked_completed_when_execution_status_is_completed(self):
        service = Service.objects.create(name='GST Filing')
        service_request = ServiceRequest.objects.create(
            booking=self.booking,
            service=service,
            status='in_progress',
            handoff_status='accepted',
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.admin_user)
        response = self.api_client.patch(
            f'/api/v1/service-requests/{service_request.id}/status/',
            data={'status': 'completed'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        service_request.refresh_from_db()
        self.assertEqual(service_request.status, 'completed')
        self.assertEqual(self.booking.status, 'completed')

    def test_booking_waits_for_all_execution_requests_to_finish_before_completing(self):
        primary_service = Service.objects.create(name='GST Filing')
        secondary_service = Service.objects.create(name='Trademark Filing')
        primary_request = ServiceRequest.objects.create(
            booking=self.booking,
            service=primary_service,
            status='assigned',
            handoff_status='accepted',
            created_by=self.admin_user,
        )
        secondary_request = ServiceRequest.objects.create(
            booking=self.booking,
            service=secondary_service,
            status='pending',
            created_by=self.admin_user,
        )

        self.api_client.force_authenticate(user=self.admin_user)

        first_response = self.api_client.patch(
            f'/api/v1/service-requests/{primary_request.id}/status/',
            data={'status': 'closed'},
            format='json',
        )
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'pending')

        second_response = self.api_client.patch(
            f'/api/v1/service-requests/{secondary_request.id}/status/',
            data={'status': 'closed'},
            format='json',
        )
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, 'completed')

    def test_document_portal_can_collect_public_uploads(self):
        self.api_client.force_authenticate(user=self.admin_user)

        portal_response = self.api_client.post(
            '/api/v1/document-portals/',
            data={
                'client': str(self.client_record.id),
                'title': 'Test Client Uploads',
                'instructions': 'Upload the onboarding documents here.',
                'is_active': True,
                'requirements': [
                    {
                        'label': 'PAN Card',
                        'description': 'Company PAN copy',
                        'is_required': True,
                        'sort_order': 0,
                    },
                    {
                        'label': 'Electricity Bill',
                        'description': 'Latest office bill',
                        'is_required': True,
                        'sort_order': 1,
                    },
                ],
            },
            format='json',
        )

        self.assertEqual(portal_response.status_code, status.HTTP_201_CREATED)
        portal_id = portal_response.data['data']['id']
        token = portal_response.data['data']['token']
        requirement_id = portal_response.data['data']['requirements'][0]['id']
        self.assertTrue(ClientDocumentPortal.objects.filter(id=portal_id).exists())

        public_detail_response = self.api_client.get(f'/api/v1/document-portals/public/{token}/')
        self.assertEqual(public_detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(public_detail_response.data['data']['requirements']), 2)

        original_filename = f"MukeshAmbani_interactions_{'x' * 180}.pdf"
        upload_response = self.api_client.post(
            f'/api/v1/document-portals/public/{token}/submit/',
            data={
                'payload': json.dumps({
                    'submitted_by_name': 'Riya Sharma',
                    'submitted_by_email': 'riya@example.com',
                    'documents': [
                        {
                            'requirement_id': requirement_id,
                            'document_name': 'PAN Card',
                            'note': 'Signed copy attached',
                            'file_key': 'pan_file',
                        },
                    ],
                }),
                'pan_file': SimpleUploadedFile(
                    original_filename,
                    b'pdf-content',
                    content_type='application/pdf',
                ),
            },
        )

        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(upload_response.data['data']), 1)
        submission = ClientDocumentSubmission.objects.get(portal_id=portal_id)
        self.assertTrue(submission.file.name.endswith('.pdf'))
        self.assertLessEqual(len(submission.file.name), 255)
        self.assertGreaterEqual(ClientDocumentSubmission._meta.get_field('file').max_length, 255)

        submissions_response = self.api_client.get('/api/v1/document-submissions/')
        self.assertEqual(submissions_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(submissions_response.data['data']), 1)
