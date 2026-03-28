from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel


def payroll_logo_upload_to(instance, filename):
    return f"payroll/company/{instance.id}/{filename}"


class PayrollConfiguration(BaseModel):
    company_name = models.CharField(max_length=255, blank=True)
    company_address = models.TextField(blank=True)
    company_logo = models.FileField(upload_to=payroll_logo_upload_to, null=True, blank=True)
    payslip_title = models.CharField(max_length=100, default='Payslip')
    default_working_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('30.00'))
    currency = models.CharField(max_length=10, default='INR')
    leave_types = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.company_name or f"Payroll Configuration {self.id}"


class SalaryComponent(BaseModel):
    CATEGORY_EARNING = 'earning'
    CATEGORY_DEDUCTION = 'deduction'
    CATEGORY_EMPLOYER = 'employer_contribution'
    CATEGORY_CHOICES = [
        (CATEGORY_EARNING, 'Earning'),
        (CATEGORY_DEDUCTION, 'Deduction'),
        (CATEGORY_EMPLOYER, 'Employer Contribution'),
    ]

    FORMULA_PERCENTAGE = 'percentage'
    FORMULA_FIXED = 'fixed'
    FORMULA_REMAINDER = 'remainder'
    FORMULA_CHOICES = [
        (FORMULA_PERCENTAGE, 'Percentage'),
        (FORMULA_FIXED, 'Fixed Amount'),
        (FORMULA_REMAINDER, 'Balance / Remainder'),
    ]

    BASIS_MONTHLY_CTC = 'monthly_ctc'
    BASIS_GROSS_EARNINGS = 'gross_earnings'
    BASIS_COMPONENT = 'component'
    BASIS_CHOICES = [
        (BASIS_MONTHLY_CTC, 'Monthly CTC'),
        (BASIS_GROSS_EARNINGS, 'Gross Earnings'),
        (BASIS_COMPONENT, 'Another Component'),
    ]

    configuration = models.ForeignKey(
        PayrollConfiguration,
        on_delete=models.CASCADE,
        related_name='salary_components',
    )
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default=CATEGORY_EARNING)
    formula_type = models.CharField(max_length=32, choices=FORMULA_CHOICES, default=FORMULA_PERCENTAGE)
    basis = models.CharField(max_length=32, choices=BASIS_CHOICES, default=BASIS_MONTHLY_CTC)
    reference_component = models.CharField(max_length=100, blank=True)
    value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    display_order = models.PositiveIntegerField(default=1)
    apply_proration = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['display_order', 'created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['configuration', 'name'],
                name='uniq_payroll_component_name_per_configuration',
            ),
        ]

    def clean(self):
        if self.formula_type != self.FORMULA_FIXED and self.basis == self.BASIS_COMPONENT and not self.reference_component:
            raise ValidationError({'reference_component': 'Choose a component to base this calculation on.'})

        if self.formula_type == self.FORMULA_FIXED:
            self.reference_component = ''

        if self.value < 0:
            raise ValidationError({'value': 'Value cannot be negative.'})

    def __str__(self):
        return self.name


class PayrollEmployee(BaseModel):
    employee_code = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    designation = models.CharField(max_length=150, blank=True)
    department = models.CharField(max_length=150, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    work_location = models.CharField(max_length=150, blank=True)
    pan_number = models.CharField(max_length=20, blank=True)
    uan_number = models.CharField(max_length=30, blank=True)
    pf_number = models.CharField(max_length=30, blank=True)
    bank_name = models.CharField(max_length=150, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_ifsc = models.CharField(max_length=20, blank=True)
    annual_ctc = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['full_name', 'employee_code']
        indexes = [
            models.Index(fields=['employee_code'], name='idx_payroll_employee_code'),
            models.Index(fields=['full_name'], name='idx_payroll_employee_name'),
        ]

    def clean(self):
        if self.annual_ctc < 0:
            raise ValidationError({'annual_ctc': 'Annual CTC cannot be negative.'})

    def __str__(self):
        return f"{self.full_name} ({self.employee_code})"


class EmployeeSalaryComponent(BaseModel):
    CATEGORY_EARNING = SalaryComponent.CATEGORY_EARNING
    CATEGORY_DEDUCTION = SalaryComponent.CATEGORY_DEDUCTION
    CATEGORY_EMPLOYER = SalaryComponent.CATEGORY_EMPLOYER
    CATEGORY_CHOICES = SalaryComponent.CATEGORY_CHOICES

    FORMULA_PERCENTAGE = SalaryComponent.FORMULA_PERCENTAGE
    FORMULA_FIXED = SalaryComponent.FORMULA_FIXED
    FORMULA_REMAINDER = SalaryComponent.FORMULA_REMAINDER
    FORMULA_CHOICES = SalaryComponent.FORMULA_CHOICES

    BASIS_MONTHLY_CTC = SalaryComponent.BASIS_MONTHLY_CTC
    BASIS_GROSS_EARNINGS = SalaryComponent.BASIS_GROSS_EARNINGS
    BASIS_COMPONENT = SalaryComponent.BASIS_COMPONENT
    BASIS_CHOICES = SalaryComponent.BASIS_CHOICES

    employee = models.ForeignKey(
        PayrollEmployee,
        on_delete=models.CASCADE,
        related_name='custom_salary_components',
    )
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default=CATEGORY_EARNING)
    formula_type = models.CharField(max_length=32, choices=FORMULA_CHOICES, default=FORMULA_PERCENTAGE)
    basis = models.CharField(max_length=32, choices=BASIS_CHOICES, default=BASIS_MONTHLY_CTC)
    reference_component = models.CharField(max_length=100, blank=True)
    value = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    display_order = models.PositiveIntegerField(default=1)
    apply_proration = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['display_order', 'created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'name'],
                name='uniq_payroll_employee_component_name_per_employee',
            ),
        ]

    def clean(self):
        if self.formula_type != self.FORMULA_FIXED and self.basis == self.BASIS_COMPONENT and not self.reference_component:
            raise ValidationError({'reference_component': 'Choose a component to base this calculation on.'})

        if self.formula_type == self.FORMULA_FIXED:
            self.reference_component = ''

        if self.value < 0:
            raise ValidationError({'value': 'Value cannot be negative.'})

    def __str__(self):
        return f"{self.employee.full_name} - {self.name}"


class Payslip(BaseModel):
    employee = models.ForeignKey(
        PayrollEmployee,
        on_delete=models.PROTECT,
        related_name='payslips',
    )
    configuration = models.ForeignKey(
        PayrollConfiguration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payslips',
    )
    month = models.DateField(help_text='Store the first day of the month.')
    total_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('30.00'))
    paid_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('30.00'))
    leave_without_pay_days = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    leave_breakdown = models.JSONField(default=list, blank=True)
    annual_ctc_snapshot = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    monthly_ctc_snapshot = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    earnings_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    deductions_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    employer_contributions_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    loss_of_pay_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    net_pay = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    company_name_snapshot = models.CharField(max_length=255, blank=True)
    company_address_snapshot = models.TextField(blank=True)
    employee_snapshot = models.JSONField(default=dict, blank=True)
    calculation_snapshot = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_payslips',
    )

    class Meta:
        ordering = ['-month', 'employee__full_name']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'month'],
                name='uniq_payroll_payslip_per_employee_month',
            ),
        ]

    def __str__(self):
        return f"{self.employee.full_name} - {self.month:%b %Y}"
