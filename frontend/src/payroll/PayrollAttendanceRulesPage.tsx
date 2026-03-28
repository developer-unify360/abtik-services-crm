import React, { useEffect, useState } from 'react';
import { Plus, RefreshCcw, Save, Settings2, Trash2 } from 'lucide-react';

import { PayrollService, type LeaveTypeRule, type PayrollConfigurationUpdateData } from './PayrollService';
import {
  Field,
  Panel,
  PayrollWorkspace,
  initialConfigurationForm,
  makeLeaveTypeRule,
  normalizeConfiguration,
  type ConfigurationFormState,
} from './payrollShared';

const PayrollAttendanceRulesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<ConfigurationFormState>(initialConfigurationForm);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setPageError('');
      const configuration = await PayrollService.getConfiguration();
      setFormState(normalizeConfiguration(configuration));
    } catch (error) {
      console.error('Failed to load attendance rules:', error);
      setPageError('Unable to load attendance rules right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleLeaveTypeChange = (
    index: number,
    field: keyof LeaveTypeRule,
    value: string | boolean,
  ) => {
    setFormState((previous) => ({
      ...previous,
      leave_types: previous.leave_types.map((leaveType, leaveIndex) =>
        leaveIndex === index ? { ...leaveType, [field]: value } : leaveType,
      ),
    }));
  };

  const addLeaveType = (name = '', isPaid = true) => {
    setFormState((previous) => ({
      ...previous,
      leave_types: [
        ...previous.leave_types,
        makeLeaveTypeRule(previous.leave_types.length + 1, name, isPaid),
      ],
    }));
  };

  const removeLeaveType = (index: number) => {
    setFormState((previous) => {
      const nextLeaveTypes = previous.leave_types.filter((_, leaveIndex) => leaveIndex !== index);
      return {
        ...previous,
        leave_types: nextLeaveTypes.length > 0
          ? nextLeaveTypes.map((leaveType, leaveIndex) => ({ ...leaveType, display_order: leaveIndex + 1 }))
          : [makeLeaveTypeRule(1, 'Loss of Pay', false)],
      };
    });
  };

  const saveConfiguration = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFormError('');
      const payload: PayrollConfigurationUpdateData = {
        company_name: formState.company_name,
        company_address: formState.company_address,
        company_logo: formState.company_logo,
        remove_logo: formState.remove_logo,
        payslip_title: formState.payslip_title,
        default_working_days: formState.default_working_days || '30.00',
        currency: formState.currency || 'INR',
        leave_types: formState.leave_types.map((leaveType, index) => ({
          ...leaveType,
          display_order: index + 1,
        })),
        salary_components: formState.salary_components,
      };

      const updatedConfiguration = await PayrollService.updateConfiguration(payload);
      setFormState(normalizeConfiguration(updatedConfiguration));
      setToast('Attendance rules saved.');
    } catch (error: any) {
      console.error('Failed to save attendance rules:', error);
      const errorMessage =
        error.response?.data?.error?.message
        || error.response?.data?.detail
        || 'Unable to save attendance rules.';
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PayrollWorkspace
      title="Attendance Rules"
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadConfiguration}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={14} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => addLeaveType()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus size={14} />
            Add Leave Rule
          </button>
        </div>
      )}
    >
      {pageError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div> : null}

      <Panel
        title="Working Days And Leave Policies"
        icon={<Settings2 size={18} />}
      >
        {loading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Loading attendance rules...
          </div>
        ) : (
          <form onSubmit={saveConfiguration} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[240px_1fr]">
              <Field label="Default Working Days">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input-field py-2 text-sm"
                  value={formState.default_working_days}
                  onChange={(event) => setFormState((previous) => ({ ...previous, default_working_days: event.target.value }))}
                />
              </Field>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Leave Type Rules</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => addLeaveType('Casual Leave', true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                    <Plus size={14} />
                    Paid
                  </button>
                  <button type="button" onClick={() => addLeaveType('Loss of Pay', false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                    <Plus size={14} />
                    LOP
                  </button>
                </div>
              </div>

              <div className="table-scroll overflow-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full table-fixed">
                  <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-2 py-2">Leave Type</th>
                      <th className="px-2 py-2">Salary Impact</th>
                      <th className="px-2 py-2 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {formState.leave_types.map((leaveType, index) => (
                      <tr key={`${leaveType.name}-${index}`} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">
                          <input
                            className="input-field py-1.5 text-xs"
                            value={leaveType.name}
                            onChange={(event) => handleLeaveTypeChange(index, 'name', event.target.value)}
                            placeholder="Leave type name"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            className="input-field py-1.5 text-xs"
                            value={leaveType.is_paid ? 'paid' : 'unpaid'}
                            onChange={(event) => handleLeaveTypeChange(index, 'is_paid', event.target.value === 'paid')}
                          >
                            <option value="paid">Paid Leave</option>
                            <option value="unpaid">Unpaid / LOP</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button type="button" onClick={() => removeLeaveType(index)} className="inline-flex items-center rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={14} />
                {submitting ? 'Saving...' : 'Save Attendance Rules'}
              </button>
            </div>

            {formError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div> : null}
          </form>
        )}
      </Panel>

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </PayrollWorkspace>
  );
};

export default PayrollAttendanceRulesPage;
