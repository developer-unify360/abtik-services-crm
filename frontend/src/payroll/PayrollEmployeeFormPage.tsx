import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  PayrollService,
  type EmployeeSalaryComponentRule,
  type PayrollConfiguration,
  type PayrollEmployee,
} from './PayrollService';
import {
  Field,
  Panel,
  PayrollWorkspace,
  emptyEmployeeForm,
  mapEmployeeToForm,
  makeEmployeeRule,
} from './payrollShared';
import { toastError, toastSuccess } from '../services/toastNotify';

const PayrollEmployeeFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { employeeId } = useParams<{ employeeId: string }>();
  const isEditing = Boolean(employeeId);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState(emptyEmployeeForm());
  const [configuration, setConfiguration] = useState<PayrollConfiguration | null>(null);
  const [pageError, setPageError] = useState('');

  const componentNameOptions = useMemo(
    () => configuration?.salary_components.map((rule) => rule.name.trim()).filter(Boolean) || [],
    [configuration],
  );

  const getEmployeeRuleReferenceOptions = (currentRuleIndex: number) => {
    const names = [
      ...componentNameOptions,
      ...formState.custom_salary_components
        .filter((_, index) => index !== currentRuleIndex)
        .map((rule) => rule.name.trim()),
    ].filter(Boolean);

    return Array.from(new Set(names));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setPageError('');
      const [configurationResponse, employeeResponse] = await Promise.all([
        PayrollService.getConfiguration(),
        PayrollService.listEmployees({ page_size: '200' }),
      ]);

      setConfiguration(configurationResponse);

      if (employeeId) {
        const employees: PayrollEmployee[] = employeeResponse.results || employeeResponse;
        const employee = employees.find((item) => item.id === employeeId);
        if (!employee) {
          setPageError('Employee not found.');
        } else {
          setFormState(mapEmployeeToForm(employee));
        }
      } else {
        setFormState(emptyEmployeeForm());
      }
    } catch (error) {
      console.error('Failed to load payroll employee form:', error);
      setPageError('Unable to load payroll employee form right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const handleEmployeeRuleChange = (
    index: number,
    field: keyof EmployeeSalaryComponentRule,
    value: string | number | boolean,
  ) => {
    setFormState((previous) => {
      const nextRules = previous.custom_salary_components.map((rule, ruleIndex) => {
        if (ruleIndex !== index) {
          return rule;
        }

        const nextRule = { ...rule, [field]: value } as EmployeeSalaryComponentRule;

        if (field === 'formula_type' && value === 'fixed') {
          nextRule.basis = 'monthly_ctc';
          nextRule.reference_component = '';
        }

        if (field === 'basis' && value !== 'component') {
          nextRule.reference_component = '';
        }

        return nextRule;
      });

      return { ...previous, custom_salary_components: nextRules };
    });
  };

  const addEmployeeRule = (name = '') => {
    setFormState((previous) => ({
      ...previous,
      custom_salary_components: [
        ...previous.custom_salary_components,
        makeEmployeeRule(previous.custom_salary_components.length + 1, name),
      ],
    }));
  };

  const removeEmployeeRule = (index: number) => {
    setFormState((previous) => ({
      ...previous,
      custom_salary_components: previous.custom_salary_components
        .filter((_, ruleIndex) => ruleIndex !== index)
        .map((rule, ruleIndex) => ({ ...rule, display_order: ruleIndex + 1 })),
    }));
  };

  const saveEmployee = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      const payload = {
        ...formState,
        date_of_joining: formState.date_of_joining || null,
        annual_ctc: formState.annual_ctc || '0',
        custom_salary_components: formState.custom_salary_components.map((rule, index) => ({
          ...rule,
          display_order: index + 1,
        })),
      };

      if (employeeId) {
        await PayrollService.updateEmployee(employeeId, payload);
        toastSuccess('Employee updated successfully');
      } else {
        await PayrollService.createEmployee(payload);
        toastSuccess('Employee created successfully');
      }

      navigate('/payroll/employees');
    } catch (error: any) {
      console.error('Failed to save employee:', error);
      toastError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PayrollWorkspace
      title={isEditing ? 'Edit Employee' : 'Add Employee'}
      actions={(
        <button
          type="button"
          onClick={() => navigate('/payroll/employees')}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={14} />
          Back To Employees
        </button>
      )}
    >
      {pageError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div> : null}

      <Panel
        title={isEditing ? 'Employee Details' : 'Create Employee'}
        icon={<UserRound size={18} />}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              form="employee-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
            >
              <Save size={14} />
              {submitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/payroll/employees')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              Cancel
            </button>
          </div>
        )}
      >
        {loading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Loading employee form...
          </div>
        ) : (
          <form id="employee-form" onSubmit={saveEmployee} className="space-y-6">
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {([
                ['employee_code', 'Employee Code'],
                ['full_name', 'Employee Name'],
                ['designation', 'Designation'],
                ['department', 'Department'],
                ['email', 'Email'],
                ['phone', 'Phone'],
                ['work_location', 'Work Location'],
                ['annual_ctc', 'Annual CTC'],
                ['bank_name', 'Bank Name'],
                ['bank_account_number', 'Bank Account No.'],
                ['bank_ifsc', 'Bank IFSC'],
                ['pan_number', 'PAN'],
                ['uan_number', 'UAN'],
                ['pf_number', 'PF Number'],
              ] as Array<[Exclude<keyof typeof formState, 'custom_salary_components' | 'is_active'>, string]>).map(([field, label]) => (
                <Field key={field} label={label}>
                  <input
                    type={field === 'annual_ctc' ? 'number' : field === 'email' ? 'email' : 'text'}
                    min={field === 'annual_ctc' ? '0' : undefined}
                    step={field === 'annual_ctc' ? '0.01' : undefined}
                    className="input-field py-2 text-sm"
                    value={String(formState[field] ?? '')}
                    onChange={(event) => setFormState((previous) => ({ ...previous, [field]: event.target.value }))}
                  />
                </Field>
              ))}
              <Field label="Date of Joining">
                <input type="date" className="input-field py-2 text-sm" value={formState.date_of_joining} onChange={(event) => setFormState((previous) => ({ ...previous, date_of_joining: event.target.value }))} />
              </Field>
              <Field label="Status">
                <select className="input-field py-2 text-sm" value={formState.is_active ? 'active' : 'inactive'} onChange={(event) => setFormState((previous) => ({ ...previous, is_active: event.target.value === 'active' }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Employee Rules</h3>
                  <p className="text-[11px] text-slate-500">Add custom earnings or deductions specifically for this employee.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => addEmployeeRule('')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 shadow-sm">
                    <Plus size={14} />
                    Add Rule
                  </button>
                </div>
              </div>

              {formState.custom_salary_components.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-4 py-8 text-center text-sm text-slate-400 italic">
                  No custom rules added to this employee.
                </div>
              ) : (
                <div className="table-scroll overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full table-fixed">
                    <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <tr>
                        <th className="px-3 py-3 w-[18%]">Name</th>
                        <th className="px-3 py-3 w-[12%]">Category</th>
                        <th className="px-3 py-3 w-[12%]">Formula</th>
                        <th className="px-3 py-3 w-[12%]">Base</th>
                        <th className="px-3 py-3 w-[12%]">Ref</th>
                        <th className="px-3 py-3 w-[10%]">Value</th>
                        <th className="px-3 py-3 w-[8%] text-center">Pr</th>
                        <th className="px-3 py-3 w-[8%] text-center">On</th>
                        <th className="px-3 py-3 w-12" />
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {formState.custom_salary_components.map((rule, index) => (
                        <tr key={`${rule.name}-${index}`} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="px-2 py-2"><input className="input-field h-9 py-1 text-xs" value={rule.name} onChange={(event) => handleEmployeeRuleChange(index, 'name', event.target.value)} placeholder="Rule Name" /></td>
                          <td className="px-2 py-2">
                            <select className="input-field h-9 py-1 text-xs" value={rule.category} onChange={(event) => handleEmployeeRuleChange(index, 'category', event.target.value)}>
                              <option value="earning">Earning</option>
                              <option value="deduction">Deduction</option>
                              <option value="employer_contribution">Employer</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <select className="input-field h-9 py-1 text-xs" value={rule.formula_type} onChange={(event) => handleEmployeeRuleChange(index, 'formula_type', event.target.value)}>
                              <option value="percentage">Percentage</option>
                              <option value="fixed">Fixed</option>
                              <option value="remainder">Remainder</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <select className="input-field h-9 py-1 text-xs" value={rule.basis} onChange={(event) => handleEmployeeRuleChange(index, 'basis', event.target.value)} disabled={rule.formula_type === 'fixed'}>
                              <option value="monthly_ctc">Monthly CTC</option>
                              <option value="gross_earnings">Gross Earnings</option>
                              <option value="component">Another Component</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <select className="input-field h-9 py-1 text-xs" value={rule.reference_component} onChange={(event) => handleEmployeeRuleChange(index, 'reference_component', event.target.value)} disabled={rule.formula_type === 'fixed' || rule.basis !== 'component'}>
                              <option value="">Select</option>
                              {getEmployeeRuleReferenceOptions(index).map((name) => <option key={`${name}-${index}`} value={name}>{name}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2"><input type="number" min="0" step="0.01" className="input-field h-9 py-1 text-xs" value={rule.value} onChange={(event) => handleEmployeeRuleChange(index, 'value', event.target.value)} /></td>
                          <td className="px-2 py-2 text-center"><input type="checkbox" checked={rule.apply_proration} onChange={(event) => handleEmployeeRuleChange(index, 'apply_proration', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" title="Apply Proration" /></td>
                          <td className="px-2 py-2 text-center"><input type="checkbox" checked={rule.is_active} onChange={(event) => handleEmployeeRuleChange(index, 'is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" title="Is Active" /></td>
                          <td className="px-2 py-2 text-center">
                            <button type="button" onClick={() => removeEmployeeRule(index)} className="group inline-flex items-center rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </form>
        )}
      </Panel>
    </PayrollWorkspace>
  );
};

export default PayrollEmployeeFormPage;
