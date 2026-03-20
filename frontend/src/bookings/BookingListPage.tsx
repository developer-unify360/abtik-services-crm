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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-700">Admin View</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Bookings</h1>
          <p className="mt-2 text-sm text-slate-600">
            All bookings submitted through the BDE form. You can view and edit any booking.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="/bookings/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
          >
            <ExternalLink size={16} />
            Open Booking Form
          </a>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-slate-400" />
            <select
              className="input-field w-full md:w-56"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(0);
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <p className="text-sm text-slate-500">
            All bookings from the public BDE form.
          </p>
        </div>
      </div>

      <div className="table-container">
        <table className="w-full min-w-[840px]">
          <thead>
            <tr className="table-header">
              <th className="px-6 py-3 text-left font-semibold">Client</th>
              <th className="px-6 py-3 text-left font-semibold">Company</th>
              <th className="px-6 py-3 text-left font-semibold">Payment Type</th>
              <th className="px-6 py-3 text-left font-semibold">Booking Date</th>
              <th className="px-6 py-3 text-left font-semibold">Status</th>
              <th className="px-6 py-3 text-left font-semibold">Created</th>
              <th className="px-6 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  Loading bookings...
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  No bookings found. Use the booking form to create the first one.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="table-row">
                  <td className="px-6 py-4 font-medium text-slate-800">{booking.client_name}</td>
                  <td className="px-6 py-4 text-slate-600">{booking.company_name}</td>
                  <td className="px-6 py-4 text-slate-600">{booking.payment_type_display}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(booking.booking_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{getStatusChip(booking.status, booking.status_display)}</td>
                  <td className="px-6 py-4 text-slate-600">{new Date(booking.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/bookings/${booking.id}/edit`)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50"
                    >
                      <PencilLine size={16} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <span className="text-sm text-slate-500">
            {totalCount === 0
              ? 'Showing 0 of 0'
              : `Showing ${page * rowsPerPage + 1} to ${Math.min((page + 1) * rowsPerPage, totalCount)} of ${totalCount}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
              disabled={page === 0}
              className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((currentPage) => ((page + 1) * rowsPerPage < totalCount ? currentPage + 1 : currentPage))}
              disabled={(page + 1) * rowsPerPage >= totalCount}
              className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {snackbar.open ? (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg ${
          snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'
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
