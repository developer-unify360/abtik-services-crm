from datetime import date
from decimal import Decimal

from rest_framework import serializers
from django.db import transaction

from payroll.models import EmployeeSalaryComponent, PayrollConfiguration, PayrollEmployee, Payslip, SalaryComponent
from payroll.services import PayrollService


def _normalized_component_name(value):
    return (value or '').strip().lower()


def _validate_component_collection(components, reserved_names=None, reserved_label='common salary rules'):
    seen_names = set()
    available_reference_names = set()
    reserved_names = reserved_names or []
    normalized_reserved_names = {
        _normalized_component_name(name): (name or '').strip()
        for name in reserved_names
        if (name or '').strip()
    }

    for index, component in enumerate(components, start=1):
        name = (component.get('name') or '').strip()
        normalized_name = _normalized_component_name(name)

        if normalized_name in seen_names:
            raise serializers.ValidationError(
                f'Component names must be unique. Duplicate found at row {index}.'
            )

        if normalized_name in normalized_reserved_names:
            raise serializers.ValidationError(
                f'Component name "{name}" on row {index} already exists in the {reserved_label}.'
            )

        seen_names.add(normalized_name)
        available_reference_names.add(normalized_name)

    available_reference_names.update(normalized_reserved_names.keys())

    for index, component in enumerate(components, start=1):
        if component.get('basis') == SalaryComponent.BASIS_COMPONENT:
            reference_name = (component.get('reference_component') or '').strip()
            normalized_reference_name = _normalized_component_name(reference_name)
            if normalized_reference_name and normalized_reference_name not in available_reference_names:
                raise serializers.ValidationError(
                    f'Referenced component "{reference_name}" on row {index} must also exist in the available salary rules.'
                )

    return components


def _validate_leave_type_collection(leave_types):
    seen_names = set()

    for index, leave_type in enumerate(leave_types, start=1):
        name = (leave_type.get('name') or '').strip()
        normalized_name = _normalized_component_name(name)

        if normalized_name in seen_names:
            raise serializers.ValidationError(
                f'Leave type names must be unique. Duplicate found at row {index}.'
            )

        seen_names.add(normalized_name)

    return leave_types


class ComponentRuleValidationMixin:
    def validate(self, attrs):
        formula_type = attrs.get(
            'formula_type',
            getattr(self.instance, 'formula_type', SalaryComponent.FORMULA_PERCENTAGE),
        )
        basis = attrs.get(
            'basis',
            getattr(self.instance, 'basis', SalaryComponent.BASIS_MONTHLY_CTC),
        )

        if formula_type != SalaryComponent.FORMULA_FIXED and basis == SalaryComponent.BASIS_COMPONENT:
            if not (attrs.get('reference_component') or getattr(self.instance, 'reference_component', '')).strip():
                raise serializers.ValidationError(
                    {'reference_component': 'Choose a component name for this calculation.'}
                )

        if formula_type == SalaryComponent.FORMULA_FIXED:
            attrs['reference_component'] = ''

        return attrs


class SalaryComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryComponent
        fields = [
            'id',
            'name',
            'category',
            'formula_type',
            'basis',
            'reference_component',
            'value',
            'display_order',
            'apply_proration',
            'is_active',
        ]
        read_only_fields = ['id']


class SalaryComponentInputSerializer(ComponentRuleValidationMixin, serializers.Serializer):
    name = serializers.CharField(max_length=100)
    category = serializers.ChoiceField(choices=SalaryComponent.CATEGORY_CHOICES)
    formula_type = serializers.ChoiceField(choices=SalaryComponent.FORMULA_CHOICES)
    basis = serializers.ChoiceField(
        choices=SalaryComponent.BASIS_CHOICES,
        required=False,
        default=SalaryComponent.BASIS_MONTHLY_CTC,
    )
    reference_component = serializers.CharField(max_length=100, required=False, allow_blank=True)
    value = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=Decimal('0.00'))
    display_order = serializers.IntegerField(required=False, min_value=1)
    apply_proration = serializers.BooleanField(required=False, default=True)
    is_active = serializers.BooleanField(required=False, default=True)

