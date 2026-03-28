import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { UserService, type User, type UserCreateData } from './UserService';

const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const ROLE_CHOICES = [
    { value: 'admin', label: 'Admin' },
    { value: 'sales_manager', label: 'Sales Manager' },
    { value: 'booking_ops', label: 'Booking Ops' },
    { value: 'finance', label: 'Finance' },
    { value: 'hr', label: 'HR' },
    { value: 'service_ops', label: 'Service Ops' },
  ];
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false, message: '', type: 'success',
  });

  const [formData, setFormData] = useState<{ name: string; email: string; phone: string; role: string; password: string }>({
    name: '', email: '', phone: '', role: '', password: '',
  });

  const fetchUsers = async () => {
    try {
      const params: Record<string, string> = { page: String(page + 1) };
      if (search) params.search = search;
      const data = await UserService.list(params);
      setUsers(data.results || data);
      setTotalCount(data.count || (data.results || data).length);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };


  useEffect(() => { 
    fetchUsers(); 
  }, [page, search]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', phone: '', role: '', password: '' });
    setOpenForm(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email,
      phone: user.phone || '',
      role: user.role || '',
      password: '',
    });
    setOpenForm(true);
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.email}"?`)) {
      return;
    }
    try {
      await UserService.delete(user.id);
      setSnackbar({ open: true, message: 'User deleted successfully', type: 'success' });
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Delete failed';
      setSnackbar({ open: true, message: msg, type: 'error' });
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const updateData: Partial<UserCreateData> = {};
        if (formData.name) updateData.name = formData.name;
        if (formData.phone) updateData.phone = formData.phone;
        if (formData.role) updateData.role = formData.role;
        if (formData.password) updateData.password = formData.password;
        
        await UserService.update(editingUser.id, updateData);
        setSnackbar({ open: true, message: 'User updated successfully', type: 'success' });
      } else {
        await UserService.create(formData);
        setSnackbar({ open: true, message: 'User created successfully', type: 'success' });
      }
      setOpenForm(false);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Operation failed';
      setSnackbar({ open: true, message: msg, type: 'error' });
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden">
      {/* Header */}
      <div className="mb-6 flex min-w-0 items-start justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-bold text-slate-800">Users</h1>
        <button onClick={handleOpenCreate} className="page-header-action bg-indigo-600 hover:bg-indigo-700">
          <Plus size={12} />
          Add User
        </button>
      </div>

      {/* Toolbar */}
      <div className="card mb-6 min-w-0">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container flex min-w-0 flex-col overflow-hidden">
        <div className="table-scroll min-w-0 overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr className="table-header">
              <th className="text-left px-6 py-3 font-semibold">Name</th>
              <th className="text-left px-6 py-3 font-semibold">Email</th>
              <th className="text-left px-6 py-3 font-semibold">Phone</th>
              <th className="text-left px-6 py-3 font-semibold">Role</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="text-left px-6 py-3 font-semibold">Created</th>
              <th className="text-right px-6 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="table-row">
                <td className="px-6 py-4 font-medium text-slate-800">{user.name || '—'}</td>
                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                <td className="px-6 py-4 text-gray-600">{user.phone || '—'}</td>
                <td className="px-6 py-4">
                  <span className="badge badge-info">{user.role_display || 'No Role'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`badge ${user.status ? 'badge-success' : 'badge-error'}`}>
                    {user.status ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleOpenEdit(user)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(user)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-block ml-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        
        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingUser ? 'Edit User' : 'New User'}
              </h2>
              <button 
                onClick={() => setOpenForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  className="input-field"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    className="input-field"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="">Select a role</option>
                    {ROLE_CHOICES.map((rc) => (
                      <option key={rc.value} value={rc.value}>
                        {rc.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser ? '' : '*'}
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={formData.password || ''}
                  placeholder={editingUser ? 'Leave blank to keep current password' : ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setOpenForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn-primary">
                {editingUser ? 'Update' : 'Create'}
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

export default UserListPage;
