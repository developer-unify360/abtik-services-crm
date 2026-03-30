import React, { useEffect, useState } from 'react';
import { Building2, RefreshCcw, Save } from 'lucide-react';

import { PayrollService, type PayrollConfigurationUpdateData } from './PayrollService';
import {
  Field,
  Panel,
  PayrollWorkspace,
  initialConfigurationForm,
  normalizeAssetUrl,
  normalizeConfiguration,
  type ConfigurationFormState,
} from './payrollShared';
import { toastError, toastSuccess } from '../services/toastNotify';

const PayrollCompanySetupPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState<ConfigurationFormState>(initialConfigurationForm);
  const [pageError, setPageError] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setPageError('');
      const configuration = await PayrollService.getConfiguration();
      setFormState(normalizeConfiguration(configuration));
    } catch (error) {
      console.error('Failed to load payroll configuration:', error);
      setPageError('Unable to load company payroll settings right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  useEffect(() => {
    let objectUrl = '';
    if (formState.company_logo) {
      objectUrl = URL.createObjectURL(formState.company_logo);
      setLogoPreviewUrl(objectUrl);
    } else if (formState.remove_logo) {
      setLogoPreviewUrl('');
    } else {
      setLogoPreviewUrl(formState.existing_logo_url || '');
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [formState.company_logo, formState.existing_logo_url, formState.remove_logo]);

  const handleFieldChange = (
    field: keyof ConfigurationFormState,
    value: string | boolean | File | null,
  ) => {
    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const saveConfiguration = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      const payload: PayrollConfigurationUpdateData = {
        company_name: formState.company_name,
        company_address: formState.company_address,
        company_logo: formState.company_logo,
        remove_logo: formState.remove_logo,
        payslip_title: formState.payslip_title,
        default_working_days: formState.default_working_days || '30.00',
        currency: formState.currency || 'INR',
        leave_types: formState.leave_types,
        salary_components: formState.salary_components,
      };

      const updatedConfiguration = await PayrollService.updateConfiguration(payload);
      setFormState(normalizeConfiguration(updatedConfiguration));
      toastSuccess('Company payroll setup saved.');
    } catch (error: any) {
      console.error('Failed to save company payroll setup:', error);
      toastError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PayrollWorkspace
      title="Company Setup"
      actions={(
        <button
          type="button"
          onClick={loadConfiguration}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCcw size={14} />
          Refresh
        </button>
      )}
    >
      {pageError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div> : null}

      <Panel
        title="Company Details"
        icon={<Building2 size={18} />}
      >
        {loading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Loading payroll company settings...
          </div>
        ) : (
          <form onSubmit={saveConfiguration} className="space-y-3">
            <div className="grid gap-3 xl:grid-cols-[1.2fr_0.85fr]">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Company Name">
                  <input
                    className="input-field py-2 text-sm"
                    value={formState.company_name}
                    onChange={(event) => handleFieldChange('company_name', event.target.value)}
                  />
                </Field>
                <Field label="Payslip Title">
                  <input
                    className="input-field py-2 text-sm"
                    value={formState.payslip_title}
                    onChange={(event) => handleFieldChange('payslip_title', event.target.value)}
                  />
                </Field>
                <Field label="Currency">
                  <input
                    className="input-field py-2 text-sm"
                    value={formState.currency}
                    onChange={(event) => handleFieldChange('currency', event.target.value)}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Company Address">
                    <textarea
                      className="input-field min-h-[100px] resize-none py-2 text-sm"
                      value={formState.company_address}
                      onChange={(event) => handleFieldChange('company_address', event.target.value)}
                    />
                  </Field>
                </div>
              </div>
              <Field label="Company Logo">
                <div className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {logoPreviewUrl ? (
                      <img
                        src={normalizeAssetUrl(logoPreviewUrl)}
                        alt="Company logo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-sm text-slate-400">No logo uploaded yet</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          handleFieldChange('company_logo', event.target.files?.[0] || null);
                          handleFieldChange('remove_logo', false);
                        }}
                      />
                    </label>
                    {logoPreviewUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleFieldChange('company_logo', null);
                          handleFieldChange('remove_logo', true);
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={14} />
                {submitting ? 'Saving...' : 'Save Company Setup'}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </PayrollWorkspace>
  );
};

export default PayrollCompanySetupPage;
