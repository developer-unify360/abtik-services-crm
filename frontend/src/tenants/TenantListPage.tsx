import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, X, Check } from 'lucide-react';
import { TenantService, type Tenant, type TenantCreateData } from './TenantService';

const TenantListPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false, message: '', type: 'success',
  });

  const [formData, setFormData] = useState<{ name: string; industry: string; status: boolean }>({
    name: '', industry: '', status: true,
  });

  const fetchTenants = async () => {
    try {
      const params: Record<string, string> = { page: String(page + 1) };
      if (search) params.search = search;
      const data = await TenantService.list(params);
      setTenants(data.results || data);
      setTotalCount(data.count || (data.results || data).length);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    }
  };

  useEffect(() => { fetchTenants(); }, [page, search]);

  const handleOpenCreate = () => {
    setEditingTenant(null);
    setFormData({ name: '', industry: '', status: true });
    setOpenForm(true);
  };

  const handleOpenEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name, industry: tenant.industry || '', status: tenant.status === true,
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingTenant) {
        await TenantService.update(editingTenant.id, formData);
        setSnackbar({ open: true, message: 'Tenant updated successfully', type: 'success' });
      } else {
        await TenantService.create(formData);
        setSnackbar({ open: true, message: 'Tenant created successfully', type: 'success' });
      }
      setOpenForm(false);
      fetchTenants();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Operation failed';
      setSnackbar({ open: true, message: msg, type: 'error' });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Organizations (Tenants)</h1>
        <button 
          onClick={handleOpenCreate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Add Organization
        </button>
      </div>

      {/* Toolbar */}
      <div className="card mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search organizations..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="text-left px-6 py-3 font-semibold">Name</th>
              <th className="text-left px-6 py-3 font-semibold">Industry</th>
              <th className="text-left px-6 py-3 font-semibold">Status</th>
              <th className="text-left px-6 py-3 font-semibold">Created</th>
              <th className="text-right px-6 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="table-row">
                <td className="px-6 py-4 font-medium text-slate-800">{tenant.name}</td>
                <td className="px-6 py-4 text-gray-600">{tenant.industry || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`badge ${tenant.status ? 'badge-success' : 'badge-error'}`}>
                    {tenant.status ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{new Date(tenant.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleOpenEdit(tenant)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No organizations found.
                </td>
              </tr>
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

      {/* Modal */}
      {openForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingTenant ? 'Edit Organization' : 'New Organization'}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.industry || ''}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="input-field"
                    value={formData.status ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button 
                onClick={() => setOpenForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="btn-primary"
              >
                {editingTenant ? 'Update' : 'Create'}
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

export default TenantListPage;
