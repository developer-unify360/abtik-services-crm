import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';

import MultiSelect from '../components/MultiSelect';
import { downloadPayslipPdf } from './payslipPdf';
import {
  PayrollService,
  type LeaveBreakdownEntry,
  type PayrollConfiguration,
  type PayrollEmployee,
  type PayslipPreview,
  type PayslipRecord,
  type PayslipWriteData,
} from './PayrollService';
import { Field, Panel, PayrollWorkspace, currencyFormatter } from './payrollShared';

interface GeneratorRowState {
  total_days: string;
  paid_days_override: string;
  notes: string;
  leave_values: Record<string, string>;
}

const createRowKey = (employeeId: string, month: string) => `${employeeId}::${month}`;

const formatMonthLabel = (monthValue: string) => {
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) {
    return monthValue;
  }

  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

const buildEmptyRowState = (leaveTypes: PayrollConfiguration['leave_types']): GeneratorRowState => ({
  total_days: '',
  paid_days_override: '',
  notes: '',
  leave_values: Object.fromEntries(leaveTypes.map((leaveType) => [leaveType.name, ''])),
});

const PayrollPayslipGeneratorPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [configuration, setConfiguration] = useState<PayrollConfiguration | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [monthPickerValue, setMonthPickerValue] = useState(new Date().toISOString().slice(0, 7));
  const [rowStateByKey, setRowStateByKey] = useState<Record<string, GeneratorRowState>>({});
  const [existingPayslipIdsByKey, setExistingPayslipIdsByKey] = useState<Record<string, string>>({});
  const [previewMap, setPreviewMap] = useState<Record<string, { preview?: PayslipPreview; error?: string }>>({});
  const [pageError, setPageError] = useState('');
  const [toast, setToast] = useState('');
  const [pdfDownloadingKey, setPdfDownloadingKey] = useState('');
  const [deletingPayslipId, setDeletingPayslipId] = useState('');
  const previewRequestId = useRef(0);

  const leaveTypes = configuration?.leave_types || [];
  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active).slice().sort((left, right) => left.full_name.localeCompare(right.full_name)),
    [employees],
  );

  const employeeOptions = useMemo(
    () => activeEmployees.map((employee) => ({
      value: employee.id,
      label: `${employee.full_name} - ${employee.employee_code}`,
    })),
    [activeEmployees],
  );

  const generatedRows = useMemo(() => {
    const employeeMap = new Map(activeEmployees.map((employee) => [employee.id, employee]));
    const months = selectedMonths.slice().sort();
    const rows: Array<{ key: string; employee: PayrollEmployee; month: string }> = [];

    months.forEach((month) => {
      selectedEmployeeIds.forEach((employeeId) => {
        const employee = employeeMap.get(employeeId);
        if (!employee) {
          return;
        }

        rows.push({
          key: createRowKey(employee.id, month),
          employee,
          month,
        });
      });
    });

    return rows;
  }, [activeEmployees, selectedEmployeeIds, selectedMonths]);

  const loadData = async () => {
    try {
      setLoading(true);
      setPageError('');
      const [configurationResponse, employeeResponse, payslipResponse] = await Promise.all([
        PayrollService.getConfiguration(),
        PayrollService.listEmployees({ page_size: '200' }),
        PayrollService.listPayslips({ page_size: '100' }),
      ]);

      setConfiguration(configurationResponse);
      setEmployees(employeeResponse.results || employeeResponse);
      setPayslips(payslipResponse.results || payslipResponse);
    } catch (error) {
      console.error('Failed to load payslip generator:', error);
      setPageError('Unable to load the payslip generator right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(''), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!configuration) {
      return;
    }

    setRowStateByKey((previous) => {
      const nextState: Record<string, GeneratorRowState> = {};

      generatedRows.forEach((row) => {
        const previousState = previous[row.key];
        const normalizedLeaveValues = Object.fromEntries(
          leaveTypes.map((leaveType) => [leaveType.name, previousState?.leave_values?.[leaveType.name] || '']),
        );

        nextState[row.key] = previousState
          ? { ...previousState, leave_values: normalizedLeaveValues }
          : buildEmptyRowState(leaveTypes);
      });

      return nextState;
    });

    setExistingPayslipIdsByKey((previous) => {
      const allowedKeys = new Set(generatedRows.map((row) => row.key));
      return Object.fromEntries(
        Object.entries(previous).filter(([key]) => allowedKeys.has(key)),
      );
    });
  }, [configuration, generatedRows, leaveTypes]);

  const buildRowPayload = (rowKey: string, employeeId: string, month: string): PayslipWriteData => {
    const rowState = rowStateByKey[rowKey] || buildEmptyRowState(leaveTypes);

    const leaveBreakdown: LeaveBreakdownEntry[] = leaveTypes
      .map((leaveType) => ({
        name: leaveType.name,
        days: rowState.leave_values[leaveType.name] || '0',
        is_paid: leaveType.is_paid,
      }))
      .filter((leave) => Number(leave.days || '0') > 0);

    return {
      employee: employeeId,
      month: `${month}-01`,
      total_days: rowState.total_days || null,
      paid_days_override: rowState.paid_days_override || null,
      leave_breakdown: leaveBreakdown,
      notes: rowState.notes,
    };
  };

  useEffect(() => {
    if (!generatedRows.length || !configuration) {
      setPreviewMap({});
      setPreviewLoading(false);
      return undefined;
    }

    const currentRequestId = ++previewRequestId.current;
    const timer = window.setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const previewEntries = await Promise.all(
          generatedRows.map(async (row) => {
            try {
              const preview = await PayrollService.previewPayslip(
                buildRowPayload(row.key, row.employee.id, row.month),
              );
              return [row.key, { preview }] as const;
            } catch (error: any) {
              const errorMessage =
                error.response?.data?.error?.message
                || error.response?.data?.detail
                || 'Unable to preview this payslip.';
              return [row.key, { error: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage) }] as const;
            }
          }),
        );

        if (previewRequestId.current === currentRequestId) {
          setPreviewMap(Object.fromEntries(previewEntries));
        }
      } finally {
        if (previewRequestId.current === currentRequestId) {
          setPreviewLoading(false);
        }
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [configuration, generatedRows, JSON.stringify(rowStateByKey)]);

  const addMonthSelection = () => {
    if (!monthPickerValue) {
      return;
    }

    setSelectedMonths((previous) => (
      previous.includes(monthPickerValue)
        ? previous
        : [...previous, monthPickerValue].sort()
    ));
  };

  const removeMonthSelection = (month: string) => {
    setSelectedMonths((previous) => previous.filter((item) => item !== month));
  };

  const updateRowField = (rowKey: string, field: keyof Omit<GeneratorRowState, 'leave_values'>, value: string) => {
    setRowStateByKey((previous) => ({
      ...previous,
      [rowKey]: {
        ...(previous[rowKey] || buildEmptyRowState(leaveTypes)),
        [field]: value,
      },
    }));
  };

  const updateRowLeaveValue = (rowKey: string, leaveName: string, value: string) => {
    setRowStateByKey((previous) => ({
      ...previous,
      [rowKey]: {
        ...(previous[rowKey] || buildEmptyRowState(leaveTypes)),
        leave_values: {
          ...((previous[rowKey] || buildEmptyRowState(leaveTypes)).leave_values),
          [leaveName]: value,
        },
      },
    }));
  };

  const clearGenerator = () => {
    setSelectedEmployeeIds([]);
    setSelectedMonths([]);
    setRowStateByKey({});
    setExistingPayslipIdsByKey({});
    setPreviewMap({});
    setPageError('');
  };

  const downloadRowPdf = async (rowKey: string) => {
    const preview = previewMap[rowKey]?.preview;
    if (!preview) {
      return;
    }

    try {
      setPdfDownloadingKey(rowKey);
      await downloadPayslipPdf(preview);
    } finally {
      setPdfDownloadingKey('');
    }
  };

  const savePayslips = async () => {
    if (!generatedRows.length) {
      setPageError('Select at least one employee and one month to continue.');
      return;
    }

    try {
      setSubmitting(true);
      setPageError('');

      const results = await Promise.all(
        generatedRows.map(async (row) => {
          const payload = buildRowPayload(row.key, row.employee.id, row.month);
          const rowLabel = `${row.employee.full_name} - ${formatMonthLabel(row.month)}`;
          try {
            const existingPayslipId = existingPayslipIdsByKey[row.key];
            if (existingPayslipId) {
              await PayrollService.updatePayslip(existingPayslipId, payload);
            } else {
              const createdPayslip = await PayrollService.createPayslip(payload);
              return { rowKey: row.key, rowLabel, payslipId: createdPayslip.id };
            }
            return { rowKey: row.key, rowLabel, payslipId: existingPayslipIdsByKey[row.key] };
          } catch (error: any) {
            const errorMessage =
              error.response?.data?.error?.message
              || error.response?.data?.detail
              || 'Unable to save this payslip.';
            return { rowKey: row.key, rowLabel, error: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage) };
          }
        }),
      );

      const failedRows = results.filter((result) => 'error' in result);
      if (failedRows.length > 0) {
        setPageError(failedRows.map((result) => `${result.rowLabel}: ${result.error}`).join(' | '));
      } else {
        setToast(`${generatedRows.length} payslip${generatedRows.length === 1 ? '' : 's'} saved.`);
      }

      const payslipResponse = await PayrollService.listPayslips({ page_size: '100' });
      setPayslips(payslipResponse.results || payslipResponse);
    } finally {
      setSubmitting(false);
    }
  };

  const reuseExistingPayslip = (payslip: PayslipRecord) => {
    const month = payslip.month.slice(0, 7);
    const key = createRowKey(payslip.employee, month);
    const leaveValues = Object.fromEntries(
      leaveTypes.map((leaveType) => {
        const matchingLeave = payslip.leave_breakdown.find((leave) => leave.name === leaveType.name);
        return [leaveType.name, matchingLeave?.days || ''];
      }),
    );

    setSelectedEmployeeIds([payslip.employee]);
    setSelectedMonths([month]);
    setExistingPayslipIdsByKey({ [key]: payslip.id });
    setRowStateByKey({
      [key]: {
        total_days: payslip.total_days || '',
        paid_days_override: payslip.paid_days || '',
        notes: payslip.notes || '',
        leave_values: leaveValues,
      },
    });
  };

  const deleteSavedPayslip = async (payslip: PayslipRecord) => {
    if (!window.confirm(`Delete the saved payslip for ${payslip.employee_name} (${payslip.month_label})?`)) {
      return;
    }

    try {
      setDeletingPayslipId(payslip.id);
      setPageError('');
      await PayrollService.deletePayslip(payslip.id);
      setPayslips((previous) => previous.filter((item) => item.id !== payslip.id));
      setExistingPayslipIdsByKey((previous) => Object.fromEntries(
        Object.entries(previous).filter(([, payslipId]) => payslipId !== payslip.id),
      ));
      setToast(`Deleted saved payslip for ${payslip.employee_name}.`);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message
        || error.response?.data?.detail
        || 'Unable to delete this payslip.';
      setPageError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setDeletingPayslipId('');
    }
  };

  return (
    <PayrollWorkspace
      title="Payslip Generator"
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCcw size={14} />
            Refresh
          </button>
          <button
            type="button"
            onClick={clearGenerator}
            className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Clear Selection
          </button>
        </div>
      )}
    >
      {pageError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.35fr]">
        <Panel title="Batch Selection" icon={<FileText size={18} />}>
          {loading ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Loading payslip generator...
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="Employees">
                <MultiSelect
                  options={employeeOptions}
                  value={selectedEmployeeIds}
                  onChange={setSelectedEmployeeIds}
                  placeholder="Choose employees"
                  searchPlaceholder="Search employees..."
                  emptyMessage="No active employees found."
                  itemLabelSingular="employee"
                  itemLabelPlural="employees"
                  emptySelectionHint="Search and select one or more employees for payslip generation."
                  compact
                />
              </Field>

              <div className="space-y-2">
                <Field label="Months">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input type="month" className="input-field text-sm" value={monthPickerValue} onChange={(event) => setMonthPickerValue(event.target.value)} />
                    <button type="button" onClick={addMonthSelection} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <Plus size={14} />
                      Add Month
                    </button>
                  </div>
                </Field>
                <div className="flex flex-wrap gap-2">
                  {selectedMonths.length > 0 ? selectedMonths.map((month) => (
                    <button key={month} type="button" onClick={() => removeMonthSelection(month)} className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                      {formatMonthLabel(month)}
                      <span className="text-emerald-500">x</span>
                    </button>
                  )) : <span className="text-sm text-slate-500">No months selected yet.</span>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-white px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Rows Ready</p>
                    <p className="mt-1 text-base font-bold text-slate-900">{generatedRows.length}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Standard Working Days</p>
                    <p className="mt-1 text-base font-bold text-slate-900">{configuration?.default_working_days || '30.00'}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={savePayslips} disabled={submitting || generatedRows.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                    <Save size={14} />
                    {submitting ? 'Saving...' : `Save ${generatedRows.length || ''} Payslip${generatedRows.length === 1 ? '' : 's'}`}
                  </button>
                  {previewLoading ? <span className="text-xs font-medium text-emerald-700">Refreshing previews...</span> : null}
                </div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Employee-Month Rows" icon={<FileText size={18} />}>
          {!generatedRows.length ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Select employees and months to create payroll rows here.
            </div>
          ) : (
            <div className="space-y-3">
              {generatedRows.map((row) => {
                const rowState = rowStateByKey[row.key] || buildEmptyRowState(leaveTypes);
                const rowPreview = previewMap[row.key]?.preview;
                const rowError = previewMap[row.key]?.error;

                return (
                  <div key={row.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{row.employee.full_name}</h3>
                        <p className="text-xs text-slate-600">{`${row.employee.employee_code} - ${formatMonthLabel(row.month)}`}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {existingPayslipIdsByKey[row.key] ? <span className="badge badge-info">Editing Saved Payslip</span> : <span className="badge badge-success">New Payslip</span>}
                        <button type="button" onClick={() => downloadRowPdf(row.key)} disabled={!rowPreview || pdfDownloadingKey === row.key} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
                          <Download size={14} />
                          {pdfDownloadingKey === row.key ? 'Preparing...' : 'PDF'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 xl:grid-cols-[1.25fr_0.95fr]">
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-3">
                          <Field label="Working Days Override">
                            <input type="number" min="0.01" step="0.01" className="input-field text-sm" value={rowState.total_days} onChange={(event) => updateRowField(row.key, 'total_days', event.target.value)} />
                          </Field>
                          <Field label="Paid Days Override">
                            <input type="number" min="0" step="0.01" className="input-field text-sm" value={rowState.paid_days_override} onChange={(event) => updateRowField(row.key, 'paid_days_override', event.target.value)} />
                          </Field>
                          <Field label="Notes">
                            <input className="input-field text-sm" value={rowState.notes} onChange={(event) => updateRowField(row.key, 'notes', event.target.value)} />
                          </Field>
                        </div>

                        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                          <h4 className="text-sm font-semibold text-slate-900">Leave Inputs</h4>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {leaveTypes.map((leaveType) => (
                              <label key={`${row.key}-${leaveType.name}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-slate-900">{leaveType.name}</span>
                                  <span className={`badge ${leaveType.is_paid ? 'badge-success' : 'badge-warning'}`}>{leaveType.is_paid ? 'Paid' : 'Unpaid'}</span>
                                </div>
                                <input type="number" min="0" step="0.01" className="input-field mt-2 text-sm" value={rowState.leave_values[leaveType.name] || ''} onChange={(event) => updateRowLeaveValue(row.key, leaveType.name, event.target.value)} placeholder="0.00" />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-900 px-3 py-3 text-white">
                        <h4 className="text-sm font-semibold text-white">Live Summary</h4>
                        {rowError ? (
                          <div className="mt-2.5 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-100">
                            {rowError}
                          </div>
                        ) : rowPreview ? (
                          <div className="mt-2.5 space-y-1.5 text-sm">
                            <div className="flex items-center justify-between"><span className="text-slate-300">Monthly CTC</span><span>{currencyFormatter(rowPreview.summary.monthly_ctc, rowPreview.company.currency)}</span></div>
                            <div className="flex items-center justify-between"><span className="text-slate-300">Paid Days</span><span>{rowPreview.summary.paid_days}</span></div>
                            <div className="flex items-center justify-between"><span className="text-slate-300">LWP</span><span>{rowPreview.summary.leave_without_pay_days}</span></div>
                            <div className="flex items-center justify-between"><span className="text-slate-300">Gross Earnings</span><span>{currencyFormatter(rowPreview.summary.earnings_total, rowPreview.company.currency)}</span></div>
                            <div className="flex items-center justify-between"><span className="text-slate-300">Deductions</span><span>{currencyFormatter(rowPreview.summary.deductions_total, rowPreview.company.currency)}</span></div>
                            <div className="flex items-center justify-between"><span className="text-slate-300">Loss Of Pay</span><span>{currencyFormatter(rowPreview.summary.loss_of_pay_amount, rowPreview.company.currency)}</span></div>
                            <div className="mt-3 border-t border-white/10 pt-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Net Pay</p>
                              <p className="mt-1 text-2xl font-black tracking-tight">{currencyFormatter(rowPreview.summary.net_pay, rowPreview.company.currency)}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2.5 text-sm text-slate-300">Waiting for preview...</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Saved Payslips" icon={<FileText size={18} />}>
        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Loading saved payslips...
          </div>
        ) : (
          <div className="table-scroll overflow-auto rounded-xl border border-slate-200">
            <table className="w-full table-fixed">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Month</th>
                  <th className="px-3 py-2.5">Employee</th>
                  <th className="px-3 py-2.5 text-right">Paid Days</th>
                  <th className="px-3 py-2.5 text-right">Net Pay</th>
                  <th className="px-3 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {payslips.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No payslips saved yet.</td></tr>
                ) : payslips.map((payslip) => (
                  <tr key={payslip.id} className="border-t border-slate-100">
                    <td className="truncate px-3 py-2 font-medium text-slate-800">{payslip.month_label}</td>
                    <td className="truncate px-3 py-2">{payslip.employee_name}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{payslip.paid_days}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{currencyFormatter(payslip.net_pay, configuration?.currency || 'INR')}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => reuseExistingPayslip(payslip)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                          Reuse In Generator
                        </button>
                        <button type="button" onClick={() => deleteSavedPayslip(payslip)} disabled={deletingPayslipId === payslip.id} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
                          <Trash2 size={12} />
                          {deletingPayslipId === payslip.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

export default PayrollPayslipGeneratorPage;
