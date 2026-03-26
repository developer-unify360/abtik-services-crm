import React, { useEffect, useState } from 'react';
import { ExternalLink, Filter, PencilLine } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { BookingService, type Booking } from './BookingService';

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', color: 'text-yellow-700', label: 'Pending' },
  confirmed: { bg: 'bg-blue-100', color: 'text-blue-700', label: 'Confirmed' },
  in_progress: { bg: 'bg-cyan-100', color: 'text-cyan-700', label: 'In Progress' },
  completed: { bg: 'bg-green-100', color: 'text-green-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100', color: 'text-red-700', label: 'Cancelled' },
};

const BookingListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false,
    message: '',
    type: 'success',
  });

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: String(page + 1),
        page_size: String(rowsPerPage),
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const data = await BookingService.list(params);
      const resultItems = data.results || data;
      setBookings(resultItems);
      setTotalCount(data.count || resultItems.length);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setSnackbar({ open: true, message: 'Unable to load bookings.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter]);

  useEffect(() => {
    if (location.state?.toast) {
      setSnackbar({
        open: true,
        message: location.state.toast,
        type: location.state.toastType || 'success',
      });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const getStatusChip = (status: string, display: string) => {
    const style = statusColors[status] || { bg: 'bg-gray-100', color: 'text-gray-700', label: display };
    return (
      <span className={`badge ${style.bg} ${style.color}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="flex min-w-0 flex-col h-full min-h-0 space-y-3 overflow-x-hidden">
      <div className="shrink-0 w-full">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-700">Admin View</p>
          <div className="mt-4 flex min-w-0 items-start justify-between gap-3">
            <h1 className="min-w-0 text-2xl font-bold text-slate-900">Bookings</h1>
            <a
              href="/bookings/new"
              target="_blank"
              rel="noreferrer"
              className="page-header-action bg-blue-700 hover:bg-blue-800"
            >
              <ExternalLink size={12} />
              Open Form
            </a>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            All bookings submitted through the BDE form. You can view and edit any booking.
          </p>
        </div>
      </div>

      <div className="shrink-0 min-w-0 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              className="input-field py-1.5 text-sm w-32"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <span className="text-xs text-slate-500">
            {totalCount === 0 ? '0 records' : `${totalCount} total`}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 min-h-0 w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="table-scroll min-w-0 flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-xs font-semibold text-slate-600">
                <th className="px-3 py-2 text-left whitespace-nowrap">Client</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Company</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Payment Type</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Booking Date</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Created</th>
                <th className="px-3 py-2 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{booking.client_name}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-[120px] truncate">{booking.company_name}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{booking.payment_type_name}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{new Date(booking.booking_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td className="px-3 py-2">{getStatusChip(booking.status, booking.status_display)}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{new Date(booking.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => navigate(`/bookings/${booking.id}/edit`)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        <PencilLine size={12} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > rowsPerPage && (
          <div className="flex min-w-0 flex-col gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-slate-500">
              {`${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, totalCount)} of ${totalCount}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                disabled={page === 0}
                className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((currentPage) => ((page + 1) * rowsPerPage < totalCount ? currentPage + 1 : currentPage))}
                disabled={(page + 1) * rowsPerPage >= totalCount}
                className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {snackbar.open ? (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg ${snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
          <span>{snackbar.message}</span>
          <button onClick={() => setSnackbar({ ...snackbar, open: false })}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default BookingListPage;
