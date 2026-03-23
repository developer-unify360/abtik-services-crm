import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Eye, X } from 'lucide-react';
import { ClientService, type Client, type ClientCreateData } from './ClientService';
import AttributeService, { type Attribute } from '../attributes/AttributeService';

const ClientListPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [openForm, setOpenForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false, message: '', type: 'success',
  });

  const [formData, setFormData] = useState<ClientCreateData>({
    client_name: '', company_name: '', gst_pan: '', email: '', mobile: '', industry: '',
  });

  const [industries, setIndustries] = useState<Attribute[]>([]);

  const fetchClients = async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      params.page = String(page + 1);
      const data = await ClientService.list(params);
      setClients(data.results || data);
      setTotalCount(data.count || (data.results || data).length);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const fetchIndustries = async () => {
    try {
      const data = await AttributeService.listIndustries();
      setIndustries(data);
    } catch (err) {
      console.error('Failed to fetch industries:', err);
    }
  };

  useEffect(() => { fetchClients(); fetchIndustries(); }, []);
  useEffect(() => { fetchClients(); }, [page, search]);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormData({ client_name: '', company_name: '', gst_pan: '', email: '', mobile: '', industry: '' });
    setOpenForm(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      client_name: client.client_name, company_name: client.company_name,
      gst_pan: client.gst_pan || '', email: client.email,
      mobile: client.mobile, industry: String(client.industry || ''),
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingClient) {
        await ClientService.update(editingClient.id, formData);
        setSnackbar({ open: true, message: 'Client updated successfully', type: 'success' });
      } else {
        await ClientService.create(formData);
        setSnackbar({ open: true, message: 'Client created successfully', type: 'success' });
      }
      setOpenForm(false);
      fetchClients();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Operation failed';
      setSnackbar({ open: true, message: msg, type: 'error' });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
        <button onClick={handleOpenCreate} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Add Client
        </button>
      </div>

      {/* Toolbar */}
      <div className="card mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search clients..."
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
              <th className="text-left px-6 py-3 font-semibold">Client Name</th>
              <th className="text-left px-6 py-3 font-semibold">Company</th>
              <th className="text-left px-6 py-3 font-semibold">Email</th>
              <th className="text-left px-6 py-3 font-semibold">Mobile</th>
              <th className="text-left px-6 py-3 font-semibold">Industry</th>
              <th className="text-left px-6 py-3 font-semibold">Created</th>
              <th className="text-right px-6 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No clients found. Create a new client to get started.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="table-row">
                  <td className="px-6 py-4 font-medium text-slate-800">{client.client_name}</td>
                  <td className="px-6 py-4 text-gray-600">{client.company_name}</td>
                  <td className="px-6 py-4 text-gray-600">{client.email}</td>
                  <td className="px-6 py-4 text-gray-600">{client.mobile}</td>
                  <td className="px-6 py-4">
                    {client.industry_name && (
                      <span className="badge badge-info">{client.industry_name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{new Date(client.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setViewingClient(client)}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-block"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handleOpenEdit(client)}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button 
                onClick={() => setOpenForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    className="input-field"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST / PAN</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.gst_pan || ''}
                    onChange={(e) => setFormData({ ...formData, gst_pan: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <select
                    className="input-field"
                    value={formData.industry || ''}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  >
                    <option value="">None</option>
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.id}>{ind.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setOpenForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn-primary">
                {editingClient ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-800">Client Details</h2>
              <button 
                onClick={() => setViewingClient(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p><strong className="text-gray-700">Name:</strong> <span className="text-gray-600">{viewingClient.client_name}</span></p>
              <p><strong className="text-gray-700">Company:</strong> <span className="text-gray-600">{viewingClient.company_name}</span></p>
              <p><strong className="text-gray-700">Email:</strong> <span className="text-gray-600">{viewingClient.email}</span></p>
              <p><strong className="text-gray-700">Mobile:</strong> <span className="text-gray-600">{viewingClient.mobile}</span></p>
              <p><strong className="text-gray-700">GST/PAN:</strong> <span className="text-gray-600">{viewingClient.gst_pan || '—'}</span></p>
              <p><strong className="text-gray-700">Industry:</strong> <span className="text-gray-600">{viewingClient.industry_name || '—'}</span></p>
              <p><strong className="text-gray-700">Created By:</strong> <span className="text-gray-600">{viewingClient.created_by_name || '—'}</span></p>
              <p><strong className="text-gray-700">Created:</strong> <span className="text-gray-600">{new Date(viewingClient.created_at).toLocaleString()}</span></p>
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
              <button onClick={() => setViewingClient(null)} className="btn-secondary">
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

export default ClientListPage;
