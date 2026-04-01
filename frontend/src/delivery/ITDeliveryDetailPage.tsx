import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Save,
  Search,
  Send,
  User,
  UserCheck,
  XCircle,
} from 'lucide-react';

import { hasAdminAccess, useAuthStore } from '../auth/authStore';
import { BookingService, type Booking } from '../bookings/BookingService';
import { ClientService, type Client } from '../clients/ClientService';
import { UserService, type User as SystemUser } from '../users/UserService';
import {
  DocumentPortalApi,
  ServiceApi,
  ServiceRequestApi,
  type ClientDocumentPortal,
  type Service as DeliveryService,
  type ServiceRequest,
  type ServiceRequestHandoffData,
} from '../services/api/ServiceApi';

const handoffStatusTone: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const executionStatusTone: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-violet-100 text-violet-700',
  waiting_client: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-700',
};

const emptyHandoffForm: ServiceRequestHandoffData = {
  note: '',
  promised_timeline: '',
  client_primary_contact: '',
  documents_received: false,
  payment_visibility_summary: '',
};

interface HandoffPrefillSources {
  booking: Booking | null;
  client: Client | null;
  service: DeliveryService | null;
  portal: ClientDocumentPortal | null;
}

const emptyPrefillSources: HandoffPrefillSources = {
  booking: null,
  client: null,
  service: null,
  portal: null,
};

const timelinePresetOptions = [
  '24 hours',
  '2 business days',
  '3 business days',
  '5 business days',
  '7 business days',
  '15 business days',
];

const prefillableFields: Array<keyof ServiceRequestHandoffData> = [
  'client_primary_contact',
  'documents_received',
  'payment_visibility_summary',
];

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.error?.message
  || error?.response?.data?.detail
  || error?.message
  || fallback;

const formatCurrency = (value?: string | null) => {
  if (!value) return null;
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return value;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });
};

const joinSummaryParts = (parts: Array<string | null | undefined>) =>
  parts.filter((part): part is string => Boolean(part && part.trim())).join(' | ');

const unwrapPayload = <T,>(value: any): T | null => (value?.data || value || null);

const buildClientContactSummary = (client: Client | null) => {
  if (!client) return '';
  return joinSummaryParts([
    client.client_name || client.company_name,
    client.mobile,
    client.email,
  ]);
};

const buildDocumentSummary = (portal: ClientDocumentPortal | null) => {
  if (!portal) return '';
  const uploadedDocuments = portal.submissions
    .map((submission) => submission.requirement_label || submission.document_name)
    .filter(Boolean);
  const summaryParts = [
    uploadedDocuments.length ? `Uploaded: ${uploadedDocuments.join(', ')}` : null,
    portal.missing_required_documents.length
      ? `Missing: ${portal.missing_required_documents.join(', ')}`
      : null,
  ];
  return joinSummaryParts(summaryParts);
};

const buildPaymentSummary = (booking: Booking | null) => {
  if (!booking) return '';
  return joinSummaryParts([
    booking.payment_type_name,
    formatCurrency(booking.total_payment_amount) ? `Total: ${formatCurrency(booking.total_payment_amount)}` : null,
    formatCurrency(booking.received_amount) ? `Recd: ${formatCurrency(booking.received_amount)}` : null,
    formatCurrency(booking.remaining_amount) ? `Rem: ${formatCurrency(booking.remaining_amount)}` : null,
  ]);
};

const areAllDocumentsReceived = (portal: ClientDocumentPortal | null) => {
  if (!portal) return false;
  return portal.missing_required_documents.length === 0 && portal.submissions.length > 0;
};

const getTimelinePresetValue = (value?: string | null) => {
  const trimmedValue = value?.trim() || '';
  if (!trimmedValue) return '';
  return timelinePresetOptions.includes(trimmedValue) ? trimmedValue : 'custom';
};

