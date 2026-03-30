from calendar import monthrange
from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q

from audit.models import AuditLog
from payroll.models import PayrollConfiguration, PayrollEmployee, Payslip, SalaryComponent


MONEY_QUANTIZE = Decimal('1')
DAYS_QUANTIZE = Decimal('0.01')
RATIO_QUANTIZE = Decimal('0.0001')
ZERO = Decimal('0')


def quantize_money(value):
    return Decimal(value or 0).quantize(MONEY_QUANTIZE, rounding=ROUND_HALF_UP)


def quantize_days(value):
    return Decimal(value or 0).quantize(DAYS_QUANTIZE, rounding=ROUND_HALF_UP)


def normalize_component_name(value):
    return (value or '').strip().lower()


class PayrollService:
    DEFAULT_LEAVE_TYPES = [
        {
            'name': 'Casual Leave',
            'is_paid': True,
            'display_order': 1,
        },
        {
            'name': 'Sick Leave',
            'is_paid': True,
            'display_order': 2,
        },
        {
            'name': 'Loss of Pay',
            'is_paid': False,
            'display_order': 3,
        },
    ]

    DEFAULT_COMPONENTS = [
        {
            'name': 'Basic Pay',
            'category': SalaryComponent.CATEGORY_EARNING,
            'formula_type': SalaryComponent.FORMULA_PERCENTAGE,
            'basis': SalaryComponent.BASIS_MONTHLY_CTC,
            'reference_component': '',
            'value': Decimal('50.00'),
            'display_order': 1,
            'apply_proration': True,
            'is_active': True,
        },
        {
            'name': 'HRA',
            'category': SalaryComponent.CATEGORY_EARNING,
            'formula_type': SalaryComponent.FORMULA_PERCENTAGE,
            'basis': SalaryComponent.BASIS_COMPONENT,
            'reference_component': 'Basic Pay',
            'value': Decimal('40.00'),
            'display_order': 2,
            'apply_proration': True,
            'is_active': True,
        },
        {
            'name': 'Special Allowance',
            'category': SalaryComponent.CATEGORY_EARNING,
            'formula_type': SalaryComponent.FORMULA_REMAINDER,
            'basis': SalaryComponent.BASIS_MONTHLY_CTC,
            'reference_component': '',
            'value': Decimal('0.00'),
            'display_order': 3,
            'apply_proration': True,
            'is_active': True,
        },
        {
            'name': 'Provident Fund',
            'category': SalaryComponent.CATEGORY_DEDUCTION,
            'formula_type': SalaryComponent.FORMULA_PERCENTAGE,
            'basis': SalaryComponent.BASIS_COMPONENT,
            'reference_component': 'Basic Pay',
            'value': Decimal('12.00'),
            'display_order': 4,
            'apply_proration': False,
            'is_active': True,
        },
        {
            'name': 'Bonus',
            'category': SalaryComponent.CATEGORY_EARNING,
            'formula_type': SalaryComponent.FORMULA_PERCENTAGE,
            'basis': SalaryComponent.BASIS_MONTHLY_CTC,
            'reference_component': '',
            'value': Decimal('12.50'),
            'display_order': 5,
            'apply_proration': True,
            'is_active': True,
        },
    ]

    @staticmethod
    def get_configuration():
        configuration = PayrollConfiguration.objects.prefetch_related('salary_components').first()
        if configuration:
            if not configuration.leave_types:
                configuration.leave_types = [dict(item) for item in PayrollService.DEFAULT_LEAVE_TYPES]
                configuration.save(update_fields=['leave_types', 'updated_at'])
            return configuration

        configuration = PayrollConfiguration.objects.create(
            company_name='',
            company_address='',
            payslip_title='Payslip',
            default_working_days=Decimal('30.00'),
            currency='INR',
            leave_types=[dict(item) for item in PayrollService.DEFAULT_LEAVE_TYPES],
        )
        for component in PayrollService.DEFAULT_COMPONENTS:
            SalaryComponent.objects.create(configuration=configuration, **component)
        return configuration

    @staticmethod
    @transaction.atomic
    def update_configuration(data, user):
        configuration = PayrollService.get_configuration()

        for field_name in ['company_name', 'company_address', 'payslip_title', 'default_working_days', 'currency', 'leave_types']:
            if field_name in data:
                setattr(configuration, field_name, data[field_name])

        if data.get('remove_logo') and configuration.company_logo:
            configuration.company_logo.delete(save=False)
            configuration.company_logo = None

        if 'company_logo' in data and data['company_logo']:
            if configuration.company_logo:
                configuration.company_logo.delete(save=False)
            configuration.company_logo = data['company_logo']

        configuration.full_clean()
        configuration.save()

        if 'salary_components' in data:
            SalaryComponent.objects.filter(configuration=configuration).delete()
            components = data['salary_components'] or PayrollService.DEFAULT_COMPONENTS
            for index, component_data in enumerate(components, start=1):
                SalaryComponent.objects.create(
                    configuration=configuration,
                    name=component_data['name'].strip(),
                    category=component_data['category'],
                    formula_type=component_data['formula_type'],
                    basis=component_data.get('basis') or SalaryComponent.BASIS_MONTHLY_CTC,
                    reference_component=(component_data.get('reference_component') or '').strip(),
                    value=component_data.get('value', Decimal('0.00')),
                    display_order=component_data.get('display_order') or index,
                    apply_proration=component_data.get('apply_proration', True),
                    is_active=component_data.get('is_active', True),
                )

        AuditLog.objects.create(
            user=user,
            action='payroll.configuration.updated',
            module='payroll',
            details={'configuration_id': str(configuration.id)},
        )

        return configuration

    @staticmethod
    def list_employees(filters=None):
        queryset = PayrollEmployee.objects.prefetch_related('custom_salary_components')
        if filters:
            if filters.get('is_active') in ['true', 'false']:
                queryset = queryset.filter(is_active=filters['is_active'] == 'true')
            if filters.get('search'):
                search = filters['search']
                queryset = queryset.filter(
                    Q(full_name__icontains=search)
                    | Q(employee_code__icontains=search)
                    | Q(designation__icontains=search)
                    | Q(department__icontains=search)
                    | Q(email__icontains=search)
                )
        return queryset

    @staticmethod
    def list_payslips(filters=None):
        queryset = Payslip.objects.select_related('employee', 'configuration')
        if filters:
            if filters.get('employee'):
                queryset = queryset.filter(employee_id=filters['employee'])
            if filters.get('month'):
                queryset = queryset.filter(month=filters['month'])
            if filters.get('search'):
                search = filters['search']
                queryset = queryset.filter(
                    Q(employee__full_name__icontains=search)
                    | Q(employee__employee_code__icontains=search)
                )
        return queryset

    @staticmethod
    def _get_total_days(month, total_days, configuration):
      if total_days not in [None, '']:
          return quantize_days(total_days)
      if configuration and configuration.default_working_days:
          return quantize_days(configuration.default_working_days)
      return quantize_days(monthrange(month.year, month.month)[1])

    @staticmethod
    def _prepare_leave_breakdown(leave_breakdown):
        normalized_entries = []
        unpaid_leave_days = ZERO

        for entry in leave_breakdown or []:
            days = quantize_days(entry.get('days'))
            if days <= 0:
                continue

            normalized_entry = {
                'name': (entry.get('name') or '').strip(),
                'days': str(days),
                'is_paid': bool(entry.get('is_paid', True)),
            }
            normalized_entries.append(normalized_entry)

            if not normalized_entry['is_paid']:
                unpaid_leave_days += days

        return normalized_entries, quantize_days(unpaid_leave_days)

    @staticmethod
    def _resolve_component_basis(component, monthly_ctc, scheduled_totals, component_values):
        if component.formula_type == SalaryComponent.FORMULA_FIXED:
            return ZERO

        if component.basis == SalaryComponent.BASIS_MONTHLY_CTC:
            return monthly_ctc

        if component.basis == SalaryComponent.BASIS_GROSS_EARNINGS:
            return scheduled_totals[SalaryComponent.CATEGORY_EARNING]

        if component.basis == SalaryComponent.BASIS_COMPONENT:
            return component_values.get(normalize_component_name(component.reference_component), ZERO)

        return ZERO

    @staticmethod
    def _calculate_component_amount(component, base_amount, category_scheduled_total):
        if component.formula_type == SalaryComponent.FORMULA_FIXED:
            return quantize_money(component.value)

        if component.formula_type == SalaryComponent.FORMULA_PERCENTAGE:
            return quantize_money((base_amount * component.value) / Decimal('100.00'))

        if component.formula_type == SalaryComponent.FORMULA_REMAINDER:
            return quantize_money(max(base_amount - category_scheduled_total, ZERO))

        return ZERO

    @staticmethod
    def _employee_snapshot(employee):
        return {
            'id': str(employee.id),
            'employee_code': employee.employee_code,
            'full_name': employee.full_name,
            'email': employee.email,
            'phone': employee.phone,
            'designation': employee.designation,
            'department': employee.department,
            'date_of_joining': employee.date_of_joining.isoformat() if employee.date_of_joining else None,
            'work_location': employee.work_location,
            'pan_number': employee.pan_number,
            'uan_number': employee.uan_number,
            'pf_number': employee.pf_number,
            'bank_name': employee.bank_name,
            'bank_account_number': employee.bank_account_number,
            'bank_ifsc': employee.bank_ifsc,
            'custom_salary_components': [
                {
                    'id': str(component.id),
                    'name': component.name,
                    'category': component.category,
                    'formula_type': component.formula_type,
                    'basis': component.basis,
                    'reference_component': component.reference_component,
                    'value': str(quantize_money(component.value)),
                    'display_order': component.display_order,
                    'apply_proration': component.apply_proration,
                    'is_active': component.is_active,
                }
                for component in employee.custom_salary_components.all().order_by('display_order', 'created_at')
            ],
        }

    @staticmethod
    def preview_payslip(data):
        configuration = PayrollService.get_configuration()
        employee = data['employee']
        month = data['month'].replace(day=1)
        total_days = PayrollService._get_total_days(month, data.get('total_days'), configuration)
        normalized_leave_breakdown, unpaid_leave_days = PayrollService._prepare_leave_breakdown(
            data.get('leave_breakdown', [])
        )

        paid_days_override = data.get('paid_days_override')
        if paid_days_override is not None:
            paid_days = quantize_days(paid_days_override)
        else:
            paid_days = quantize_days(max(total_days - unpaid_leave_days, ZERO))

        if paid_days > total_days:
            raise ValidationError({'paid_days_override': 'Paid days cannot be greater than total days.'})

        leave_without_pay_days = quantize_days(max(total_days - paid_days, ZERO))
        paid_ratio = Decimal('1.0000')
        if total_days > 0:
            paid_ratio = (paid_days / total_days).quantize(RATIO_QUANTIZE, rounding=ROUND_HALF_UP)

        annual_ctc = quantize_money(employee.annual_ctc)
        monthly_ctc = quantize_money(annual_ctc / Decimal('12.00')) if annual_ctc else ZERO

        common_components = list(
            configuration.salary_components.filter(is_active=True).order_by('display_order', 'created_at')
        )
        employee_specific_components = list(
            employee.custom_salary_components.filter(is_active=True).order_by('display_order', 'created_at')
        )
        active_components = [*common_components, *employee_specific_components]
        component_values = {}
        scheduled_totals = {
            SalaryComponent.CATEGORY_EARNING: ZERO,
            SalaryComponent.CATEGORY_DEDUCTION: ZERO,
            SalaryComponent.CATEGORY_EMPLOYER: ZERO,
        }
        actual_totals = {
            SalaryComponent.CATEGORY_EARNING: ZERO,
            SalaryComponent.CATEGORY_DEDUCTION: ZERO,
            SalaryComponent.CATEGORY_EMPLOYER: ZERO,
        }
        line_items = []

        for component in active_components:
            component_source = 'employee' if getattr(component, 'employee_id', None) else 'company'
            base_amount = PayrollService._resolve_component_basis(
                component,
                monthly_ctc=monthly_ctc,
                scheduled_totals=scheduled_totals,
                component_values=component_values,
            )
            scheduled_amount = PayrollService._calculate_component_amount(
                component,
                base_amount=base_amount,
                category_scheduled_total=scheduled_totals[component.category],
            )
            actual_amount = scheduled_amount
            # When leave inputs are given, only earnings should decrease; deductions remain fixed.
            if component.apply_proration and component.category == SalaryComponent.CATEGORY_EARNING:
                actual_amount = quantize_money(scheduled_amount * paid_ratio)

            scheduled_totals[component.category] = quantize_money(
                scheduled_totals[component.category] + scheduled_amount
            )
            actual_totals[component.category] = quantize_money(
                actual_totals[component.category] + actual_amount
            )
            component_values[normalize_component_name(component.name)] = scheduled_amount

            line_items.append(
                {
                    'name': component.name,
                    'category': component.category,
                    'formula_type': component.formula_type,
                    'basis': component.basis,
                    'reference_component': component.reference_component,
                    'base_amount': str(quantize_money(base_amount)),
                    'configured_value': str(quantize_money(component.value)),
                    'scheduled_amount': str(scheduled_amount),
                    'actual_amount': str(actual_amount),
                    'apply_proration': component.apply_proration,
                    'source': component_source,
                }
            )

        earnings_total = quantize_money(actual_totals[SalaryComponent.CATEGORY_EARNING])
        deductions_total = quantize_money(actual_totals[SalaryComponent.CATEGORY_DEDUCTION])
        employer_total = quantize_money(actual_totals[SalaryComponent.CATEGORY_EMPLOYER])
        scheduled_earnings_total = quantize_money(scheduled_totals[SalaryComponent.CATEGORY_EARNING])
        loss_of_pay_amount = quantize_money(max(scheduled_earnings_total - earnings_total, ZERO))
        net_pay = quantize_money(earnings_total - deductions_total)

        summary = {
            'month': month.isoformat(),
            'month_label': month.strftime('%B %Y'),
            'annual_ctc': str(annual_ctc),
            'monthly_ctc': str(monthly_ctc),
            'total_days': str(total_days),
            'paid_days': str(paid_days),
            'leave_without_pay_days': str(leave_without_pay_days),
            'paid_ratio': str(paid_ratio),
            'earnings_total': str(earnings_total),
            'deductions_total': str(deductions_total),
            'employer_contributions_total': str(employer_total),
            'loss_of_pay_amount': str(loss_of_pay_amount),
            'net_pay': str(net_pay),
        }

        return {
            'company': {
                'company_name': configuration.company_name,
                'company_address': configuration.company_address,
                'payslip_title': configuration.payslip_title,
                'currency': configuration.currency,
                'company_logo_url': configuration.company_logo.url if configuration.company_logo else None,
            },
            'employee': PayrollService._employee_snapshot(employee),
            'leave_breakdown': normalized_leave_breakdown,
            'summary': summary,
            'line_items': line_items,
            'earnings': [item for item in line_items if item['category'] == SalaryComponent.CATEGORY_EARNING],
            'deductions': [item for item in line_items if item['category'] == SalaryComponent.CATEGORY_DEDUCTION],
            'employer_contributions': [
                item for item in line_items if item['category'] == SalaryComponent.CATEGORY_EMPLOYER
            ],
            'notes': data.get('notes', ''),
        }

    @staticmethod
    @transaction.atomic
    def create_payslip(data, user):
        preview = PayrollService.preview_payslip(data)
        employee = data['employee']
        month = data['month'].replace(day=1)

        if Payslip.objects.filter(employee=employee, month=month).exists():
            raise ValidationError({'month': 'A payslip already exists for this employee and month.'})

        configuration = PayrollService.get_configuration()
        payslip = Payslip.objects.create(
            employee=employee,
            configuration=configuration,
            month=month,
            total_days=Decimal(preview['summary']['total_days']),
            paid_days=Decimal(preview['summary']['paid_days']),
            leave_without_pay_days=Decimal(preview['summary']['leave_without_pay_days']),
            leave_breakdown=preview['leave_breakdown'],
            annual_ctc_snapshot=Decimal(preview['summary']['annual_ctc']),
            monthly_ctc_snapshot=Decimal(preview['summary']['monthly_ctc']),
            earnings_total=Decimal(preview['summary']['earnings_total']),
            deductions_total=Decimal(preview['summary']['deductions_total']),
            employer_contributions_total=Decimal(preview['summary']['employer_contributions_total']),
            loss_of_pay_amount=Decimal(preview['summary']['loss_of_pay_amount']),
            net_pay=Decimal(preview['summary']['net_pay']),
            company_name_snapshot=preview['company']['company_name'],
            company_address_snapshot=preview['company']['company_address'],
            employee_snapshot=preview['employee'],
            calculation_snapshot=preview,
            notes=data.get('notes', ''),
            created_by=user,
        )

        AuditLog.objects.create(
            user=user,
            action='payroll.payslip.created',
            module='payroll',
            details={'payslip_id': str(payslip.id), 'employee_id': str(employee.id), 'month': month.isoformat()},
        )

        return payslip

    @staticmethod
    @transaction.atomic
    def update_payslip(payslip, data, user):
        employee = data.get('employee', payslip.employee)
        month = data.get('month', payslip.month).replace(day=1)

        duplicate_exists = Payslip.objects.filter(employee=employee, month=month).exclude(id=payslip.id).exists()
        if duplicate_exists:
            raise ValidationError({'month': 'A payslip already exists for this employee and month.'})

        payload = {
            'employee': employee,
            'month': month,
            'total_days': data.get('total_days', payslip.total_days),
            'paid_days_override': data.get('paid_days_override'),
            'leave_breakdown': data.get('leave_breakdown', payslip.leave_breakdown),
            'notes': data.get('notes', payslip.notes),
        }
        preview = PayrollService.preview_payslip(payload)
        configuration = PayrollService.get_configuration()

        payslip.employee = employee
        payslip.configuration = configuration
        payslip.month = month
        payslip.total_days = Decimal(preview['summary']['total_days'])
        payslip.paid_days = Decimal(preview['summary']['paid_days'])
        payslip.leave_without_pay_days = Decimal(preview['summary']['leave_without_pay_days'])
        payslip.leave_breakdown = preview['leave_breakdown']
        payslip.annual_ctc_snapshot = Decimal(preview['summary']['annual_ctc'])
        payslip.monthly_ctc_snapshot = Decimal(preview['summary']['monthly_ctc'])
        payslip.earnings_total = Decimal(preview['summary']['earnings_total'])
        payslip.deductions_total = Decimal(preview['summary']['deductions_total'])
        payslip.employer_contributions_total = Decimal(preview['summary']['employer_contributions_total'])
        payslip.loss_of_pay_amount = Decimal(preview['summary']['loss_of_pay_amount'])
        payslip.net_pay = Decimal(preview['summary']['net_pay'])
        payslip.company_name_snapshot = preview['company']['company_name']
        payslip.company_address_snapshot = preview['company']['company_address']
        payslip.employee_snapshot = preview['employee']
        payslip.calculation_snapshot = preview
        payslip.notes = payload['notes']
        payslip.full_clean()
        payslip.save()

        AuditLog.objects.create(
            user=user,
            action='payroll.payslip.updated',
            module='payroll',
            details={'payslip_id': str(payslip.id), 'employee_id': str(employee.id), 'month': month.isoformat()},
        )

        return payslip

    @staticmethod
    @transaction.atomic
    def delete_payslip(payslip, user):
        payslip_details = {
            'payslip_id': str(payslip.id),
            'employee_id': str(payslip.employee_id) if payslip.employee_id else None,
            'month': payslip.month.isoformat(),
        }
        payslip.delete()

        AuditLog.objects.create(
            user=user,
            action='payroll.payslip.deleted',
            module='payroll',
            details=payslip_details,
        )
