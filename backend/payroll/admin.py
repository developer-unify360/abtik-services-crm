from django.contrib import admin

from payroll.models import EmployeeSalaryComponent, PayrollConfiguration, PayrollEmployee, Payslip, SalaryComponent


class SalaryComponentInline(admin.TabularInline):
    model = SalaryComponent
    extra = 0


class EmployeeSalaryComponentInline(admin.TabularInline):
    model = EmployeeSalaryComponent
    extra = 0


@admin.register(PayrollConfiguration)
class PayrollConfigurationAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'payslip_title', 'default_working_days', 'currency', 'updated_at')
    inlines = [SalaryComponentInline]
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PayrollEmployee)
class PayrollEmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee_code', 'full_name', 'designation', 'department', 'annual_ctc', 'is_active')
    list_filter = ('is_active', 'department', 'designation')
    search_fields = ('employee_code', 'full_name', 'email', 'phone')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [EmployeeSalaryComponentInline]


@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = ('employee', 'month', 'paid_days', 'leave_without_pay_days', 'net_pay', 'created_at')
    list_filter = ('month', 'created_at')
    search_fields = ('employee__full_name', 'employee__employee_code')
    readonly_fields = ('created_at', 'updated_at', 'calculation_snapshot', 'employee_snapshot')
