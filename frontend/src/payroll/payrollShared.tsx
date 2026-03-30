import React from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, FileText, ScrollText, Settings2, Users } from 'lucide-react';

import type {
  EmployeeSalaryComponentRule,
  LeaveTypeRule,
  PayrollConfiguration,
  PayrollEmployee,
  SalaryComponentRule,
} from './PayrollService';

export interface ConfigurationFormState {
  company_name: string;
  company_address: string;
  payslip_title: string;
  default_working_days: string;
  currency: string;
  leave_types: LeaveTypeRule[];
  salary_components: SalaryComponentRule[];
  company_logo: File | null;
  existing_logo_url: string;
  remove_logo: boolean;
}

export interface EmployeeFormState {
  employee_code: string;
  full_name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  date_of_joining: string;
  work_location: string;
  pan_number: string;
  uan_number: string;
  pf_number: string;
  bank_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  annual_ctc: string;
  custom_salary_components: EmployeeSalaryComponentRule[];
  is_active: boolean;
}

export interface PayrollNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const payrollNavItems: PayrollNavItem[] = [
  {
    label: 'Company Setup',
    path: '/payroll/company-setup',
    icon: <Building2 size={16} />,
  },
  {
    label: 'Salary Rules',
    path: '/payroll/salary-rules',
    icon: <ScrollText size={16} />,
  },
  {
    label: 'Attendance Rules',
    path: '/payroll/attendance-rules',
    icon: <Settings2 size={16} />,
  },
  {
    label: 'Employees',
    path: '/payroll/employees',
    icon: <Users size={16} />,
  },
  {
    label: 'Payslip Generator',
    path: '/payroll/payslip-generator',
    icon: <FileText size={16} />,
  },
];

export const makeSalaryRule = (displayOrder: number): SalaryComponentRule => ({
  name: '',
  category: 'earning',
  formula_type: 'percentage',
  basis: 'monthly_ctc',
  reference_component: '',
  value: '0.00',
  display_order: displayOrder,
  apply_proration: true,
  is_active: true,
});

export const makeEmployeeRule = (
  displayOrder: number,
  name = '',
): EmployeeSalaryComponentRule => ({
  ...makeSalaryRule(displayOrder),
  name,
});

export const makeLeaveTypeRule = (
  displayOrder: number,
  name = '',
  isPaid = true,
): LeaveTypeRule => ({
  name,
  is_paid: isPaid,
  display_order: displayOrder,
});

export const initialConfigurationForm = (): ConfigurationFormState => ({
  company_name: '',
  company_address: '',
  payslip_title: 'Payslip',
  default_working_days: '30.00',
  currency: 'INR',
  leave_types: [makeLeaveTypeRule(1, 'Casual Leave', true)],
  salary_components: [makeSalaryRule(1)],
  company_logo: null,
  existing_logo_url: '',
  remove_logo: false,
});

export const emptyEmployeeForm = (): EmployeeFormState => ({
  employee_code: '',
  full_name: '',
  email: '',
  phone: '',
  designation: '',
  department: '',
  date_of_joining: '',
  work_location: '',
  pan_number: '',
  uan_number: '',
  pf_number: '',
  bank_name: '',
  bank_account_number: '',
  bank_ifsc: '',
  annual_ctc: '',
  custom_salary_components: [
    {
      ...makeEmployeeRule(1, 'Bonus'),
      formula_type: 'percentage',
      basis: 'monthly_ctc',
      value: '12.50',
    },
  ],
  is_active: true,
});

export const currencyFormatter = (value?: string | null, currency = 'INR') => {
  const numericValue = Math.round(Number(value || 0));
  if (Number.isNaN(numericValue)) {
    return value || '';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(numericValue);
};

export const normalizeAssetUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }

  if (value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('/')) {
    return value;
  }

  try {
    const parsedUrl = new URL(value, window.location.origin);
    if (parsedUrl.hostname === 'backend') {
      return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
    }

    return parsedUrl.toString();
  } catch {
    return value;
  }
};

export const normalizeEmployeeRules = (
  rules?: EmployeeSalaryComponentRule[],
): EmployeeSalaryComponentRule[] =>
  rules?.length
    ? rules
        .slice()
        .sort((left, right) => left.display_order - right.display_order)
        .map((rule, index) => ({
          ...rule,
          value: String(rule.value ?? '0.00'),
          display_order: index + 1,
        }))
    : [];

export const normalizeLeaveTypes = (leaveTypes?: LeaveTypeRule[]): LeaveTypeRule[] =>
  leaveTypes?.length
    ? leaveTypes
        .slice()
        .sort((left, right) => left.display_order - right.display_order)
        .map((leaveType, index) => ({
          ...leaveType,
          name: leaveType.name || '',
          is_paid: Boolean(leaveType.is_paid),
          display_order: index + 1,
        }))
    : [];

export const normalizeConfiguration = (data: PayrollConfiguration): ConfigurationFormState => ({
  company_name: data.company_name || '',
  company_address: data.company_address || '',
  payslip_title: data.payslip_title || 'Payslip',
  default_working_days: data.default_working_days || '30.00',
  currency: data.currency || 'INR',
  leave_types: normalizeLeaveTypes(data.leave_types),
  salary_components:
    data.salary_components?.length > 0
      ? data.salary_components
          .slice()
          .sort((left, right) => left.display_order - right.display_order)
          .map((rule, index) => ({
            ...rule,
            value: String(rule.value ?? '0.00'),
            display_order: index + 1,
          }))
      : [makeSalaryRule(1)],
  company_logo: null,
  existing_logo_url: normalizeAssetUrl(data.company_logo_url || ''),
  remove_logo: false,
});

export const mapEmployeeToForm = (employee: PayrollEmployee): EmployeeFormState => ({
  employee_code: employee.employee_code || '',
  full_name: employee.full_name || '',
  email: employee.email || '',
  phone: employee.phone || '',
  designation: employee.designation || '',
  department: employee.department || '',
  date_of_joining: employee.date_of_joining || '',
  work_location: employee.work_location || '',
  pan_number: employee.pan_number || '',
  uan_number: employee.uan_number || '',
  pf_number: employee.pf_number || '',
  bank_name: employee.bank_name || '',
  bank_account_number: employee.bank_account_number || '',
  bank_ifsc: employee.bank_ifsc || '',
  annual_ctc: employee.annual_ctc || '',
  custom_salary_components: normalizeEmployeeRules(employee.custom_salary_components),
  is_active: employee.is_active,
});

export const PayrollWorkspace = ({
  title,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">{title}</h1>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-3 py-2.5">
        {payrollNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </section>
    {children}
  </div>
);

export const Panel = ({
  title,
  description,
  icon,
  actions,
  className = '',
  children,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
    <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-0.5 text-[11px] text-slate-500">{description}</p> : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
    <div className="p-3">{children}</div>
  </section>
);

export const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="block">
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
    {children}
    {hint ? <p className="mt-1 text-[10px] text-slate-500">{hint}</p> : null}
  </label>
);
