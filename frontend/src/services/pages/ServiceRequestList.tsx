import React, { useEffect, useState } from 'react';
import { useServiceStore } from '../store/useServiceStore';
import { BookingService } from '../../bookings/BookingService';
import { UserService } from '../../users/UserService';
import { useAuthStore } from '../../auth/authStore';
import { Plus, User, ArrowRight, Filter, X } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fffbeb' },
  in_progress: { label: 'In Progress', color: '#7c3aed', bg: '#f5f3ff' },
  waiting_client: { label: 'Waiting Client', color: '#ea580c', bg: '#fff7ed' },
  completed: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4' },
  closed: { label: 'Closed', color: '#64748b', bg: '#f8fafc' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: '#64748b' },
  medium: { label: 'Medium', color: '#2563eb' },
  high: { label: 'High', color: '#ea580c' },
  urgent: { label: 'Urgent', color: '#dc2626' },
};

interface Booking {
  id: string;
  client_name: string;
  company_name: string;
  booking_date: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role_name: string;
}

const ServiceRequestList: React.FC = () => {
  const {
    serviceRequests, services, isLoading,
    fetchServiceRequests, fetchServices,
    createServiceRequest, assignServiceRequest, updateServiceRequestStatus,
    createTaskFromRequest
  } = useServiceStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false, message: '', type: 'success',
  });

  const authUser = useAuthStore((state) => state.user);
  const roleName = authUser?.role || '';
  const isBDE = roleName === 'BDE';
  const isITManager = roleName === 'IT Manager';
  const isITStaff = roleName === 'IT Staff';

  const [formData, setFormData] = useState({
    booking: '',
    service: '',
    priority: 'medium',
    assigned_to: '',
    status: 'pending',
  });

  const fetchBookings = async () => {
    try {
      const data = await BookingService.list();
      setBookings(data.results || []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await UserService.list();
      const userList = Array.isArray(response) ? response : response?.results || [];
      const teamMembers = userList.filter((user: User) =>
        user.role_name === 'IT Staff'
      );
      setUsers(teamMembers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    fetchServiceRequests();
    fetchServices();
    fetchBookings();
    fetchUsers();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchServiceRequests(Object.fromEntries(Object.entries(newFilters).filter(([_, v]) => v)));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createServiceRequest({
        booking: formData.booking,
        service: formData.service,
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
      });
      setShowCreateModal(false);
      setFormData({ booking: '', service: '', priority: 'medium', assigned_to: '', status: 'pending' });
      setSnackbar({ open: true, message: 'Service request created successfully', type: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Failed to create service request', type: 'error' });
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequest) {
      try {
        await assignServiceRequest(selectedRequest.id, { assigned_to: formData.assigned_to });
        setShowAssignModal(false);
        setSelectedRequest(null);
        setSnackbar({ open: true, message: 'Service request assigned successfully', type: 'success' });
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Failed to assign service request', type: 'error' });
      }
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequest) {
      try {
        await updateServiceRequestStatus(selectedRequest.id, { status: formData.status as 'pending' | 'assigned' | 'in_progress' | 'waiting_client' | 'completed' | 'closed' });
        setShowStatusModal(false);
        setSelectedRequest(null);
        setSnackbar({ open: true, message: 'Status updated successfully', type: 'success' });
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Failed to update status', type: 'error' });
      }
    }
  };

  const openAssignModal = (request: any) => {
    setSelectedRequest(request);
    setFormData({ ...formData, assigned_to: request.assigned_to || '' });
    setShowAssignModal(true);
  };

  const handleCreateTask = async (request: any) => {
    try {
      await createTaskFromRequest(request.id);
      setSnackbar({ open: true, message: 'Task created from service request', type: 'success' });
      fetchServiceRequests(filters);
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Failed to create task from service request', type: 'error' });
    }
  };

  const openStatusModal = (request: any) => {
    setSelectedRequest(request);
    setFormData({ ...formData, status: request.status });
    setShowStatusModal(true);
  };

  const getPriorityBadge = (priority: string) => {
    const config = priorityConfig[priority] || { label: priority, color: '#64748b' };
    return (
      <span className="text-sm font-medium" style={{ color: config.color }}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: '#64748b', bg: '#f8fafc' };
    return (
      <span className="badge" style={{ backgroundColor: config.bg, color: config.color }}>
        {config.label}
      </span>
    );
  };

  return (
    <div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <Filter size={18} className="text-gray-400" />
          <select
            className="input-field w-40"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_client">Waiting Client</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="input-field w-40"
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left px-6 py-3 font-semibold">Service</th>
                <th className="text-left px-6 py-3 font-semibold">Client / Booking</th>
                <th className="text-left px-6 py-3 font-semibold">Priority</th>
                <th className="text-left px-6 py-3 font-semibold">Assigned To</th>
                <th className="text-left px-6 py-3 font-semibold">Status</th>
                <th className="text-left px-6 py-3 font-semibold">Created</th>
                <th className="text-right px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {serviceRequests.map((request) => (
                <tr key={request.id} className="table-row">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{request.service_name}</p>
                    {request.category_name ? (
                      <p className="text-xs text-gray-500">{request.category_name}</p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-600">{request.booking_details?.company_name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">
                      {request.booking_details?.booking_date ? new Date(request.booking_details.booking_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {getPriorityBadge(request.priority)}
                  </td>
                  <td className="px-6 py-4">
                    {request.assigned_user ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User size={14} className="text-indigo-600" />
                        </div>
                        <span className="text-gray-600">{request.assigned_user.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(request.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {(isITManager || roleName === 'Admin' || roleName === 'Super Admin') && (
                      <button 
                        onClick={() => openAssignModal(request)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block"
                        title="Assign"
                      >
                        <User size={18} />
                      </button>
                    )}

                    {(isITManager || isITStaff || roleName === 'Admin' || roleName === 'Super Admin') && (
                      <button 
                        onClick={() => openStatusModal(request)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-block ml-1"
                        title="Update Status"
                      >
                        <ArrowRight size={18} />
                      </button>
                    )}

                    {(isBDE || isITManager || roleName === 'Admin' || roleName === 'Super Admin' || (isITStaff && request.assigned_user?.id === authUser?.id)) && (
                      <button
                        onClick={() => handleCreateTask(request)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors inline-block ml-1"
                        title="Create Task"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {serviceRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Plus size={40} className="text-gray-300 mb-2" />
                      <p className="text-gray-500">No service requests found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">New Service Request</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Booking</label>
                <select
                  className="input-field"
                  value={formData.booking}
                  onChange={(e) => setFormData({ ...formData, booking: e.target.value })}
                >
                  <option value="">Select a booking</option>
                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.company_name} - {new Date(booking.booking_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <select
                  className="input-field"
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                {services.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500">
                    No services found. Ask an Admin or Super Admin to add one first.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  className="input-field"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={!formData.booking || !formData.service}>
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">Assign Service Request</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <p className="text-gray-600">
                Assign <strong>{selectedRequest?.service_name}</strong> to a team member.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  className="input-field"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <option value="">Select team member</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role_name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">Update Status</h2>
              <button onClick={() => setShowStatusModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4">
              <p className="text-gray-600">
                Update status for <strong>{selectedRequest?.service_name}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="input-field"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_client">Waiting for Client</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowStatusModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Update Status</button>
              </div>
            </form>
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

export default ServiceRequestList;
