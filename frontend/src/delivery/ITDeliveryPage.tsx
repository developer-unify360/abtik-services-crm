import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

import { ServiceRequestApi, type ServiceRequest } from '../services/api/ServiceApi';

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

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.error?.message
  || error?.response?.data?.detail
  || error?.message
  || fallback;

const compactFieldClass = 'input-field mt-1.5 py-1.5 text-sm';
const compactLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500';

const ITDeliveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filters, setFilters] = useState({
    handoff_status: '',
    handoff_incomplete: '',
    status: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const metrics = useMemo(() => ({
    total: requests.length,
    incomplete: requests.filter((request) => !request.handoff_is_complete).length,
    awaitingReview: requests.filter((request) => request.handoff_status === 'submitted').length,
    accepted: requests.filter((request) => request.handoff_status === 'accepted').length,
  }), [requests]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const data = await ServiceRequestApi.deliveryBoard(filters);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setSnackbar({ type: 'error', message: getErrorMessage(error, 'Unable to load the IT delivery board.') });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filters.handoff_incomplete, filters.handoff_status, filters.status]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col space-y-4 overflow-x-hidden">
      <div className="shrink-0 min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className={compactLabelClass}>Handoff State</span>
              <select
                className={compactFieldClass}
                value={filters.handoff_status}
                onChange={(event) => setFilters((current) => ({ ...current, handoff_status: event.target.value }))}
              >
                <option value="">All States</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <label className="block">
              <span className={compactLabelClass}>Completeness</span>
              <select
                className={compactFieldClass}
                value={filters.handoff_incomplete}
                onChange={(event) => setFilters((current) => ({ ...current, handoff_incomplete: event.target.value }))}
              >
                <option value="">All Status</option>
                <option value="true">Incomplete Only</option>
                <option value="false">Complete Only</option>
              </select>
            </label>

            <label className="block">
              <span className={compactLabelClass}>Execution Status</span>
              <select
                className={compactFieldClass}
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_client">Waiting Client</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col items-start gap-2 lg:flex-row lg:items-center xl:items-end">
            <button
              type="button"
              onClick={loadRequests}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800 transition-colors shadow-sm"
            >
              <RefreshCw size={16} />
              Refresh Board
            </button>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500 whitespace-nowrap lg:ml-4">
              <span>{metrics.total} total</span>
              <span>{metrics.incomplete} incomplete</span>
              <span>{metrics.awaitingReview} awaiting review</span>
              <span>{metrics.accepted} accepted</span>
            </div>
          </div>
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">IT Delivery Queue</h2>
            <p className="text-sm text-slate-500">
              Manage service fulfillment and handoff details.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">
            {requests.length} Requests
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center p-10 text-slate-500">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-700 border-t-transparent" />
              <p className="text-sm font-medium">Loading requests...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-10 text-slate-500">
            <p className="text-sm font-medium">No service requests found matching filters.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-100">Service & Client</th>
                  <th className="px-6 py-4 border-b border-slate-100">Handoff Status</th>
                  <th className="px-6 py-4 border-b border-slate-100" />
                  <th className="px-6 py-4 border-b border-slate-100">Execution</th>
                  <th className="px-6 py-4 border-b border-slate-100">Details</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{request.service_name}</p>
                        <p className="text-xs font-medium text-slate-600 mt-0.5">
                          {request.booking_details?.company_name || request.booking_details?.client_name || 'Unknown client'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          <span>
                            Booking:{' '}
                            {request.booking_details?.booking_date
                              ? new Date(request.booking_details.booking_date).toLocaleDateString('en-GB')
                              : 'N/A'}
                          </span>
                          <span>Priority: {request.priority}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${handoffStatusTone[request.handoff_status] || handoffStatusTone.draft}`}>
                        {request.handoff_status_display}
                      </span>
                    </td>
                    <td className="px-6 py-4" />
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${executionStatusTone[request.status] || executionStatusTone.pending}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {request.handoff_is_complete ? (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Handoff Complete
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                            {request.handoff_missing_fields.length} Missing
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-slate-500">
                          {request.assigned_user ? `Owned by: ${request.assigned_user.name}` : 'Unassigned'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/it-delivery/${request.id}`)}
                        className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-cyan-700 border border-cyan-200 hover:bg-cyan-50 transition-colors shadow-sm"
                      >
                        <ExternalLink size={14} />
                        View Handoff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {snackbar && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${snackbar.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <span>{snackbar.message}</span>
        </div>
      )}
    </div>
  );
};

export default ITDeliveryPage;
