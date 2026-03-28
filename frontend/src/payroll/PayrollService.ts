import apiClient from '../api/apiClient';

export type SalaryComponentCategory = 'earning' | 'deduction' | 'employer_contribution';
export type SalaryComponentFormulaType = 'percentage' | 'fixed' | 'remainder';
export type SalaryComponentBasis = 'monthly_ctc' | 'gross_earnings' | 'component';

export interface SalaryComponentRule {
  id?: string;
  name: string;
  category: SalaryComponentCategory;
  formula_type: SalaryComponentFormulaType;
  basis: SalaryComponentBasis;
  reference_component: string;
  value: string;
  display_order: number;
  apply_proration: boolean;
  is_active: boolean;
}

export type EmployeeSalaryComponentRule = SalaryComponentRule;

export interface LeaveTypeRule {
  name: string;
  is_paid: boolean;
  display_order: number;
}

export interface PayrollConfiguration {
  id: string;
  company_name: string;
  company_address: string;
  company_logo_url?: string | null;
  payslip_title: string;
  default_working_days: string;
  currency: string;
  leave_types: LeaveTypeRule[];
  salary_components: SalaryComponentRule[];
}

export interface PayrollConfigurationUpdateData {
  company_name: string;
  company_address: string;
  company_logo?: File | null;
  remove_logo?: boolean;
  payslip_title: string;
  default_working_days: string;
  currency: string;
  leave_types: LeaveTypeRule[];
  salary_components: SalaryComponentRule[];
}

export interface PayrollEmployee {
  id: string;
  employee_code: string;
  full_name: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  date_of_joining?: string | null;
  work_location?: string;
  pan_number?: string;
  uan_number?: string;
  pf_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  annual_ctc: string;
  monthly_ctc: string;
  custom_salary_components: EmployeeSalaryComponentRule[];
  is_active: boolean;
}

export interface LeaveBreakdownEntry {
  name: string;
  days: string;
  is_paid: boolean;
}

export interface PayslipWriteData {
  employee: string;
  month: string;
  total_days?: string | null;
  paid_days_override?: string | null;
  leave_breakdown: LeaveBreakdownEntry[];
  notes?: string;
}

export interface PayslipLineItem {
  name: string;
  category: SalaryComponentCategory;
  formula_type: SalaryComponentFormulaType;
  basis: SalaryComponentBasis;
  reference_component: string;
  base_amount: string;
  configured_value: string;
  scheduled_amount: string;
  actual_amount: string;
  apply_proration: boolean;
  source?: 'company' | 'employee';
}

export interface PayslipPreview {
  company: {
    company_name: string;
    company_address: string;
    payslip_title: string;
    currency: string;
    company_logo_data_url?: string | null;
    company_logo_url?: string | null;
  };
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
    email?: string;
    phone?: string;
    designation?: string;
    department?: string;
    date_of_joining?: string | null;
    work_location?: string;
    pan_number?: string;
    uan_number?: string;
    pf_number?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_ifsc?: string;
    custom_salary_components?: EmployeeSalaryComponentRule[];
  };
  leave_breakdown: LeaveBreakdownEntry[];
  summary: {
    month: string;
    month_label: string;
    annual_ctc: string;
    monthly_ctc: string;
    total_days: string;
    paid_days: string;
    leave_without_pay_days: string;
    paid_ratio: string;
    earnings_total: string;
    deductions_total: string;
    employer_contributions_total: string;
    loss_of_pay_amount: string;
    net_pay: string;
  };
  line_items: PayslipLineItem[];
  earnings: PayslipLineItem[];
  deductions: PayslipLineItem[];
  employer_contributions: PayslipLineItem[];
  notes?: string;
}

export interface PayslipRecord {
  id: string;
  employee: string;
  employee_name: string;
  employee_code: string;
  month: string;
  month_label: string;
  total_days: string;
  paid_days: string;
  leave_without_pay_days: string;
  leave_breakdown: LeaveBreakdownEntry[];
  annual_ctc_snapshot: string;
  monthly_ctc_snapshot: string;
  earnings_total: string;
  deductions_total: string;
  employer_contributions_total: string;
  loss_of_pay_amount: string;
  net_pay: string;
  company_name_snapshot: string;
  company_address_snapshot: string;
  company_logo_url?: string | null;
  employee_snapshot: PayslipPreview['employee'];
  calculation_snapshot: PayslipPreview;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const toMultipartConfiguration = (data: PayrollConfigurationUpdateData) => {
  const formData = new FormData();
  formData.append('company_name', data.company_name);
  formData.append('company_address', data.company_address);
  formData.append('payslip_title', data.payslip_title);
  formData.append('default_working_days', data.default_working_days);
  formData.append('currency', data.currency);
  formData.append('remove_logo', String(Boolean(data.remove_logo)));
  formData.append('leave_types', JSON.stringify(data.leave_types));
  formData.append('salary_components', JSON.stringify(data.salary_components));

  if (data.company_logo) {
    formData.append('company_logo', data.company_logo);
  }

  return formData;
};

export const PayrollService = {
  getConfiguration: async () => {
    const response = await apiClient.get('/payroll/configuration/');
    return response.data as PayrollConfiguration;
  },

  updateConfiguration: async (data: PayrollConfigurationUpdateData) => {
    if (data.company_logo) {
      const response = await apiClient.put('/payroll/configuration/', toMultipartConfiguration(data), {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data as PayrollConfiguration;
    }

    const response = await apiClient.put('/payroll/configuration/', data);
    return response.data.data as PayrollConfiguration;
  },

  listEmployees: async (params?: Record<string, string>) => {
    const response = await apiClient.get('/payroll/employees/', { params });
    return response.data;
  },

  createEmployee: async (data: Omit<PayrollEmployee, 'id' | 'monthly_ctc' | 'created_at' | 'updated_at'>) => {
    const response = await apiClient.post('/payroll/employees/', data);
    return response.data as PayrollEmployee;
  },

  updateEmployee: async (id: string, data: Partial<Omit<PayrollEmployee, 'id' | 'monthly_ctc' | 'created_at' | 'updated_at'>>) => {
    const response = await apiClient.put(`/payroll/employees/${id}/`, data);
    return response.data as PayrollEmployee;
  },

  deleteEmployee: async (id: string) => {
    const response = await apiClient.delete(`/payroll/employees/${id}/`);
    return response.data;
  },

  listPayslips: async (params?: Record<string, string>) => {
    const response = await apiClient.get('/payroll/payslips/', { params });
    return response.data;
  },

  createPayslip: async (data: PayslipWriteData) => {
    const response = await apiClient.post('/payroll/payslips/', data);
    return response.data.data as PayslipRecord;
  },

  updatePayslip: async (id: string, data: PayslipWriteData) => {
    const response = await apiClient.put(`/payroll/payslips/${id}/`, data);
    return response.data.data as PayslipRecord;
  },

  deletePayslip: async (id: string) => {
    const response = await apiClient.delete(`/payroll/payslips/${id}/`);
    return response.data;
  },

  previewPayslip: async (data: PayslipWriteData) => {
    const response = await apiClient.post('/payroll/payslips/preview/', data);
    return response.data.data as PayslipPreview;
  },
};
