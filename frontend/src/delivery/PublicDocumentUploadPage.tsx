import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileUp, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';

import {
  DocumentPortalApi,
  type ClientDocumentRequirement,
  type ClientDocumentSubmission,
} from '../services/api/ServiceApi';

interface PublicPortal {
  id: string;
  client_name: string;
  company_name: string;
  title: string;
  instructions: string;
  token: string;
  requirements: ClientDocumentRequirement[];
  submissions: ClientDocumentSubmission[];
}

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

const PublicDocumentUploadPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();

  const [portal, setPortal] = useState<PublicPortal | null>(null);
  const [submittedByName, setSubmittedByName] = useState('');
  const [submittedByEmail, setSubmittedByEmail] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedFileCount = useMemo(
    () => Object.values(files).filter(Boolean).length,
    [files],
  );

  const loadPortal = async () => {
    try {
      setIsLoading(true);
      const data = await DocumentPortalApi.publicGet(token);
      setPortal(data);
      setFeedback(null);
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.error?.message || error?.message || 'This upload link is not available.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setFeedback({ type: 'error', message: 'Missing upload token.' });
      setIsLoading(false);
      return;
    }

    loadPortal();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!portal) {
      return;
    }

    const documents = portal.requirements
      .map((requirement) => {
        const file = files[requirement.id];
        if (!file) {
          return null;
        }

        return {
          requirement_id: requirement.id,
          document_name: requirement.label,
          note: notes[requirement.id] || '',
          file_key: `file_${requirement.id}`,
          file,
        };
      })
      .filter(Boolean) as Array<{
        requirement_id: string;
        document_name: string;
        note: string;
        file_key: string;
        file: File;
      }>;

    if (documents.length === 0) {
      setFeedback({ type: 'error', message: 'Select at least one file before submitting.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      documents.forEach((document) => {
        formData.append(document.file_key, document.file);
      });
      formData.append('payload', JSON.stringify({
        submitted_by_name: submittedByName,
        submitted_by_email: submittedByEmail,
        documents: documents.map(({ file, ...rest }) => rest),
      }));

      await DocumentPortalApi.publicSubmit(token, formData);
      setFiles({});
      setNotes({});
      setFeedback({ type: 'success', message: 'Documents uploaded successfully.' });
      await loadPortal();
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.error?.message || error?.message || 'Unable to upload the selected documents.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_50%,_#ffffff)] px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-100 text-cyan-700">
                <ShieldCheck size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">Secure Document Upload</p>
                <h1 className="mt-3 text-3xl font-bold text-slate-900">
                  {portal?.title || 'Client Document Portal'}
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  {portal ? `${portal.company_name} | ${portal.client_name}` : 'Loading portal details...'}
                </p>
                {portal?.instructions ? (
                  <p className="mt-3 max-w-3xl text-sm text-slate-600">{portal.instructions}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 xl:items-end">
              <button
                type="button"
                onClick={loadPortal}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <span className="text-xs text-slate-500">
                {(portal?.requirements.length || 0)} requested | {(portal?.submissions.length || 0)} uploaded
              </span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">
            <div className="inline-flex items-center gap-2">
              <LoaderCircle size={18} className="animate-spin" />
              Loading upload portal...
            </div>
          </div>
        ) : portal ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <form onSubmit={handleSubmit} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Your Name</span>
                  <input
                    className="input-field mt-2"
                    value={submittedByName}
                    onChange={(event) => setSubmittedByName(event.target.value)}
                    placeholder="Who is uploading these documents?"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Email</span>
                  <input
                    type="email"
                    className="input-field mt-2"
                    value={submittedByEmail}
                    onChange={(event) => setSubmittedByEmail(event.target.value)}
                    placeholder="Optional email for confirmation"
                  />
                </label>
              </div>

              <div className="mt-5 space-y-4">
                {portal.requirements.map((requirement) => (
                  <div key={requirement.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{requirement.label}</p>
                        {requirement.description ? (
                          <p className="mt-1 text-sm text-slate-600">{requirement.description}</p>
                        ) : null}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${requirement.is_required ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                        {requirement.is_required ? 'Required' : 'Optional'}
                      </span>
                    </div>

                    <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                      <FileUp size={18} className="text-slate-400" />
                      <span className="truncate">{files[requirement.id]?.name || 'Choose a file'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) => setFiles((current) => ({ ...current, [requirement.id]: event.target.files?.[0] || null }))}
                      />
                    </label>

                    <textarea
                      className="input-field mt-3 min-h-[76px]"
                      value={notes[requirement.id] || ''}
                      onChange={(event) => setNotes((current) => ({ ...current, [requirement.id]: event.target.value }))}
                      placeholder="Optional note for this file"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">{selectedFileCount} file{selectedFileCount === 1 ? '' : 's'} selected</p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {isSubmitting ? 'Uploading...' : 'Submit Documents'}
                </button>
              </div>
            </form>

            <aside className="space-y-5">
              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Already Received</h2>
                {portal.submissions.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No documents uploaded yet on this link.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {portal.submissions.map((submission) => (
                      <div key={submission.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{submission.document_name}</p>
                        <p className="mt-1 text-xs text-slate-500">{submission.requirement_label || 'Uploaded file'}</p>
                        <p className="mt-2 text-xs text-slate-500">{formatDate(submission.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Before You Upload</h2>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>Upload clear scans or PDFs only.</li>
                  <li>Match each file to the correct document row.</li>
                  <li>Add a short note if the file has special context.</li>
                </ul>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-[32px] border border-rose-200 bg-rose-50 px-6 py-10 text-center text-rose-700 shadow-sm">
            The document upload link is unavailable. Please contact the team that shared it with you.
          </div>
        )}

        {feedback ? (
          <div className={`rounded-[28px] border px-5 py-4 text-sm ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            {feedback.message}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PublicDocumentUploadPage;
