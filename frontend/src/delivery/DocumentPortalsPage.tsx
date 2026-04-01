import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';

import { hasAdminAccess, useAuthStore } from '../auth/authStore';
import { ClientService, type Client } from '../clients/ClientService';
import {
  DocumentPortalApi,
  type ClientDocumentPortal,
  type DocumentPortalCreateData,
} from '../services/api/ServiceApi';

interface RequirementDraft {
  id?: string;
  label: string;
  description: string;
  is_required: boolean;
  sort_order: number;
}

const emptyRequirement = (sortOrder: number): RequirementDraft => ({
  label: '',
  description: '',
  is_required: true,
  sort_order: sortOrder,
});

const emptyPortalForm = (): DocumentPortalCreateData => ({
  client: '',
  title: '',
  instructions: '',
  is_active: true,
  requirements: [emptyRequirement(0)],
});

const buildPortalUrl = (token: string) => `${window.location.origin}/documents/upload/${token}`;

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.error?.message
  || error?.response?.data?.detail
  || error?.message
  || fallback;

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not shared yet';
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const compactFieldClass = 'input-field mt-1.5 py-1.5 text-sm';
const compactLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500';

const DocumentPortalsPage: React.FC = () => {
  const authUser = useAuthStore((state) => state.user);
  const isAdmin = hasAdminAccess(authUser);

  const [clients, setClients] = useState<Client[]>([]);
  const [portals, setPortals] = useState<ClientDocumentPortal[]>([]);
  const [selectedPortalId, setSelectedPortalId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DocumentPortalCreateData>(emptyPortalForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedPortal = useMemo(
    () => portals.find((portal) => portal.id === selectedPortalId) || null,
    [portals, selectedPortalId],
  );
  const portalStats = useMemo(() => ({
    total: portals.length,
    active: portals.filter((portal) => portal.is_active).length,
  }), [portals]);

  const hydrateForm = (portal: ClientDocumentPortal | null) => {
    if (!portal) {
      setFormData(emptyPortalForm());
      return;
    }

    setFormData({
      client: portal.client,
      title: portal.title || '',
      instructions: portal.instructions || '',
      is_active: portal.is_active,
      requirements: portal.requirements.map((requirement) => ({
        id: requirement.id,
        label: requirement.label,
        description: requirement.description || '',
        is_required: requirement.is_required,
        sort_order: requirement.sort_order,
      })),
    });
  };

  const loadPage = async () => {
    try {
      setIsLoading(true);
      const [clientResponse, portalResponse] = await Promise.all([
        ClientService.list({ page_size: '200' }),
        DocumentPortalApi.list(),
      ]);

      const clientResults = Array.isArray(clientResponse) ? clientResponse : clientResponse?.results || [];
      const portalResults = Array.isArray(portalResponse) ? portalResponse : [];

      setClients(clientResults);
      setPortals(portalResults);
    } catch (error: any) {
      setSnackbar({ type: 'error', message: getErrorMessage(error, 'Unable to load document portals.') });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!selectedPortalId) {
      return;
    }

    const matchingPortal = portals.find((portal) => portal.id === selectedPortalId) || null;
    hydrateForm(matchingPortal);
  }, [portals, selectedPortalId]);

  const setRequirement = (index: number, field: keyof RequirementDraft, value: string | boolean | number) => {
    setFormData((current) => ({
      ...current,
      requirements: current.requirements.map((requirement, requirementIndex) => (
        requirementIndex === index
          ? { ...requirement, [field]: value }
          : requirement
      )),
    }));
  };

  const addRequirement = () => {
    setFormData((current) => ({
      ...current,
      requirements: [...current.requirements, emptyRequirement(current.requirements.length)],
    }));
  };

  const removeRequirement = (index: number) => {
    setFormData((current) => {
      const nextRequirements = current.requirements.filter((_, requirementIndex) => requirementIndex !== index)
        .map((requirement, requirementIndex) => ({ ...requirement, sort_order: requirementIndex }));

      return {
        ...current,
        requirements: nextRequirements.length > 0 ? nextRequirements : [emptyRequirement(0)],
      };
    });
  };

  const resetForm = () => {
    setSelectedPortalId(null);
    setFormData(emptyPortalForm());
  };

  const handleSave = async () => {
    if (!isAdmin) {
      return;
    }

    try {
      setIsSaving(true);
      const payload: DocumentPortalCreateData = {
        ...formData,
        requirements: formData.requirements.map((requirement, index) => ({
          id: requirement.id,
          label: requirement.label,
          description: requirement.description,
          is_required: requirement.is_required,
          sort_order: index,
        })),
      };

      const savedPortal = selectedPortal
        ? await DocumentPortalApi.update(selectedPortal.id, payload)
        : await DocumentPortalApi.save(payload);

      await loadPage();
      setSelectedPortalId(savedPortal.id);
      hydrateForm(savedPortal);
      setSnackbar({ type: 'success', message: 'Document portal saved successfully.' });
    } catch (error: any) {
      setSnackbar({ type: 'error', message: getErrorMessage(error, 'Unable to save the document portal.') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyPortal = async (portal: ClientDocumentPortal) => {
    try {
      await navigator.clipboard.writeText(buildPortalUrl(portal.token));
      if (isAdmin) {
        await DocumentPortalApi.markShared(portal.id);
        await loadPage();
      }
      setSnackbar({ type: 'success', message: `Copied public URL for ${portal.company_name}.` });
    } catch (error: any) {
      setSnackbar({ type: 'error', message: getErrorMessage(error, 'Unable to copy the public URL.') });
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col space-y-3 overflow-x-hidden">
      <div className="shrink-0 min-w-0 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">
              {portalStats.active} active of {portalStats.total} portals
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadPage}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
            >
              <Plus size={14} />
              New Portal
            </button>
          </div>
        </div>
      </div>

      {!isAdmin ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Only admins can create or modify document portals. You can still view existing portal URLs and requested document lists.
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(280px,0.88fr)_minmax(0,1.12fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Existing Portals</h2>
            <p className="mt-0.5 text-xs text-slate-500">Pick a portal to edit or copy a client URL.</p>
          </div>

          {isLoading ? (
            <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-slate-500">Loading portals...</div>
          ) : portals.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-4 py-10 text-sm text-slate-500">No document portals created yet.</div>
          ) : (
            <div className="table-scroll flex-1 divide-y divide-slate-100 overflow-y-auto">
              {portals.map((portal) => (
                <div key={portal.id} className={`px-4 py-3 ${selectedPortalId === portal.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPortalId(portal.id);
                        hydrateForm(portal);
                      }}
                      className="min-w-0 text-left"
                    >
                      <p className="text-sm font-semibold text-slate-900">{portal.company_name}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{portal.client_name}</p>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        {portal.required_documents_count} requested | {portal.submitted_documents_count} uploaded
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">Last shared: {formatDate(portal.last_shared_at)}</p>
                    </button>

                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${portal.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {portal.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPortal(portal)}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <Copy size={13} />
                        Copy URL
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">{selectedPortal ? 'Edit Portal' : 'Create Portal'}</h2>
            <p className="mt-0.5 text-xs text-slate-500">Update the client, public link settings, and checklist in one place.</p>
          </div>

          <div className="table-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className={compactLabelClass}>Client</span>
                <select
                  className={compactFieldClass}
                  value={formData.client}
                  onChange={(event) => setFormData((current) => ({ ...current, client: event.target.value }))}
                  disabled={!isAdmin}
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company_name} | {client.client_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={compactLabelClass}>Portal Title</span>
                <input
                  className={compactFieldClass}
                  value={formData.title || ''}
                  onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Example: ABC Pvt Ltd Upload Portal"
                  disabled={!isAdmin}
                />
              </label>
            </div>

            <label className="block">
              <span className={compactLabelClass}>Instructions</span>
              <textarea
                className={`${compactFieldClass} min-h-[80px] resize-y`}
                value={formData.instructions || ''}
                onChange={(event) => setFormData((current) => ({ ...current, instructions: event.target.value }))}
                placeholder="Explain what the client should upload and any naming guidance."
                disabled={!isAdmin}
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(formData.is_active)}
                onChange={(event) => setFormData((current) => ({ ...current, is_active: event.target.checked }))}
                disabled={!isAdmin}
              />
              Portal is active and available on the public URL
            </label>

            {selectedPortal ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Link2 size={15} className="text-slate-500" />
                  Public URL
                </div>
                <p className="mt-2 break-all text-xs text-slate-600">{buildPortalUrl(selectedPortal.token)}</p>
              </div>
            ) : null}

            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Required Documents</h3>
                  <p className="mt-0.5 text-xs text-slate-500">This checklist controls what appears on the public upload page.</p>
                </div>
                <button
                  type="button"
                  onClick={addRequirement}
                  disabled={!isAdmin}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={13} />
                  Add Row
                </button>
              </div>

              {formData.requirements.map((requirement, index) => (
                <div key={requirement.id || `draft-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid gap-2 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    <label className="block">
                      <span className={compactLabelClass}>Label</span>
                      <input
                        className={compactFieldClass}
                        value={requirement.label}
                        onChange={(event) => setRequirement(index, 'label', event.target.value)}
                        placeholder="Document name"
                        disabled={!isAdmin}
                      />
                    </label>

                    <label className="block">
                      <span className={compactLabelClass}>Description</span>
                      <input
                        className={compactFieldClass}
                        value={requirement.description}
                        onChange={(event) => setRequirement(index, 'description', event.target.value)}
                        placeholder="Optional instruction"
                        disabled={!isAdmin}
                      />
                    </label>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={requirement.is_required}
                        onChange={(event) => setRequirement(index, 'is_required', event.target.checked)}
                        disabled={!isAdmin}
                      />
                      Mark as required
                    </label>

                    <button
                      type="button"
                      onClick={() => removeRequirement(index)}
                      disabled={!isAdmin}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-100 px-2.5 py-1 text-sm font-medium text-rose-700 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isAdmin || isSaving}
                className="btn-primary inline-flex items-center gap-2 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={15} />
                {isSaving ? 'Saving...' : selectedPortal ? 'Update Portal' : 'Create Portal'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary px-3 py-1.5 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </section>
      </div>

      {snackbar ? (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${snackbar.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <div className="flex items-center gap-3">
            <span>{snackbar.message}</span>
            <button type="button" onClick={() => setSnackbar(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DocumentPortalsPage;
