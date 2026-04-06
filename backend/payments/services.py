from django.core.exceptions import ValidationError
from django.db import models, transaction

from attributes.models import PaymentType
from audit.models import AuditLog
from bookings.models import Bank, Booking
from clients.models import Client
from payments.models import Payment
from services.models import Service


class PaymentService:
    SNAPSHOT_FIELDS = ['client_name', 'company_name', 'gst_pan', 'email', 'mobile']

    @staticmethod
    def _resolve_payment_type(payment_type_id):
        if payment_type_id in [None, '']:
            return None
        try:
            return PaymentType.objects.get(id=payment_type_id)
        except PaymentType.DoesNotExist as exc:
            raise ValidationError({'payment_type': 'Selected payment type was not found.'}) from exc

    @staticmethod
    def _resolve_bank(bank_id):
        if bank_id in [None, '']:
            return None
        try:
            return Bank.objects.get(id=bank_id)
        except Bank.DoesNotExist as exc:
            raise ValidationError({'bank': 'Selected bank account was not found.'}) from exc

    @staticmethod
    def _resolve_client(client_id):
        if client_id in [None, '']:
            return None
        try:
            return Client.objects.get(id=client_id)
        except Client.DoesNotExist as exc:
            raise ValidationError({'client_id': 'Selected client was not found.'}) from exc

    @staticmethod
    def _resolve_booking(booking_id):
        if booking_id in [None, '']:
            return None
        try:
            return Booking.objects.select_related('client').prefetch_related('service_requests').get(id=booking_id)
        except Booking.DoesNotExist as exc:
            raise ValidationError({'booking_id': 'Selected booking was not found.'}) from exc

    @staticmethod
    def _resolve_service(service_id):
        if service_id in [None, '']:
            return None
        try:
            return Service.objects.get(id=service_id)
        except Service.DoesNotExist as exc:
            raise ValidationError({'services': 'Selected service was not found.'}) from exc

    @staticmethod
    def _validate_booking_service_selection(booking, service_ids):
        normalized_service_ids = [
            str(service_id)
            for service_id in (service_ids or [])
            if service_id not in [None, '']
        ]

        if len(normalized_service_ids) != 1:
            raise ValidationError({'services': 'Select exactly one service for this payment.'})

        service = PaymentService._resolve_service(normalized_service_ids[0])

        if booking.payments.filter(services__id=service.id).exists():
            raise ValidationError({'services': 'A payment already exists for the selected booking service.'})

        return service

    @staticmethod
    def _ensure_booking_service_request(booking, service, user):
        existing_request = booking.service_requests.filter(service=service).first()
        if existing_request:
            return existing_request

        from services.services import ServiceRequestService

        return ServiceRequestService.create_request(
            data={
                'booking': booking,
                'service': service,
                'priority': 'medium',
            },
            user=user,
        )

    @staticmethod
    def _resolve_remaining_amount(data, payment=None):
        if 'remaining_amount' in data:
            return data.get('remaining_amount')

        total = data.get('total_payment_amount', getattr(payment, 'total_payment_amount', None) if payment else None)
        received = data.get('received_amount', getattr(payment, 'received_amount', None) if payment else None)

        if total is not None and received is not None:
            return total - received

        return getattr(payment, 'remaining_amount', None) if payment else None

    @staticmethod
    def _client_snapshot(client):
        if not client:
            return {
                'client_name': '',
                'company_name': '',
                'gst_pan': '',
                'email': '',
                'mobile': '',
            }

        return {
            'client_name': client.client_name or '',
            'company_name': client.company_name or '',
            'gst_pan': client.gst_pan or '',
            'email': client.email or '',
            'mobile': client.mobile or '',
        }

    @staticmethod
    def _apply_snapshot(payment, data, client, reset_to_client_defaults=False):
        defaults = PaymentService._client_snapshot(client)
        for field_name in PaymentService.SNAPSHOT_FIELDS:
            if field_name in data:
                setattr(payment, field_name, data[field_name])
                continue

            if reset_to_client_defaults:
                setattr(payment, field_name, defaults[field_name])

    @staticmethod
    def sync_payments(booking, payments_data, user):
        """Sync multiple payments for a booking."""
        existing_payments = {str(p.id): p for p in booking.payments.all()}
        retained_ids = set()
        synced_payments = []
        snapshot = PaymentService._client_snapshot(booking.client)

        for item in payments_data:
            payment_id = str(item.get('id')) if item.get('id') else None
            
            # Resolve services
            service_ids = item.get('services', [])
            
            payload = {
                'source': Payment.SOURCE_BOOKING,
                'booking': booking,
                'client': booking.client,
                **snapshot,
                'payment_type': PaymentService._resolve_payment_type(item.get('payment_type')),
                'bank': PaymentService._resolve_bank(item.get('bank')),
                'reference_number': item.get('reference_number', ''),
                'payment_date': item.get('payment_date'),
                'total_payment_amount': item.get('total_payment_amount'),
                'received_amount': item.get('received_amount'),
                'remaining_amount': PaymentService._resolve_remaining_amount(item),
                'after_fund_disbursement_percentage': item.get('after_fund_disbursement_percentage'),
            }

            if payment_id and payment_id in existing_payments:
                payment = existing_payments[payment_id]
                for key, value in payload.items():
                    setattr(payment, key, value)
                payment.full_clean()
                payment.save()
                retained_ids.add(payment_id)
            else:
                payment = Payment(**payload)
                payment.full_clean()
                payment.save()
            
            # Sync services
            payment.services.set(service_ids or [])
            
            synced_payments.append(payment)

        for pid, p in existing_payments.items():
            if pid not in retained_ids and p.source == Payment.SOURCE_BOOKING:
                p.delete()
        
        return synced_payments

    @staticmethod
    def sync_booking_payment(booking, user=None):
        payment, created = Payment.objects.get_or_create(
            booking=booking,
            defaults={
                'source': Payment.SOURCE_BOOKING,
                'client': booking.client,
            },
        )

        payment.source = Payment.SOURCE_BOOKING
        payment.client = booking.client

        snapshot = PaymentService._client_snapshot(booking.client)
        for field_name, value in snapshot.items():
            setattr(payment, field_name, value)

        payment.payment_type = booking.payment_type
        payment.bank = booking.bank
        payment.payment_date = booking.payment_date
        payment.total_payment_amount = booking.total_payment_amount
        payment.received_amount = booking.received_amount
        payment.remaining_amount = booking.remaining_amount
        payment.after_fund_disbursement_percentage = booking.after_fund_disbursement_percentage
        payment.full_clean()
        payment.save()

        AuditLog.objects.create(
            user=user,
            action='payment.synced_from_booking',
            module='payments',
            details={
                'payment_id': str(payment.id),
                'booking_id': str(booking.id),
                'created': created,
            },
        )

        return payment

    @staticmethod
    def create_payment(data, user):
        booking = PaymentService._resolve_booking(data.get('booking_id'))
        service_ids = data.get('services') or []

        if booking:
            if data.get('client_id') not in [None, ''] and str(data.get('client_id')) != str(booking.client_id):
                raise ValidationError({'client_id': 'Selected client does not match the chosen booking service.'})

            selected_service = PaymentService._validate_booking_service_selection(booking, service_ids)

            with transaction.atomic():
                payment = Payment(
                    source=Payment.SOURCE_BOOKING,
                    booking=booking,
                    client=booking.client,
                    payment_type=PaymentService._resolve_payment_type(data.get('payment_type')),
                    bank=PaymentService._resolve_bank(data.get('bank')),
                    reference_number=data.get('reference_number', ''),
                    payment_date=data.get('payment_date'),
                    total_payment_amount=data.get('total_payment_amount'),
                    received_amount=data.get('received_amount'),
                    remaining_amount=PaymentService._resolve_remaining_amount(data),
                    after_fund_disbursement_percentage=data.get('after_fund_disbursement_percentage'),
                    attachment=data.get('attachment'),
                )
                PaymentService._apply_snapshot(payment, {}, booking.client, reset_to_client_defaults=True)
                payment.full_clean()
                payment.save()
                payment.services.set([selected_service.id])
                PaymentService._ensure_booking_service_request(booking, selected_service, user)

                AuditLog.objects.create(
                    user=user,
                    action='payment.created',
                    module='payments',
                    details={
                        'payment_id': str(payment.id),
                        'source': payment.source,
                        'booking_id': str(payment.booking_id) if payment.booking_id else None,
                    },
                )

            return payment

        if service_ids:
            raise ValidationError({'services': 'Select a booking service from the linked client before saving this payment.'})

        client = PaymentService._resolve_client(data.get('client_id'))
        payment = Payment(
            source=Payment.SOURCE_MANUAL,
            client=client,
            payment_type=PaymentService._resolve_payment_type(data.get('payment_type')),
            bank=PaymentService._resolve_bank(data.get('bank')),
            reference_number=data.get('reference_number', ''),
            payment_date=data.get('payment_date'),
            total_payment_amount=data.get('total_payment_amount'),
            received_amount=data.get('received_amount'),
            remaining_amount=PaymentService._resolve_remaining_amount(data),
            after_fund_disbursement_percentage=data.get('after_fund_disbursement_percentage'),
            attachment=data.get('attachment'),
        )
        PaymentService._apply_snapshot(payment, data, client, reset_to_client_defaults=True)
        payment.full_clean()
        payment.save()

        AuditLog.objects.create(
            user=user,
            action='payment.created',
            module='payments',
            details={
                'payment_id': str(payment.id),
                'source': payment.source,
                'booking_id': str(payment.booking_id) if payment.booking_id else None,
            },
        )

        return payment

    @staticmethod
    def update_payment(payment, data, user):
        if payment.source != Payment.SOURCE_MANUAL:
            raise ValidationError({'payment': 'Booking-linked payments can only be changed from the booking form.'})

        if data.get('booking_id') or data.get('services'):
            raise ValidationError({'payment': 'Use the booking form to manage booking-linked service payments.'})

        updated_fields = []

        if 'client_id' in data:
            payment.client = PaymentService._resolve_client(data.get('client_id'))
            updated_fields.append('client')
            PaymentService._apply_snapshot(payment, data, payment.client, reset_to_client_defaults=True)
            updated_fields.extend([field for field in PaymentService.SNAPSHOT_FIELDS if field in data or payment.client])
        else:
            for field_name in PaymentService.SNAPSHOT_FIELDS:
                if field_name in data:
                    setattr(payment, field_name, data[field_name])
                    updated_fields.append(field_name)

        if 'payment_type' in data:
            payment.payment_type = PaymentService._resolve_payment_type(data.get('payment_type'))
            updated_fields.append('payment_type')

        if 'bank' in data:
            payment.bank = PaymentService._resolve_bank(data.get('bank'))
            updated_fields.append('bank')

        updatable_fields = [
            'reference_number',
            'payment_date',
            'total_payment_amount',
            'received_amount',
            'remaining_amount',
            'after_fund_disbursement_percentage',
        ]
        for field_name in updatable_fields:
            if field_name in data:
                setattr(payment, field_name, data[field_name])
                updated_fields.append(field_name)

        if 'total_payment_amount' in data or 'received_amount' in data or 'remaining_amount' in data:
            payment.remaining_amount = PaymentService._resolve_remaining_amount(data, payment)
            if 'remaining_amount' not in updated_fields:
                updated_fields.append('remaining_amount')

        if data.get('remove_attachment'):
            if payment.attachment:
                payment.attachment.delete(save=False)
            payment.attachment = None
            updated_fields.append('attachment')

        if 'attachment' in data and data['attachment']:
            if payment.attachment:
                payment.attachment.delete(save=False)
            payment.attachment = data['attachment']
            updated_fields.append('attachment')

        payment.full_clean()
        payment.save()

        AuditLog.objects.create(
            user=user,
            action='payment.updated',
            module='payments',
            details={'payment_id': str(payment.id), 'updated_fields': updated_fields},
        )

        return payment

    @staticmethod
    def list_payments(filters=None):
        queryset = Payment.objects.select_related(
            'booking',
            'booking__client',
            'client',
            'payment_type',
            'bank',
        ).prefetch_related('services')

        if filters:
            if filters.get('source'):
                queryset = queryset.filter(source=filters['source'])
            if filters.get('client_id'):
                queryset = queryset.filter(
                    models.Q(client_id=filters['client_id']) | models.Q(booking__client_id=filters['client_id'])
                )
            if filters.get('payment_type'):
                queryset = queryset.filter(payment_type_id=filters['payment_type'])
            if filters.get('booking_id'):
                queryset = queryset.filter(booking_id=filters['booking_id'])
            if filters.get('date_from'):
                queryset = queryset.filter(payment_date__gte=filters['date_from'])
            if filters.get('date_to'):
                queryset = queryset.filter(payment_date__lte=filters['date_to'])
            if filters.get('search'):
                search = filters['search']
                queryset = queryset.filter(
                    models.Q(client_name__icontains=search)
                    | models.Q(company_name__icontains=search)
                    | models.Q(reference_number__icontains=search)
                    | models.Q(client__client_name__icontains=search)
                    | models.Q(client__company_name__icontains=search)
                    | models.Q(booking__client__client_name__icontains=search)
                    | models.Q(booking__client__company_name__icontains=search)
                )

        return queryset

    @staticmethod
    def delete_payment(payment, user):
        if payment.source != Payment.SOURCE_MANUAL:
            raise ValidationError({'payment': 'Booking-linked payments are deleted when the booking is deleted.'})

        AuditLog.objects.create(
            user=user,
            action='payment.deleted',
            module='payments',
            details={'payment_id': str(payment.id)},
        )

        if payment.attachment:
            payment.attachment.delete(save=False)
        payment.delete()
