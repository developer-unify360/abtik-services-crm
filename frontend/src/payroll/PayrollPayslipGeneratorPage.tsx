import { CheckSquare, ChevronDown, ChevronUp, Download, FileText, Plus, RefreshCcw, Save, Search, Square, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { toastError, toastSuccess } from '../services/toastNotify';

interface GeneratorRowState {
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
  const [pdfDownloadingKey, setPdfDownloadingKey] = useState('');
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [deletingPayslipId, setDeletingPayslipId] = useState('');
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(new Set());
  const [savedSearch, setSavedSearch] = useState('');
  const [savedEmployeeId, setSavedEmployeeId] = useState('');
  const [selectedSavedIds, setSelectedSavedIds] = useState<Set<string>>(new Set());
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

    setExpandedRowKeys((previous) => {
      const allowedKeys = new Set(generatedRows.map((row) => row.key));
      return new Set(Array.from(previous).filter((key) => allowedKeys.has(key)));
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
      total_days: null,
      paid_days_override: null,
      leave_breakdown: leaveBreakdown,
      notes: '',
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

  const toggleRowExpansion = (rowKey: string) => {
    setExpandedRowKeys((previous) => {
      const next = new Set(previous);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
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
    setExpandedRowKeys(new Set());
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
      toastError('Select at least one employee and one month to continue.');
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
            // Already handled by global interceptor if we wanted, 
            // but for batch saving, we might want to collect all and show one toast?
            // Actually, the interceptor is only for mutation calls. 
            // Let's let the interceptor handle individual errors as they happen? 
            // Promise.all will reject if any fail. 
            throw error;
          }
        }),
      );

      toastSuccess(`${generatedRows.length} payslip${generatedRows.length === 1 ? '' : 's'} saved.`);

      const payslipResponse = await PayrollService.listPayslips({ page_size: '100' });
      setPayslips(payslipResponse.results || payslipResponse);
    } catch (error: any) {
      // toastError(error); // Interceptor already does this
      console.error('Batch save failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadBatchGeneratorPdf = async () => {
    const readyPreviews = generatedRows
      .map((row) => previewMap[row.key]?.preview)
      .filter((preview): preview is PayslipPreview => !!preview);

    if (readyPreviews.length === 0) {
      return;
    }

    try {
      setBatchDownloading(true);
      for (const preview of readyPreviews) {
        await downloadPayslipPdf(preview);
        await new Promise((resolve) => window.setTimeout(resolve, 300));
      }
      toastSuccess('Bulk download complete.');
    } finally {
      setBatchDownloading(false);
    }
  };

  const downloadBatchSavedPdf = async () => {
    const selectedPayslips = payslips.filter((p) => selectedSavedIds.has(p.id));
    if (selectedPayslips.length === 0) {
      return;
    }

    try {
      setBatchDownloading(true);
      for (const payslip of selectedPayslips) {
        if (payslip.calculation_snapshot) {
          await downloadPayslipPdf(payslip.calculation_snapshot as PayslipPreview);
          await new Promise((resolve) => window.setTimeout(resolve, 300));
        }
      }
      toastSuccess(`${selectedPayslips.length} payslips downloaded.`);
    } finally {
      setBatchDownloading(false);
    }
  };

  const filteredSavedPayslips = useMemo(() => {
    return payslips.filter((payslip) => {
      const matchesSearch = !savedSearch ||
        payslip.employee_name.toLowerCase().includes(savedSearch.toLowerCase()) ||
        payslip.month_label.toLowerCase().includes(savedSearch.toLowerCase());
      const matchesEmployee = !savedEmployeeId || payslip.employee === savedEmployeeId;
      return matchesSearch && matchesEmployee;
    });
  }, [payslips, savedSearch, savedEmployeeId]);

  const toggleSavedSelection = (id: string) => {
    setSelectedSavedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllSavedSelection = () => {
    if (selectedSavedIds.size === filteredSavedPayslips.length) {
      setSelectedSavedIds(new Set());
    } else {
      setSelectedSavedIds(new Set(filteredSavedPayslips.map((p) => p.id)));
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
        leave_values: leaveValues,
      },
    });
    setExpandedRowKeys(new Set([key]));
  };

  const deleteSavedPayslip = async (payslip: PayslipRecord) => {
    if (!window.confirm(`Delete the saved payslip for ${payslip.employee_name} (${payslip.month_label})?`)) {
      return;
    }

    try {
      setDeletingPayslipId(payslip.id);
      await PayrollService.deletePayslip(payslip.id);
      setPayslips((previous) => previous.filter((item) => item.id !== payslip.id));
      setSelectedSavedIds((previous) => {
        const next = new Set(previous);
        next.delete(payslip.id);
        return next;
      });
      setExistingPayslipIdsByKey((previous) => Object.fromEntries(
        Object.entries(previous).filter(([, payslipId]) => payslipId !== payslip.id),
      ));
      toastSuccess(`Deleted saved payslip for ${payslip.employee_name}.`);
    } catch (error: any) {
      // toastError(error); // Interceptor handles this
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

        <Panel
          title="Employee-Month Rows"
          icon={<FileText size={18} />}
          actions={generatedRows.length > 0 && (
            <button
              type="button"
              onClick={downloadBatchGeneratorPdf}
              disabled={batchDownloading || !generatedRows.some((r) => previewMap[r.key]?.preview)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download size={14} />
              {batchDownloading ? 'Downloading...' : 'Download All Selected'}
            </button>
          )}
        >
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
                const isExpanded = expandedRowKeys.has(row.key);

                return (
                  <div key={row.key} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div
                      className={`flex cursor-pointer items-center justify-between gap-4 p-3 transition-colors hover:bg-slate-100/50 ${isExpanded ? 'border-b border-slate-200 bg-white' : ''}`}
                      onClick={() => toggleRowExpansion(row.key)}
                    >
                      <div className="flex flex-1 items-start gap-3">
                        <div className={`mt-0.5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronDown size={18} className="text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-slate-900">{row.employee.full_name}</h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                            <span>{row.employee.employee_code}</span>
                            <span className="text-slate-300">•</span>
                            <span>{formatMonthLabel(row.month)}</span>
                            {rowPreview && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-medium text-emerald-700">Net Pay: {currencyFormatter(rowPreview.summary.net_pay, rowPreview.company.currency)}</span>
                                <span className="text-slate-300">•</span>
                                <span>Paid Days: {rowPreview.summary.paid_days}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {existingPayslipIdsByKey[row.key] ? (
                          <span className="hidden badge badge-info sm:inline-flex">Editing</span>
                        ) : (
                          <span className="hidden badge badge-success sm:inline-flex">New</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadRowPdf(row.key);
                          }}
                          disabled={!rowPreview || pdfDownloadingKey === row.key}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <Download size={13} />
                          {pdfDownloadingKey === row.key ? '...' : 'PDF'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="grid gap-4 p-4 lg:grid-cols-2">
                        <div className="space-y-4">
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <h4 className="mb-3 text-sm font-semibold text-slate-900">Leave Inputs</h4>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {leaveTypes.map((leaveType) => (
                                <div key={`${row.key}-${leaveType.name}`} className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2 px-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{leaveType.name}</span>
                                    <span className={`text-[10px] font-bold uppercase ${leaveType.is_paid ? 'text-emerald-600' : 'text-amber-600'}`}>{leaveType.is_paid ? 'Paid' : 'Unpaid'}</span>
                                  </div>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="input-field h-9 text-sm"
                                    value={rowState.leave_values[leaveType.name] || ''}
                                    onChange={(event) => updateRowLeaveValue(row.key, leaveType.name, event.target.value)}
                                    placeholder="0.00"
                                  />
                                </div>
                              ))}
                            </div>
                            {leaveTypes.length === 0 && (
                              <p className="py-2 text-center text-xs text-slate-400 italic">No leave types configured.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-900 p-4 text-white">
                          <h4 className="mb-3 text-sm font-semibold text-white">Live Summary</h4>
                          {rowError ? (
                            <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-100">
                              {rowError}
                            </div>
                          ) : rowPreview ? (
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Monthly CTC</span>
                                <span className="font-medium">{currencyFormatter(rowPreview.summary.monthly_ctc, rowPreview.company.currency)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Paid Days</span>
                                <span className="font-medium">{rowPreview.summary.paid_days}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Gross Earnings</span>
                                <span className="font-medium">{currencyFormatter(rowPreview.summary.earnings_total, rowPreview.company.currency)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Deductions</span>
                                <span className="font-medium">{currencyFormatter(rowPreview.summary.deductions_total, rowPreview.company.currency)}</span>
                              </div>
                              <div className="mt-4 border-t border-white/10 pt-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Net Pay</p>
                                <p className="mt-1 text-2xl font-black tracking-tight">{currencyFormatter(rowPreview.summary.net_pay, rowPreview.company.currency)}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="py-4 text-center text-xs text-slate-500">Waiting for preview calculation...</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Saved Payslips"
        icon={<FileText size={18} />}
        actions={(
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search payslips..."
                className="input-field h-9 min-w-[200px] pl-9 text-xs"
                value={savedSearch}
                onChange={(e) => setSavedSearch(e.target.value)}
              />
            </div>
            <select
              className="input-field h-9 max-w-[180px] text-xs"
              value={savedEmployeeId}
              onChange={(e) => setSavedEmployeeId(e.target.value)}
            >
              <option value="">All Employees</option>
              {activeEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
            {selectedSavedIds.size > 0 && (
              <button
                type="button"
                onClick={downloadBatchSavedPdf}
                disabled={batchDownloading}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Download size={14} />
                Download ({selectedSavedIds.size})
              </button>
            )}
          </div>
        )}
      >
        <div className="mb-3 flex gap-2 sm:hidden">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search..."
              className="input-field h-9 pl-9 text-xs"
              value={savedSearch}
              onChange={(e) => setSavedSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Loading saved payslips...
          </div>
        ) : (
          <div className="table-scroll overflow-auto rounded-xl border border-slate-200">
            <table className="w-full table-fixed">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="w-12 px-3 py-2.5 text-center">
                    <button type="button" onClick={toggleAllSavedSelection} className="text-slate-400 hover:text-slate-600">
                      {selectedSavedIds.size === filteredSavedPayslips.length && filteredSavedPayslips.length > 0 ? (
                        <CheckSquare size={16} className="text-emerald-600" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2.5">Month</th>
                  <th className="px-3 py-2.5">Employee</th>
                  <th className="px-3 py-2.5 text-right">Net Pay</th>
                  <th className="px-3 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredSavedPayslips.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No matching payslips found.</td></tr>
                ) : filteredSavedPayslips.map((payslip) => (
                  <tr key={payslip.id} className={`border-t border-slate-100 transition-colors ${selectedSavedIds.has(payslip.id) ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => toggleSavedSelection(payslip.id)} className="text-slate-400 hover:text-slate-600">
                        {selectedSavedIds.has(payslip.id) ? (
                          <CheckSquare size={16} className="text-emerald-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td className="truncate px-3 py-2 font-medium text-slate-800">{payslip.month_label}</td>
                    <td className="truncate px-3 py-2">{payslip.employee_name}</td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">{currencyFormatter(payslip.net_pay, configuration?.currency || 'INR')}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => reuseExistingPayslip(payslip)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                          Reuse
                        </button>
                        <button type="button" onClick={() => deleteSavedPayslip(payslip)} disabled={deletingPayslipId === payslip.id} className="inline-flex items-center gap-1 rounded-lg px-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                          <Trash2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadPayslipPdf(payslip.calculation_snapshot as PayslipPreview)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 text-slate-700 hover:bg-slate-100"
                        >
                          <Download size={14} />
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
    </PayrollWorkspace>
  );
};

export default PayrollPayslipGeneratorPage;
