import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Eye, X, Filter } from 'lucide-react';
import { BookingService, type Booking, type BookingCreateData } from './BookingService';
import { ClientService, type Client } from '../clients/ClientService';

const paymentTypes = [
  { value: 'new_payment', label: 'New Payment' },
  { value: 'remaining_payment', label: 'Remaining Payment' },
  { value: 'complimentary', label: 'Complimentary' },
  { value: 'converted', label: 'Converted' },
  { value: 'transfer', label: 'Transfer' },
];

const statusColors: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', color: 'text-yellow-700', label: 'Pending' },
  confirmed: { bg: 'bg-blue-100', color: 'text-blue-700', label: 'Confirmed' },
  in_progress: { bg: 'bg-blue-100', color: 'text-blue-700', label: 'In Progress' },
  completed: { bg: 'bg-green-100', color: 'text-green-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100', color: 'text-red-700', label: 'Cancelled' },
};

const BookingListPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false, message: '', type: 'success',
  });

  const [formData, setFormData] = useState<BookingCreateData>({
    client_id: '', payment_type: 'new_payment', bank_account: '',
    booking_date: new Date().toISOString().split('T')[0], payment_date: '', remarks: '',
  });

  const fetchBookings = async () => {
    try {
      const params: Record<string, string> = { page: String(page + 1) };
      if (statusFilter) params.status = statusFilter;
      const data = await BookingService.list(params);
      setBookings(data.results || data);
      setTotalCount(data.count || (data.results || data).length);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const data = await ClientService.list({ page_size: '100' });
      setClients(data.results || data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter]);
  useEffect(() => { fetchClients(); }, []);

  const handleOpenCreate = () => {
    setEditingBooking(null);
    setFormData({
      client_id: '', payment_type: 'new_payment', bank_account: '',
      booking_date: new Date().toISOString().split('T')[0], payment_date: '', remarks: '',
    });
    setOpenForm(true);
  };

  const handleOpenEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setFormData({
      client_id: booking.client, payment_type: booking.payment_type, bank_account: booking.bank_account || '',
      booking_date: booking.booking_date, payment_date: booking.payment_date || '',
      remarks: booking.remarks || '', status: booking.status,
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingBooking) {
        await BookingService.update(editingBooking.id, formData);
        setSnackbar({ open: true, message: 'Booking updated successfully', type: 'success' });
      } else {
        await BookingService.create(formData);
        setSnackbar({ open: true, message: 'Booking created successfully', type: 'success' });
      }
      setOpenForm(false);
      fetchBookings();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Operation failed';
      setSnackbar({ open: true, message: msg, type: 'error' });
    }
  };

  const getStatusChip = (status: string, display: string) => {
    const style = statusColors[status] || { bg: 'bg-gray-100', color: 'text-gray-700', label: display };
    return (
      <span className={`badge ${style.bg} ${style.color}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Bookings</h1>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Add Booking
        </button>
      </div>

      {/* Toolbar */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              className="input-field w-48"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="text-left px-6 py-3 font-semibold">Client</th>
              <th className="text-left px-6 py-3 font-semibold">Company</th>
              <th className="text-left px-6 py-3 font-semibold">Payment Type</th>
              <th className="text-left px-6 py-3 font-semibold">Booking Date</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="text-left px-6 py-3 font-semibold">Created</th>
              <th className="text-right px-6 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No bookings found. Create a new booking to get started.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr key={booking.id} className="table-row">
                  <td className="px-6 py-4 font-medium text-slate-800">{booking.client_name}</td>
                  <td className="px-6 py-4 text-gray-600">{booking.company_name}</td>
                  <td className="px-6 py-4 text-gray-600">{booking.payment_type_display}</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(booking.booking_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">{getStatusChip(booking.status, booking.status_display)}</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(booking.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setViewingBooking(booking)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handleOpenEdit(booking)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block ml-1"
                    >
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => (page + 1) * rowsPerPage < totalCount ? p + 1 : p)}
              disabled={(page + 1) * rowsPerPage >= totalCount}
              className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {openForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingBooking ? 'Edit Booking' : 'New Booking'}
              </h2>
              <button 
                onClick={() => setOpenForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!editingBooking && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <select
                    className="input-field"
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    disabled={clientsLoading}
                  >
                    <option value="">Select a client</option>
                    {clients.length === 0 ? (
                      <option disabled>No clients available</option>
                    ) : (
                      clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.client_name} - {client.company_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
                  <select
                    className="input-field"
                    value={formData.payment_type}
                    onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                  >
                    {paymentTypes.map((pt) => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.bank_account || ''}
                    onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking Date *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.booking_date}
                    onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.payment_date || ''}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  />
                </div>
                {editingBooking && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      className="input-field"
                      value={formData.status || 'pending'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setOpenForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn-primary">
                {editingBooking ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewingBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">Booking Details</h2>
              <button 
                onClick={() => setViewingBooking(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p><strong className="text-gray-700">Client:</strong> <span className="text-gray-600">{viewingBooking.client_name}</span></p>
              <p><strong className="text-gray-700">Company:</strong> <span className="text-gray-600">{viewingBooking.company_name}</span></p>
              <p><strong className="text-gray-700">BDE:</strong> <span className="text-gray-600">{viewingBooking.bde_name || '—'}</span></p>
              <p><strong className="text-gray-700">Payment Type:</strong> <span className="text-gray-600">{viewingBooking.payment_type_display}</span></p>
              <p><strong className="text-gray-700">Bank Account:</strong> <span className="text-gray-600">{viewingBooking.bank_account || '—'}</span></p>
              <p><strong className="text-gray-700">Booking Date:</strong> <span className="text-gray-600">{viewingBooking.booking_date}</span></p>
              <p><strong className="text-gray-700">Payment Date:</strong> <span className="text-gray-600">{viewingBooking.payment_date || '—'}</span></p>
              <p><strong className="text-gray-700">Status:</strong> {getStatusChip(viewingBooking.status, viewingBooking.status_display)}</p>
              <p><strong className="text-gray-700">Remarks:</strong> <span className="text-gray-600">{viewingBooking.remarks || '—'}</span></p>
              <p><strong className="text-gray-700">Created:</strong> <span className="text-gray-600">{new Date(viewingBooking.created_at).toLocaleString()}</span></p>
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
              <button onClick={() => setViewingBooking(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {snackbar.open && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg ${
          snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white flex items-center gap-3 z-50`}>
          <span>{snackbar.message}</span>
          <button onClick={() => setSnackbar({ ...snackbar, open: false })}>
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingListPage;
