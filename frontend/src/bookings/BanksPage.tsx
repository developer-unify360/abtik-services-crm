import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, X, CreditCard, Trash2, Save } from 'lucide-react';
import { BankApi, type Bank } from './api/BankApi';

const BanksPage: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false, message: '', type: 'success',
  });

  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    branch_name: '',
    ifsc_code: '',
    account_holder_name: '',
    is_active: true,
  });

  const fetchBanks = async () => {
    try {
      setLoading(true);
      const data = await BankApi.list();
      setBanks(data);
    } catch (err) {
      console.error('Failed to fetch banks:', err);
      setSnackbar({ open: true, message: 'Failed to fetch banks', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleOpenCreate = () => {
    setEditingBank(null);
    setFormData({
      bank_name: '',
      account_number: '',
      branch_name: '',
      ifsc_code: '',
      account_holder_name: '',
      is_active: true,
    });
    setOpenForm(true);
  };

  const handleOpenEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      bank_name: bank.bank_name,
      account_number: bank.account_number,
      branch_name: bank.branch_name || '',
      ifsc_code: bank.ifsc_code || '',
      account_holder_name: bank.account_holder_name || '',
      is_active: bank.is_active,
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.bank_name || !formData.account_number) {
      setSnackbar({ open: true, message: 'Bank name and account number are required', type: 'error' });
      return;
    }

    try {
      if (editingBank) {
        await BankApi.update(editingBank.id, formData);
        setSnackbar({ open: true, message: 'Bank updated successfully', type: 'success' });
      } else {
        await BankApi.create(formData);
        setSnackbar({ open: true, message: 'Bank created successfully', type: 'success' });
      }
      setOpenForm(false);
      fetchBanks();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Operation failed';
      setSnackbar({ open: true, message: msg, type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bank?')) return;
    try {
      await BankApi.delete(id);
      setSnackbar({ open: true, message: 'Bank deleted successfully', type: 'success' });
      fetchBanks();
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Failed to delete bank', type: 'error' });
    }
  };

  const filteredBanks = banks.filter(bank => 
    bank.bank_name.toLowerCase().includes(search.toLowerCase()) ||
    bank.account_number.toLowerCase().includes(search.toLowerCase()) ||
    bank.branch_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 px-1 py-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bank Accounts</h1>
          <p className="text-slate-500 text-sm mt-1">Manage bank accounts for booking transactions</p>
        </div>
        <button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm active:scale-95">
          <Plus size={18} />
          Add Bank
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search banks by name, account number or branch..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Bank Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Account Number</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Branch & IFSC</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Account Holder</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading banks...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBanks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                        <CreditCard size={40} className="text-slate-200" />
                        <span>{search ? 'No banks match your search.' : 'No bank accounts found.'}</span>
                        {!search && <button onClick={handleOpenCreate} className="text-indigo-600 font-semibold hover:underline">Add one to get started.</button>}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBanks.map((bank) => (
                  <tr key={bank.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <CreditCard size={20} />
                        </div>
                        <span className="font-semibold text-slate-700">{bank.bank_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{bank.account_number}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700 font-medium">{bank.branch_name || '—'}</div>
                      <div className="text-xs text-slate-400 font-mono">{bank.ifsc_code || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{bank.account_holder_name || '—'}</td>
                    <td className="px-6 py-4 text-center">
                      {bank.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => handleOpenEdit(bank)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-indigo-100"
                          title="Edit Bank"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(bank.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-red-100"
                          title="Delete Bank"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {openForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {editingBank ? 'Edit Bank Account' : 'Add New Bank Account'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Enter details of the bank account</p>
              </div>
              <button 
                onClick={() => setOpenForm(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Name *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                    placeholder="e.g. HDFC Bank"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Account Number *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono placeholder:text-slate-300"
                    placeholder="Enter account number"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Branch Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                      placeholder="e.g. MG Road Branch"
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">IFSC Code</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all uppercase font-mono placeholder:text-slate-300"
                      placeholder="e.g. HDFC0001234"
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                    placeholder="Name in bank records"
                    value={formData.account_holder_name}
                    onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-3 py-2 bg-slate-50 px-4 rounded-2xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="is_active"
                    className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                    Active (Will appear in booking form)
                  </label>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
              <button 
                onClick={() => setOpenForm(false)} 
                className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:text-slate-800 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit} 
                className="px-10 py-3 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center gap-2"
              >
                {editingBank ? <Save size={20} /> : <Plus size={20} />}
                {editingBank ? 'Save Changes' : 'Add Bank account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {snackbar.open && (
        <div className={`fixed bottom-10 right-10 px-6 py-4 rounded-[20px] shadow-2xl ${
          snackbar.type === 'success' ? 'bg-slate-900 border border-white/10' : 'bg-red-600'
        } text-white flex items-center gap-4 z-[200] animate-in fade-in slide-in-from-right-10 duration-500`}>
          <div className={snackbar.type === 'success' ? 'text-indigo-400 bg-indigo-500/10 p-2 rounded-xl' : 'bg-white/20 p-2 rounded-xl'}>
            {snackbar.type === 'success' ? <CreditCard size={20} /> : <X size={20} />}
          </div>
          <div>
            <p className="font-bold text-sm">{snackbar.type === 'success' ? 'Success' : 'Error'}</p>
            <p className="text-sm opacity-80">{snackbar.message}</p>
          </div>
          <button 
            onClick={() => setSnackbar({ ...snackbar, open: false })}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-4"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default BanksPage;
