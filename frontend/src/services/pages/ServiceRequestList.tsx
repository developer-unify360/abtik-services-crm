import React, { useEffect, useState } from 'react';
import { useServiceStore } from '../store/useServiceStore';
import { BookingService } from '../../bookings/BookingService';
import { UserService } from '../../users/UserService';
import { Plus, User, Clock, CheckCircle, AlertCircle, XCircle, ArrowRight, Filter } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  assigned: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-50', icon: User },
  in_progress: { label: 'In Progress', color: 'text-purple-700', bg: 'bg-purple-50', icon: ArrowRight },
  waiting_client: { label: 'Waiting Client', color: 'text-orange-700', bg: 'bg-orange-50', icon: AlertCircle },
  completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle },
  closed: { label: 'Closed', color: 'text-slate-700', bg: 'bg-slate-50', icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-slate-500' },
  medium: { label: 'Medium', color: 'text-blue-600' },
  high: { label: 'High', color: 'text-orange-600' },
  urgent: { label: 'Urgent', color: 'text-red-600' },
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
    serviceRequests, services, categories, isLoading, 
    fetchServiceRequests, fetchServices, fetchCategories,
    createServiceRequest, assignServiceRequest, updateServiceRequestStatus 
  } = useServiceStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({ status: '', priority: '' });

  const [formData, setFormData] = useState<{
    booking: string;
    service: string;
    priority: string;
    assigned_to: string;
    status: string;
  }>({
    booking: '',
    service: '',
    priority: 'medium',
    assigned_to: '',
    status: 'pending',
  });

  useEffect(() => {
    fetchServiceRequests();
    fetchServices();
    fetchCategories();
    fetchBookings();
    fetchUsers();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await BookingService.list();
      setBookings(data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await UserService.list();
      console.log('Fetched users:', response); // Debug log
      // Handle cases where API returns an array directly or an object with a `results` property.
      const userList = Array.isArray(response) ? response : response?.results || [];

      // Filter for IT Staff and IT Manager roles
      const teamMembers = userList.filter((user: User) => 
        user.role_name === 'IT Staff' || user.role_name === 'IT Manager' || user.role_name === 'Admin'
      );
      setUsers(teamMembers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchServiceRequests(Object.fromEntries(Object.entries(newFilters).filter(([_, v]) => v)));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createServiceRequest({
      booking: formData.booking,
      service: formData.service,
      priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
    });
    setShowCreateModal(false);
    setFormData({ booking: '', service: '', priority: 'medium', assigned_to: '', status: 'pending' });
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequest) {
      await assignServiceRequest(selectedRequest.id, { assigned_to: formData.assigned_to });
      setShowAssignModal(false);
      setSelectedRequest(null);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequest) {
      await updateServiceRequestStatus(selectedRequest.id, { status: formData.status as 'pending' | 'assigned' | 'in_progress' | 'waiting_client' | 'completed' | 'closed' });
      setShowStatusModal(false);
      setSelectedRequest(null);
    }
  };

  const openAssignModal = (request: any) => {
    setSelectedRequest(request);
    setFormData({ ...formData, assigned_to: request.assigned_to || '' });
    setShowAssignModal(true);
  };

  const openStatusModal = (request: any) => {
    setSelectedRequest(request);
    setFormData({ ...formData, status: request.status });
    setShowStatusModal(true);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">Service Requests</h1>
          <p className="text-slate-500 mt-1">Manage client service requests and track progress</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm"
        >
          <Plus size={18} />
          <span>New Service Request</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Filter size={18} className="text-slate-400" />
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-slate-600">Status:</label>
          <select 
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
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
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-slate-600">Priority:</label>
          <select 
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = serviceRequests.filter(r => r.status === key).length;
          const Icon = config.icon;
          return (
            <div key={key} className={`${config.bg} p-4 rounded-xl border border-slate-100`}>
              <div className="flex items-center space-x-2">
                <Icon size={18} className={config.color} />
                <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
              </div>
              <p className={`text-2xl font-bold ${config.color} mt-1`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Service Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client / Booking</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned To</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviceRequests.map((request) => {
                  const StatusIcon = statusConfig[request.status]?.icon || Clock;
                  return (
                    <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{request.service_name}</p>
                          <p className="text-xs text-slate-500">{request.category_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{request.booking_details?.company_name || 'N/A'}</p>
                          <p className="text-xs text-slate-500">
                            {request.booking_details?.booking_date ? new Date(request.booking_details.booking_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${priorityConfig[request.priority]?.color}`}>
                          {priorityConfig[request.priority]?.label || request.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {request.assigned_user ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <User size={14} className="text-indigo-600" />
                            </div>
                            <span className="text-sm text-slate-700">{request.assigned_user.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[request.status]?.bg} ${statusConfig[request.status]?.color}`}>
                          <StatusIcon size={12} />
                          <span>{statusConfig[request.status]?.label || request.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(request.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => openAssignModal(request)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Assign"
                          >
                            <User size={16} />
                          </button>
                          <button 
                            onClick={() => openStatusModal(request)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Update Status"
                          >
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {serviceRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-3">
                        <Plus size={24} />
                      </div>
                      <h3 className="text-slate-600 font-medium">No service requests found</h3>
                      <p className="text-slate-400 text-sm mt-1">Create your first service request to get started.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">New Service Request</h3>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Booking</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  value={formData.booking}
                  onChange={(e) => setFormData({...formData, booking: e.target.value})}
                >
                  <option value="">Select a booking</option>
                  {bookings.map(booking => (
                    <option key={booking.id} value={booking.id}>
                      {booking.company_name} - {new Date(booking.booking_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Service</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  value={formData.service}
                  onChange={(e) => setFormData({...formData, service: e.target.value})}
                >
                  <option value="">Select a service</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.category_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Priority</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all"
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Assign Service Request</h3>
            </div>
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  Assign <strong>{selectedRequest?.service_name}</strong> to a team member.
                </p>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Assign To</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                >
                  <option value="">Select team member</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role_name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Update Status</h3>
            </div>
            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  Update status for <strong>{selectedRequest?.service_name}</strong>
                </p>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_client">Waiting for Client</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2 text-slate-600 font-semibold hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-all"
                >
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceRequestList;
