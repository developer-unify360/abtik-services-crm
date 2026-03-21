import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, X, Trash2, Save, Check, AlertCircle } from 'lucide-react';
import AttributeService, { type Attribute } from './AttributeService';

interface AttributeTableProps {
  title: string;
  type: 'industry' | 'leadSource' | 'paymentType';
}

const AttributeTable: React.FC<AttributeTableProps> = ({ title, type }) => {
  const [items, setItems] = useState<Attribute[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Attribute | null>(null);
  const [formData, setFormData] = useState({ name: '', is_active: true });
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      let data: Attribute[] = [];
      if (type === 'industry') {
        data = await AttributeService.listIndustries();
      } else if (type === 'leadSource') {
        data = await AttributeService.listLeadSources();
      } else if (type === 'paymentType') {
        data = await AttributeService.listPaymentTypes();
      }
      setItems(data);
    } catch (err) {
      console.error(`Failed to fetch ${type}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', is_active: true });
    setError('');
    setOpenForm(true);
  };

  const handleOpenEdit = (item: Attribute) => {
    setEditingItem(item);
    setFormData({ name: item.name, is_active: item.is_active });
    setError('');
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      if (editingItem) {
        if (type === 'industry') {
          await AttributeService.updateIndustry(editingItem.id, formData);
        } else if (type === 'leadSource') {
          await AttributeService.updateLeadSource(editingItem.id, formData);
        } else if (type === 'paymentType') {
          await AttributeService.updatePaymentType(editingItem.id, formData);
        }
      } else {
        if (type === 'industry') {
          await AttributeService.createIndustry(formData);
        } else if (type === 'leadSource') {
          await AttributeService.createLeadSource(formData);
        } else if (type === 'paymentType') {
          await AttributeService.createPaymentType(formData);
        }
      }
      setOpenForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.name?.[0] || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${title}?`)) return;
    try {
      if (type === 'industry') {
        await AttributeService.deleteIndustry(id);
      } else if (type === 'leadSource') {
        await AttributeService.deleteLeadSource(id);
      } else if (type === 'paymentType') {
        await AttributeService.deletePaymentType(id);
      }
      fetchData();
    } catch (err) {
      alert('Failed to delete. It might be in use.');
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 text-sm transition-all active:scale-95 shadow-sm"
        >
          <Plus size={16} />
          Add {title}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Name</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No data found</td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{item.name}</td>
                  <td className="px-4 py-2.5 text-center">
                    {item.is_active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {openForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">{editingItem ? `Edit ${title}` : `Add New ${title}`}</h2>
              <button 
                onClick={() => setOpenForm(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1.5">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                  placeholder={`Enter ${title.toLowerCase()} name`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span className="text-sm font-medium text-slate-700">Active Status</span>
              </label>
            </div>

            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setOpenForm(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-100"
              >
                <Save size={16} />
                {editingItem ? 'Save Changes' : `Add ${title}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttributeTable;
