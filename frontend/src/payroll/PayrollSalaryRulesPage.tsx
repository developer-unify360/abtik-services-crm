import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Save, ScrollText, Trash2 } from 'lucide-react';

import { PayrollService, type PayrollConfigurationUpdateData, type SalaryComponentRule } from './PayrollService';
import {
  Panel,
  PayrollWorkspace,
  initialConfigurationForm,
  makeSalaryRule,
  normalizeConfiguration,
  type ConfigurationFormState,
} from './payrollShared';

const PayrollSalaryRulesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<ConfigurationFormState>(initialConfigurationForm);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  const componentNameOptions = useMemo(
    () => formState.salary_components.map((rule) => rule.name.trim()).filter(Boolean),
    [formState.salary_components],
  );

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setPageError('');
      const configuration = await PayrollService.getConfiguration();
      setFormState(normalizeConfiguration(configuration));
    } catch (error) {
      console.error('Failed to load salary rules:', error);
      setPageError('Unable to load salary rules right now.');
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

  const handleRuleChange = (
    index: number,
    field: keyof SalaryComponentRule,
    value: string | number | boolean,
  ) => {
    setFormState((previous) => {
      const nextRules = previous.salary_components.map((rule, ruleIndex) => {
        if (ruleIndex !== index) {
          return rule;
        }

        const nextRule = { ...rule, [field]: value } as SalaryComponentRule;

        if (field === 'formula_type' && value === 'fixed') {
          nextRule.basis = 'monthly_ctc';
          nextRule.reference_component = '';
        }

        if (field === 'basis' && value !== 'component') {
          nextRule.reference_component = '';
        }

        return nextRule;
      });

      return { ...previous, salary_components: nextRules };
    });
  };

  const addRule = () => {
    setFormState((previous) => ({
      ...previous,
      salary_components: [
        ...previous.salary_components,
        makeSalaryRule(previous.salary_components.length + 1),
      ],
    }));
  };

  const removeRule = (index: number) => {
    setFormState((previous) => {
      const nextRules = previous.salary_components.filter((_, ruleIndex) => ruleIndex !== index);
      return {
        ...previous,
        salary_components: nextRules.length > 0
          ? nextRules.map((rule, ruleIndex) => ({ ...rule, display_order: ruleIndex + 1 }))
          : [makeSalaryRule(1)],
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
        leave_types: formState.leave_types,
        salary_components: formState.salary_components.map((rule, index) => ({
          ...rule,
          display_order: index + 1,
        })),
      };

      const updatedConfiguration = await PayrollService.updateConfiguration(payload);
      setFormState(normalizeConfiguration(updatedConfiguration));
      setToast('Salary rules saved.');
    } catch (error: any) {
      console.error('Failed to save salary rules:', error);
      const errorMessage =
        error.response?.data?.error?.message
        || error.response?.data?.detail
        || 'Unable to save salary rules.';
      setFormError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PayrollWorkspace
      title="Salary Rules"
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
            onClick={addRule}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus size={14} />
            Add Rule
          </button>
        </div>
      )}
    >
      {pageError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div> : null}

      <Panel
        title="Common Salary Rules"
        icon={<ScrollText size={18} />}
      >
        {loading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Loading salary rules...
          </div>
        ) : (
          <form onSubmit={saveConfiguration} className="space-y-3">
            <div className="table-scroll overflow-auto rounded-lg border border-slate-200">
              <table className="w-full table-fixed">
                <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Category</th>
                    <th className="px-2 py-2">Formula</th>
                    <th className="px-2 py-2">Base</th>
                    <th className="px-2 py-2">Ref</th>
                    <th className="px-2 py-2">Value</th>
                    <th className="px-2 py-2">Prorate</th>
                    <th className="px-2 py-2">Active</th>
                    <th className="px-2 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {formState.salary_components.map((rule, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-2 py-1.5"><input className="input-field py-1.5 text-xs" value={rule.name} onChange={(event) => handleRuleChange(index, 'name', event.target.value)} /></td>
                      <td className="px-2 py-1.5">
                        <select className="input-field py-1.5 text-xs" value={rule.category} onChange={(event) => handleRuleChange(index, 'category', event.target.value)}>
                          <option value="earning">Earning</option>
                          <option value="deduction">Deduction</option>
                          <option value="employer_contribution">Employer</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="input-field py-1.5 text-xs" value={rule.formula_type} onChange={(event) => handleRuleChange(index, 'formula_type', event.target.value)}>
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed</option>
                          <option value="remainder">Remainder</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="input-field py-1.5 text-xs" value={rule.basis} onChange={(event) => handleRuleChange(index, 'basis', event.target.value)} disabled={rule.formula_type === 'fixed'}>
                          <option value="monthly_ctc">Monthly CTC</option>
                          <option value="gross_earnings">Gross Earnings</option>
                          <option value="component">Another Component</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="input-field py-1.5 text-xs" value={rule.reference_component} onChange={(event) => handleRuleChange(index, 'reference_component', event.target.value)} disabled={rule.formula_type === 'fixed' || rule.basis !== 'component'}>
                          <option value="">Select</option>
                          {componentNameOptions.filter((name) => name !== rule.name.trim()).map((name) => <option key={`${name}-${index}`} value={name}>{name}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5"><input type="number" min="0" step="0.01" className="input-field py-1.5 text-xs" value={rule.value} onChange={(event) => handleRuleChange(index, 'value', event.target.value)} /></td>
                      <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={rule.apply_proration} onChange={(event) => handleRuleChange(index, 'apply_proration', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600" /></td>
                      <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={rule.is_active} onChange={(event) => handleRuleChange(index, 'is_active', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600" /></td>
                      <td className="px-2 py-1.5 text-center">
                        <button type="button" onClick={() => removeRule(index)} className="inline-flex items-center rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={14} />
                {submitting ? 'Saving...' : 'Save Salary Rules'}
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

export default PayrollSalaryRulesPage;