class EmployeeSalaryComponentSerializer(ComponentRuleValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = EmployeeSalaryComponent
        fields = [
            'id',
            'name',
            'category',
            'formula_type',
            'basis',
            'reference_component',
            'value',
            'display_order',
            'apply_proration',
            'is_active',
        ]
        read_only_fields = ['id']


class LeaveTypeRuleSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    is_paid = serializers.BooleanField(default=True)
    display_order = serializers.IntegerField(required=False, min_value=1)


class PayrollConfigurationSerializer(serializers.ModelSerializer):
    salary_components = SalaryComponentSerializer(many=True, read_only=True)
    company_logo_url = serializers.SerializerMethodField()
    leave_types = serializers.SerializerMethodField()

    class Meta:
        model = PayrollConfiguration
        fields = [
            'id',
            'company_name',
            'company_address',
            'company_logo_url',
            'payslip_title',
            'default_working_days',
            'currency',
            'leave_types',
            'salary_components',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'company_logo_url', 'created_at', 'updated_at']

    def get_company_logo_url(self, obj):
        if not obj.company_logo:
            return None
        return obj.company_logo.url

    def get_leave_types(self, obj):
        leave_types = obj.leave_types or PayrollService.DEFAULT_LEAVE_TYPES
        return sorted(
            [
                {
                    'name': (leave_type.get('name') or '').strip(),
                    'is_paid': bool(leave_type.get('is_paid', True)),
                    'display_order': leave_type.get('display_order') or index,
                }
                for index, leave_type in enumerate(leave_types, start=1)
                if (leave_type.get('name') or '').strip()
            ],
            key=lambda leave_type: leave_type['display_order'],
        )


class PayrollConfigurationWriteSerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    company_address = serializers.CharField(required=False, allow_blank=True)
    company_logo = serializers.FileField(required=False, allow_null=True)
    remove_logo = serializers.BooleanField(required=False, default=False)
    payslip_title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    default_working_days = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        min_value=Decimal('0.01'),
    )
    currency = serializers.CharField(max_length=10, required=False, allow_blank=True)
    leave_types = LeaveTypeRuleSerializer(many=True, required=False)
    salary_components = SalaryComponentInputSerializer(many=True, required=False)

    def validate_leave_types(self, value):
        return _validate_leave_type_collection(value)

    def validate_salary_components(self, value):
        return _validate_component_collection(value, reserved_label='salary rules')


class PayrollEmployeeSerializer(serializers.ModelSerializer):
    monthly_ctc = serializers.SerializerMethodField()
    custom_salary_components = EmployeeSalaryComponentSerializer(many=True, required=False)

    class Meta:
        model = PayrollEmployee
        fields = [
            'id',
            'employee_code',
            'full_name',
            'email',
            'phone',
            'designation',
            'department',
            'date_of_joining',
            'work_location',
            'pan_number',
            'uan_number',
            'pf_number',
            'bank_name',
            'bank_account_number',
            'bank_ifsc',
            'annual_ctc',
            'monthly_ctc',
            'custom_salary_components',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'monthly_ctc', 'created_at', 'updated_at']

    def get_monthly_ctc(self, obj):
        return (obj.annual_ctc / Decimal('12.00')).quantize(Decimal('0.01')) if obj.annual_ctc else Decimal('0.00')

    def validate_custom_salary_components(self, value):
        configuration = PayrollService.get_configuration()
        common_component_names = configuration.salary_components.values_list('name', flat=True)
        return _validate_component_collection(
            value,
            reserved_names=common_component_names,
            reserved_label='common salary rules',
        )

    def _replace_custom_salary_components(self, employee, components):
        EmployeeSalaryComponent.objects.filter(employee=employee).delete()

        for index, component_data in enumerate(components or [], start=1):
            component = EmployeeSalaryComponent(
                employee=employee,
                name=(component_data.get('name') or '').strip(),
                category=component_data['category'],
                formula_type=component_data['formula_type'],
                basis=component_data.get('basis') or SalaryComponent.BASIS_MONTHLY_CTC,
                reference_component=(component_data.get('reference_component') or '').strip(),
                value=component_data.get('value', Decimal('0.00')),
                display_order=component_data.get('display_order') or index,
                apply_proration=component_data.get('apply_proration', True),
                is_active=component_data.get('is_active', True),
            )
            component.full_clean()
            component.save()

    @transaction.atomic
    def create(self, validated_data):
        custom_salary_components = validated_data.pop('custom_salary_components', [])
        employee = PayrollEmployee(**validated_data)
        employee.full_clean()
        employee.save()
        self._replace_custom_salary_components(employee, custom_salary_components)
        return employee

    @transaction.atomic
    def update(self, instance, validated_data):
        custom_salary_components = validated_data.pop('custom_salary_components', None)

        for field_name, value in validated_data.items():
            setattr(instance, field_name, value)

        instance.full_clean()
        instance.save()

        if custom_salary_components is not None:
            self._replace_custom_salary_components(instance, custom_salary_components)

        return instance


class LeaveBreakdownEntrySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    days = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal('0.00'))
    is_paid = serializers.BooleanField(default=True)


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_code', read_only=True)
    month_label = serializers.SerializerMethodField()
    company_logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Payslip
        fields = [
            'id',
            'employee',
            'employee_name',
            'employee_code',
            'month',
            'month_label',
            'total_days',
            'paid_days',
            'leave_without_pay_days',
            'leave_breakdown',
            'annual_ctc_snapshot',
            'monthly_ctc_snapshot',
            'earnings_total',
            'deductions_total',
            'employer_contributions_total',
            'loss_of_pay_amount',
            'net_pay',
            'company_name_snapshot',
            'company_address_snapshot',
            'company_logo_url',
            'employee_snapshot',
            'calculation_snapshot',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'month_label', 'company_logo_url', 'created_at', 'updated_at']

    def get_month_label(self, obj):
        return obj.month.strftime('%B %Y')

    def get_company_logo_url(self, obj):
        configuration = obj.configuration
        if not configuration or not configuration.company_logo:
            return None
        return configuration.company_logo.url


class PayslipWriteSerializer(serializers.Serializer):
    employee = serializers.PrimaryKeyRelatedField(queryset=PayrollEmployee.objects.filter(is_active=True))
    month = serializers.DateField()
    total_days = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    paid_days_override = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    leave_breakdown = LeaveBreakdownEntrySerializer(many=True, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_month(self, value: date):
        return value.replace(day=1)