const compactFieldClass = 'input-field mt-1 py-1 text-xs';
const compactTextareaClass = `${compactFieldClass} min-h-[42px] resize-y`;
const compactLabelClass = 'text-[10px] font-bold uppercase tracking-wider text-slate-500';

const ITDeliveryDetailPage: React.FC = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const isAdmin = hasAdminAccess(authUser);

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [assignees, setAssignees] = useState<SystemUser[]>([]);
  const [handoffForm, setHandoffForm] = useState<ServiceRequestHandoffData>(emptyHandoffForm);
  const [assignmentUserId, setAssignmentUserId] = useState('');
  const [statusValue, setStatusValue] = useState<ServiceRequest['status']>('pending');
  const [timelineMode, setTimelineMode] = useState<'preset' | 'custom'>('preset');
  const [prefillSources, setPrefillSources] = useState<HandoffPrefillSources>(emptyPrefillSources);
  const [isSourcesLoaded, setIsSourcesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Searchable dropdown states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownTriggerRef = React.useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const openDropdown = () => {
    if (dropdownTriggerRef.current) {
      const rect = dropdownTriggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 180;
      const top = spaceBelow >= dropdownHeight ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight;
      setDropdownPos({ top, left: rect.left + window.scrollX, width: rect.width });
    }
    setShowUserDropdown(v => !v);
  };

  const canChangeSelectedStatus = Boolean(
    request && (isAdmin || request.assigned_to === authUser?.id),
  );
  const isRequestClosed = request?.status === 'closed';
  const canEditHandoffDetails = Boolean(request) && !isRequestClosed;
  const canAssignRequest = Boolean(request) && isAdmin && !isRequestClosed;
  const canUpdateStatus = canChangeSelectedStatus && !isRequestClosed;
  const lockedFieldClass = 'bg-slate-50 text-slate-500 border-slate-100';
  const selectedTimelinePreset = timelineMode === 'custom' ? 'custom' : getTimelinePresetValue(handoffForm.promised_timeline);

  const prefillDraft = useMemo<Partial<ServiceRequestHandoffData>>(() => ({
    client_primary_contact: buildClientContactSummary(prefillSources.client),
    documents_received: areAllDocumentsReceived(prefillSources.portal),
    payment_visibility_summary: buildPaymentSummary(prefillSources.booking),
  }), [prefillSources]);

  const applyRequestToForm = (req: ServiceRequest | null) => {
    if (!req) {
      setHandoffForm(emptyHandoffForm);
      setAssignmentUserId('');
      setStatusValue('pending');
      setTimelineMode('preset');
      return;
    }

    setHandoffForm({
      note: req.note || '',
      promised_timeline: req.promised_timeline || '',
      client_primary_contact: req.client_primary_contact || '',
      documents_received: req.documents_received || false,
      payment_visibility_summary: req.payment_visibility_summary || '',
    });
    setAssignmentUserId(req.assigned_to || '');
    setStatusValue(req.status);
    setTimelineMode(getTimelinePresetValue(req.promised_timeline) === 'custom' ? 'custom' : 'preset');
  };

  const loadRequest = async () => {
    if (!requestId) return;
    try {
      setIsLoading(true);
      const data = await ServiceRequestApi.get(requestId);
      setRequest(data);
      applyRequestToForm(data);
    } catch (error: any) {
      setSnackbar({ type: 'error', message: getErrorMessage(error, 'Unable to load the request details.') });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssignees = async () => {
    try {
      const response = await UserService.list({ page_size: '200' });
      const userList = Array.isArray(response) ? response : response?.results || [];
      setAssignees(
        userList.filter((user: SystemUser) => user.role === 'service_ops' || user.role === 'admin' || user.is_superuser),
      );
    } catch (error) {
      console.error('Failed to load delivery assignees', error);
    }
  };

  useEffect(() => {
    loadRequest();
    loadAssignees();
  }, [requestId]);

  useEffect(() => {
    if (!request) {
      setPrefillSources(emptyPrefillSources);
      setIsSourcesLoaded(false);
      return;
    }

    let isActive = true;
    const loadPrefillSources = async () => {
      try {
        const booking = await BookingService.get(request.booking);
        const [clientResult, portalResult, serviceResult] = await Promise.allSettled([
          ClientService.get(booking.client),
          DocumentPortalApi.list({ client_id: booking.client }),
          ServiceApi.get(request.service),
        ]);
        if (!isActive) return;
        setPrefillSources({
          booking,
          client: clientResult.status === 'fulfilled' ? unwrapPayload<Client>(clientResult.value) : null,
          portal: portalResult.status === 'fulfilled' && Array.isArray(portalResult.value) ? portalResult.value[0] || null : null,
          service: serviceResult.status === 'fulfilled' ? unwrapPayload<DeliveryService>(serviceResult.value) : null,
        });
        setIsSourcesLoaded(true);
      } catch (error: any) {
        if (isActive) setIsSourcesLoaded(true);
      }
    };
    loadPrefillSources();
    return () => { isActive = false; };
  }, [request?.id, request?.booking, request?.service]);

  // Auto-prefill logic
  useEffect(() => {
    if (isSourcesLoaded && canEditHandoffDetails) {
      setHandoffForm((current) => {
        const nextState = { ...current };
        let hasChanges = false;
        prefillableFields.forEach((fieldName) => {
          const prefillValue = prefillDraft[fieldName];
          const currentValue = current[fieldName];
          // Only auto-prefill if the current field is empty/false
          if (prefillValue && !currentValue) {
            (nextState as any)[fieldName] = prefillValue;
            hasChanges = true;
          }
        });
        return hasChanges ? nextState : current;
      });
    }
  }, [isSourcesLoaded, prefillDraft, canEditHandoffDetails]);

  const runAction = async (actionKey: string, action: () => Promise<void>) => {
    try {
      setActionLoading(actionKey);
      await action();
    } finally {
      setActionLoading(null);
    }
  };

  const persistHandoff = async () => {
    if (!request || request.status === 'closed') return null;
    const updatedRequest = await ServiceRequestApi.updateHandoff(request.id, handoffForm);
    setRequest(updatedRequest);
    applyRequestToForm(updatedRequest);
    return updatedRequest;
  };

  const handleTimelinePresetChange = (value: string) => {
    setTimelineMode(value === 'custom' ? 'custom' : 'preset');
    setHandoffForm((current) => {
      if (value === 'custom') {
        return {
          ...current,
          promised_timeline: timelinePresetOptions.includes(current.promised_timeline || '')
            ? ''
            : current.promised_timeline || '',
        };
      }
      return { ...current, promised_timeline: value };
    });
  };

  const handleSaveDraft = async () => {
    if (!request || request.status === 'closed') return;
    await runAction('save', async () => {
      try {
        await persistHandoff();
        setSnackbar({ type: 'success', message: 'Handoff saved.' });
      } catch (error: any) {
        setSnackbar({ type: 'error', message: getErrorMessage(error, 'Unable to save handoff.') });
      }
    });
  };

  const handleSubmitHandoff = async () => {
    if (!request || request.status === 'closed') return;
    await runAction('submit', async () => {
      try {
        await persistHandoff();
        const updatedRequest = await ServiceRequestApi.submitHandoff(request.id);
        setRequest(updatedRequest);
        applyRequestToForm(updatedRequest);
        setSnackbar({ type: 'success', message: 'Handoff submitted.' });
      } catch (error: any) {
        setSnackbar({ type: 'error', message: getErrorMessage(error, 'Unable to submit handoff.') });
      }
    });
  };

  const handleAssignmentSave = async () => {
    if (!request || request.status === 'closed' || !assignmentUserId) return;
    await runAction('assign', async () => {
      try {
        const updatedRequest = await ServiceRequestApi.assign(request.id, { assigned_to: assignmentUserId });
        setRequest(updatedRequest);
        applyRequestToForm(updatedRequest);
        setSnackbar({ type: 'success', message: 'Assignee updated.' });
      } catch (error: any) {
        setSnackbar({ type: 'error', message: getErrorMessage(error, 'Unable to assign.') });
      }
    });
  };

  const handleStatusSave = async () => {
    if (!request || request.status === 'closed') return;
    await runAction('status', async () => {
      try {
        const updatedRequest = await ServiceRequestApi.updateStatus(request.id, { status: statusValue });
        setRequest(updatedRequest);
        applyRequestToForm(updatedRequest);
        setSnackbar({ type: 'success', message: 'Status updated.' });
      } catch (error: any) {
        setSnackbar({ type: 'error', message: getErrorMessage(error, 'Unable to update status.') });
      }
    });
  };

  const filteredAssignees = assignees.filter(u =>
    (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const selectedAssignee = assignees.find(u => String(u.id) === String(assignmentUserId));

  if (isLoading) return <div className="flex flex-1 items-center justify-center p-10 text-xs text-slate-500">Loading...</div>;

  if (!request) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-xs text-slate-500">
        <p>Not found.</p>
        <button onClick={() => navigate('/it-delivery')} className="mt-4 btn-primary px-4 py-2">Back</button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with Buttons */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/it-delivery')}
            className="rounded-full p-1.5 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">HandOff Detail</h1>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${handoffStatusTone[request.handoff_status] || handoffStatusTone.draft}`}>
                {request.handoff_status_display}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate max-w-[300px]">
              {request.service_name} • {request.booking_details?.company_name || request.booking_details?.client_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={!canEditHandoffDetails || actionLoading !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {actionLoading === 'save' ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={handleSubmitHandoff}
            disabled={!canEditHandoffDetails || actionLoading !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-800 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Send size={14} />
            {actionLoading === 'submit' ? 'Submitting...' : 'Submit Handoff'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {request.handoff_status === 'rejected' && request.handoff_rejection_reason && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 font-medium">
            <span className="font-bold">Returned:</span> {request.handoff_rejection_reason}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main Handoff Form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
              <div className="sm:col-span-2 space-y-1">
                <label className={compactLabelClass}>Note</label>
                <textarea
                  className={`${compactTextareaClass} min-h-[50px] ${isRequestClosed ? lockedFieldClass : ''}`}
                  value={handoffForm.note || ''}
                  onChange={(e) => setHandoffForm({ ...handoffForm, note: e.target.value })}
                  placeholder="Internal notes"
                  readOnly={!canEditHandoffDetails}
                />
              </div>

              <div className="space-y-1">
                <label className={compactLabelClass}>Promised Timeline</label>
                <select
                  className={`${compactFieldClass} ${isRequestClosed ? lockedFieldClass : ''}`}
                  value={selectedTimelinePreset}
                  onChange={(e) => handleTimelinePresetChange(e.target.value)}
                  disabled={!canEditHandoffDetails}
                >
                  <option value="">Select</option>
                  {timelinePresetOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  <option value="custom">Custom</option>
                </select>
                {selectedTimelinePreset === 'custom' && (
                  <input
                    className={`${compactFieldClass} ${isRequestClosed ? lockedFieldClass : ''}`}
                    value={handoffForm.promised_timeline || ''}
                    onChange={(e) => setHandoffForm({ ...handoffForm, promised_timeline: e.target.value })}
                    readOnly={!canEditHandoffDetails}
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className={compactLabelClass}>Client Contact</label>
                <textarea
                  className={`${compactTextareaClass} ${isRequestClosed ? lockedFieldClass : ''}`}
                  value={handoffForm.client_primary_contact || ''}
                  onChange={(e) => setHandoffForm({ ...handoffForm, client_primary_contact: e.target.value })}
                  readOnly={!canEditHandoffDetails}
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className={compactLabelClass}>Payment Summary</label>
                <textarea
                  className={`${compactTextareaClass} ${isRequestClosed ? lockedFieldClass : ''}`}
                  value={handoffForm.payment_visibility_summary || ''}
                  onChange={(e) => setHandoffForm({ ...handoffForm, payment_visibility_summary: e.target.value })}
                  readOnly={!canEditHandoffDetails}
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-500"
                    checked={handoffForm.documents_received || false}
                    onChange={(e) => setHandoffForm({ ...handoffForm, documents_received: e.target.checked })}
                    disabled={!canEditHandoffDetails}
                  />
                  <span className="text-[11px] font-medium text-slate-600">Documents received from client</span>
                </div>
                {prefillSources.portal && (
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    {buildDocumentSummary(prefillSources.portal)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar controls */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm">
              <div className="space-y-2">
                <label className={compactLabelClass}>Assignee</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div
                      ref={dropdownTriggerRef}
                      className={`${compactFieldClass} flex items-center justify-between cursor-pointer ${!canAssignRequest ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={openDropdown}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <User size={12} className="text-slate-400 shrink-0" />
                        <span className={selectedAssignee ? 'text-slate-900' : 'text-slate-400'}>
                          {selectedAssignee ? (selectedAssignee.name || selectedAssignee.email) : 'Unassigned'}
                        </span>
                      </div>
                      <Search size={12} className="text-slate-400 shrink-0" />
                    </div>

                    {showUserDropdown && dropdownPos && (
                      <div
                        className="fixed z-[9999] rounded-lg border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in duration-200"
                        style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                      >
                        <div className="p-2 border-b border-slate-100">
                          <input
                            autoFocus
                            className="w-full rounded-lg bg-slate-50 border-none px-3 py-1.5 text-xs focus:ring-2 focus:ring-cyan-500/20"
                            placeholder="Search..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-[140px] overflow-y-auto p-1">
                          <div
                            className={`flex flex-col px-3 py-2 rounded-lg cursor-pointer transition-colors ${!assignmentUserId ? 'bg-cyan-50 text-cyan-700' : 'hover:bg-slate-50'}`}
                            onClick={() => {
                              setAssignmentUserId('');
                              setShowUserDropdown(false);
                              setUserSearchTerm('');
                            }}
                          >
                            <span className="font-bold text-xs uppercase tracking-tighter">Unassigned</span>
                          </div>
                          {filteredAssignees.length > 0 ? (
                            filteredAssignees.map(u => (
                              <div
                                key={u.id}
                                className={`flex flex-col px-3 py-2 rounded-lg cursor-pointer transition-colors ${String(assignmentUserId) === String(u.id) ? 'bg-cyan-50 text-cyan-700' : 'hover:bg-slate-50'}`}
                                onClick={() => {
                                  setAssignmentUserId(String(u.id));
                                  setShowUserDropdown(false);
                                  setUserSearchTerm('');
                                }}
                              >
                                <span className="font-bold text-xs">{u.name}</span>
                                <span className="text-[10px] opacity-70">{u.email}</span>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center text-slate-400 text-xs">
                              No users found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {canAssignRequest && (
                    <button
                      onClick={handleAssignmentSave}
                      disabled={!assignmentUserId || actionLoading !== null}
                      className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 mt-1 transition-colors"
                    >
                      <UserCheck size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className={compactLabelClass}>Execution Status</label>
                <div className="flex gap-2">
                  <select
                    className={compactFieldClass}
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value as ServiceRequest['status'])}
                    disabled={!canUpdateStatus}
                  >
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_client">Waiting Client</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                  </select>
                  {canUpdateStatus && (
                    <button
                      onClick={handleStatusSave}
                      disabled={actionLoading !== null}
                      className="inline-flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 mt-1 transition-colors"
                    >
                      <Clock3 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                  <span>ID: {request.id.slice(0, 8)}</span>
                  <span>Created: {formatDate(request.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {snackbar && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-2 text-xs font-bold text-white shadow-lg ${snackbar.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <span>{snackbar.message}</span>
        </div>
      )}
    </div>
  );
};

export default ITDeliveryDetailPage;
