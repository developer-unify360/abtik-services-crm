from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from audit.models import AuditLog
from payroll.models import Payslip
from payroll.serializers import PayrollEmployeeSerializer
from payroll.services import PayrollService
from users.models import User


def make_employee_payload(**overrides):
    payload = {
        'employee_code': 'EMP-001',
        'full_name': 'Test Employee',
        'annual_ctc': '120000.00',
        'is_active': True,
        'custom_salary_components': [],
    }
    payload.update(overrides)
    return payload


def make_component_payload(**overrides):
    payload = {
        'name': 'Bonus',
        'category': 'earning',
        'formula_type': 'fixed',
        'basis': 'monthly_ctc',
        'reference_component': '',
        'value': '1000.00',
        'display_order': 1,
        'apply_proration': True,
        'is_active': True,
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
class TestPayrollEmployeeCustomComponents:
    def test_employee_serializer_saves_custom_salary_components(self):
        serializer = PayrollEmployeeSerializer(
            data=make_employee_payload(
                custom_salary_components=[
                    make_component_payload(name='Bonus', value='1500.00'),
                    make_component_payload(
                        name='Incentive',
                        formula_type='percentage',
                        basis='component',
                        reference_component='Basic Pay',
                        value='10.00',
                        display_order=2,
                    ),
                ]
            )
        )

        assert serializer.is_valid(), serializer.errors
        employee = serializer.save()

        components = list(employee.custom_salary_components.order_by('display_order'))
        assert [component.name for component in components] == ['Bonus', 'Incentive']
        assert components[0].value == Decimal('1500.00')
        assert components[1].reference_component == 'Basic Pay'

    def test_employee_serializer_rejects_duplicate_name_from_common_salary_rules(self):
        serializer = PayrollEmployeeSerializer(
            data=make_employee_payload(
                employee_code='EMP-002',
                custom_salary_components=[
                    make_component_payload(name='Basic Pay'),
                ]
            )
        )

        assert not serializer.is_valid()
        assert 'custom_salary_components' in serializer.errors

    def test_preview_payslip_includes_employee_specific_bonus_and_incentive(self):
        serializer = PayrollEmployeeSerializer(
            data=make_employee_payload(
                employee_code='EMP-003',
                custom_salary_components=[
                    make_component_payload(name='Bonus', value='1000.00'),
                    make_component_payload(
                        name='Incentive',
                        formula_type='percentage',
                        basis='component',
                        reference_component='Basic Pay',
                        value='10.00',
                        display_order=2,
                    ),
                ]
            )
        )

        assert serializer.is_valid(), serializer.errors
        employee = serializer.save()

        preview = PayrollService.preview_payslip(
            {
                'employee': employee,
                'month': date(2026, 3, 1),
                'leave_breakdown': [],
                'notes': '',
            }
        )

        earnings = {
            item['name']: Decimal(item['actual_amount'])
            for item in preview['earnings']
        }

        assert earnings['Bonus'] == Decimal('1000.00')
        assert earnings['Incentive'] == Decimal('500.00')
        assert Decimal(preview['summary']['earnings_total']) == Decimal('11500.00')
        assert Decimal(preview['summary']['net_pay']) == Decimal('10900.00')
        assert preview['employee']['custom_salary_components'][0]['name'] == 'Bonus'
        assert {item['name']: item['source'] for item in preview['earnings']}['Bonus'] == 'employee'


@pytest.mark.django_db
class TestPayrollPermissionsAndDelete:
    def setup_method(self):
        self.client = APIClient()
        self.hr_user = User.objects.create_user(
            username='hr@example.com',
            email='hr@example.com',
            password='password123',
            name='HR User',
            role='hr',
        )
        self.booking_ops_user = User.objects.create_user(
            username='booking@example.com',
            email='booking@example.com',
            password='password123',
            name='Booking Ops User',
            role='booking_ops',
        )

        serializer = PayrollEmployeeSerializer(
            data=make_employee_payload(employee_code='EMP-DEL-001', full_name='Delete Target')
        )
        assert serializer.is_valid(), serializer.errors
        self.employee = serializer.save()

    def test_hr_can_access_payroll_configuration(self):
        self.client.force_authenticate(user=self.hr_user)

        response = self.client.get(reverse('payroll-configuration'))

        assert response.status_code == status.HTTP_200_OK

    def test_non_hr_non_admin_user_cannot_access_payroll_configuration(self):
        self.client.force_authenticate(user=self.booking_ops_user)

        response = self.client.get(reverse('payroll-configuration'))

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_payslip_endpoint_removes_record_and_logs_audit_event(self):
        payslip = PayrollService.create_payslip(
            {
                'employee': self.employee,
                'month': date(2026, 3, 1),
                'leave_breakdown': [],
                'notes': 'Delete me',
            },
            user=self.hr_user,
        )
        self.client.force_authenticate(user=self.hr_user)

        response = self.client.delete(reverse('payslip-detail', args=[payslip.id]))

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Payslip.objects.filter(id=payslip.id).exists()
        audit_log = AuditLog.objects.filter(
            action='payroll.payslip.deleted',
            module='payroll',
        ).latest('created_at')
        assert audit_log.details['payslip_id'] == str(payslip.id)
