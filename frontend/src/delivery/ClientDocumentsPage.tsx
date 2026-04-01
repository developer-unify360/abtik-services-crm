import React, { useEffect, useMemo, useState } from 'react';
import { Copy, FileText, FolderOpen, RefreshCw } from 'lucide-react';

import {
  DocumentPortalApi,
  type ClientDocumentPortal,
} from '../services/api/ServiceApi';

const copyText = async (value: string) => {
  await navigator.clipboard.writeText(value);
};

const portalUrl = (token: string) => `${window.location.origin}/documents/upload/${token}`;

const formatDate = (value?: string | null) => {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const compactFilterClass = 'input-field mt-1.5 py-1.5 text-sm';

const ClientDocumentsPage: React.FC = () => {
  const [portals, setPortals] = useState<ClientDocumentPortal[]>([]);
  const [hasSubmissions, setHasSubmissions] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadPortals = async () => {
    try {
      setIsLoading(true);
      const data = await DocumentPortalApi.list(hasSubmissions ? { has_submissions: hasSubmissions } : undefined);
      setPortals(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setSnackbar({
        type: 'error',
        message: error?.response?.data?.error?.message || error?.message || 'Unable to load client documents.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortals();
  }, [hasSubmissions]);

  const summary = useMemo(() => ({
    portals: portals.length,
    submitted: portals.filter((portal) => portal.submitted_documents_count > 0).length,
    missing: portals.filter((portal) => portal.missing_required_documents.length > 0).length,
  }), [portals]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col space-y-3 overflow-x-hidden">
      <div className="shrink-0 min-w-0 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start">

          {/* LEFT */}
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-end">
            <label className="block min-w-[180px]">
              <select
                className={compactFilterClass}
                value={hasSubmissions}
                onChange={(event) => setHasSubmissions(event.target.value)}
              >
                <option value="">All portals</option>
                <option value="true">With submissions</option>
                <option value="false">No submissions yet</option>
              </select>
            </label>
          </div>

          {/* RIGHT */}
          <div className="md:ml-auto flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={loadPortals}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              <RefreshCw size={14} />
              Refresh
            </button>

            <span className="text-xs text-slate-500">
              {summary.portals} portals | {summary.submitted} with uploads | {summary.missing} missing files
            </span>
          </div>

        </div>
      </div>

      <section className="table-scroll flex-1 min-h-0 space-y-3 overflow-y-auto pr-0.5">
        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            Loading client documents...
          </div>
        ) : portals.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            No client document portals match the current filter.
          </div>
        ) : (
          portals.map((portal) => (
            <article key={portal.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-slate-900">{portal.company_name}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{portal.client_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{portal.title || 'Client document upload portal'}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${portal.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {portal.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {portal.submitted_documents_count} uploaded
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {portal.required_documents_count} requested
                  </span>
                </div>
              </div>

              <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(220px,0.72fr)_minmax(0,1.28fr)]">
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen size={16} className="text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-900">Portal</h3>
                    </div>
                    <p className="mt-2 break-all text-xs text-slate-600">{portalUrl(portal.token)}</p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await copyText(portalUrl(portal.token));
                          setSnackbar({ type: 'success', message: `Copied portal URL for ${portal.company_name}.` });
                        } catch {
                          setSnackbar({ type: 'error', message: 'Unable to copy the portal URL.' });
                        }
                      }}
                      className="btn-secondary mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-sm"
                    >
                      <Copy size={15} />
                      Copy Public URL
                    </button>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <h3 className="text-sm font-semibold text-slate-900">Missing Required Documents</h3>
                    {portal.missing_required_documents.length === 0 ? (
                      <p className="mt-2 text-sm text-emerald-700">All required documents have been uploaded.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {portal.missing_required_documents.map((label) => (
                          <span key={label} className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <h3 className="text-sm font-semibold text-slate-900">Requested Documents</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {portal.requirements.map((requirement) => (
                        <span key={requirement.id} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${requirement.is_required ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                          {requirement.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">Submitted Documents</h3>
                      <span className="text-[11px] text-slate-500">{portal.submissions.length} file{portal.submissions.length === 1 ? '' : 's'}</span>
                    </div>
                    {portal.submissions.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">No files uploaded yet.</p>
                    ) : (
                      <div className="table-scroll mt-2 max-h-60 space-y-2 overflow-y-auto pr-1">
                        {portal.submissions.map((submission) => (
                          <div key={submission.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <FileText size={15} className="shrink-0 text-slate-500" />
                                  <p className="truncate text-sm font-semibold text-slate-900">{submission.document_name}</p>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {submission.requirement_label || 'Unmapped document'} | Uploaded by {submission.submitted_by_name || 'Client'}
                                </p>
                                {submission.note ? (
                                  <p className="mt-1.5 text-sm text-slate-600">{submission.note}</p>
                                ) : null}
                              </div>
                              <div className="shrink-0 text-left md:text-right">
                                <p className="text-[11px] text-slate-500">{formatDate(submission.created_at)}</p>
                                <a
                                  href={submission.file}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1.5 inline-flex items-center gap-2 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                                >
                                  Open File
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

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

export default ClientDocumentsPage;
