import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Settings, 
  UserPlus, 
  Layers, 
  Check, 
  X,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../auth/authStore';
import AttributeService, { type Attribute } from '../attributes/AttributeService';
import { ServiceApi, type Service } from '../services/api/ServiceApi';
import { UserService } from '../users/UserService';
import type { User } from '../users/UserService';

interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  strategy: 'round_robin';
  is_active: boolean;
  trigger_source: string | null;
  trigger_source_name: string | null;
  trigger_service: string | null;
  trigger_service_name: string | null;
  eligible_users: string[];
  eligible_users_count: number;
}

const LeadAssignmentRulesPage: React.FC = () => {
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<AssignmentRule> | null>(null);
  
  // Lookups
  const [sources, setSources] = useState<Attribute[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const token = useAuthStore.getState().token;
      const headers = { Authorization: `Bearer ${token}` };
      const [rulesRes, sourcesRes, servicesRes, usersRes] = await Promise.all([
        axios.get('/api/leads/assignment-rules/', { headers }),
        AttributeService.listLeadSources(),
        ServiceApi.list(),
        UserService.list()
      ]);
      setRules(rulesRes.data.results || rulesRes.data);
      setSources(sourcesRes.filter((s: Attribute) => s.is_active));
      setServices(servicesRes);
      setUsers((usersRes.results || usersRes).filter((u: User) => u.status !== false));
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSave = async () => {
    const token = useAuthStore.getState().token;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      if (editingRule?.id) {
        await axios.patch(`/api/leads/assignment-rules/${editingRule.id}/`, editingRule, { headers });
      } else {
        await axios.post('/api/leads/assignment-rules/', editingRule, { headers });
      }
      setShowModal(false);
      fetchRules();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const toggleActive = async (rule: AssignmentRule) => {
    const token = useAuthStore.getState().token;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.patch(`/api/leads/assignment-rules/${rule.id}/`, { is_active: !rule.is_active }, { headers });
      fetchRules();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden no-select">
      <div className="shrink-0 border-b border-slate-200 px-3 py-1.5 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-indigo-600" />
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Assignment Engine</h1>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">Admin Only</span>
        </div>
        <button 
          onClick={() => { setEditingRule({ strategy: 'round_robin', priority: 0, is_active: true, eligible_users: [] }); setShowModal(true); }}
          className="btn-primary"
        >
          <Plus size={12} className="mr-1" /> New Rule
        </button>
      </div>

      <div className="flex-1 overflow-auto scroll-y">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="table-header">
              <th className="px-3 py-1.5 w-16 text-center">Pri</th>
              <th className="px-3 py-1.5">Rule Name</th>
              <th className="px-3 py-1.5">Condition (Triggers)</th>
              <th className="px-3 py-1.5">Distribution</th>
              <th className="px-3 py-1.5">Status</th>
              <th className="px-3 py-1.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan={6} className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase">Loading Engine Config...</td></tr>
            ) : rules.length === 0 ? (
               <tr><td colSpan={6} className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase">No active rules defined</td></tr>
            ) : rules.map(rule => (
              <tr key={rule.id} className="table-row group">
                <td className="px-3 py-1.5 text-center font-black text-indigo-600 text-xs">#{rule.priority}</td>
                <td className="px-3 py-1.5">
                  <div className="leading-tight">
                    <p className="text-xs font-bold text-slate-900">{rule.name}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wider">{rule.strategy.replace('_', ' ')}</p>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    {rule.trigger_source_name ? (
                      <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1 rounded font-bold uppercase">Src: {rule.trigger_source_name}</span>
                    ) : (
                      <span className="text-[9px] text-slate-400 italic font-bold">Any Source</span>
                    )}
                    <ChevronRight size={10} className="text-slate-300" />
                    {rule.trigger_service_name ? (
                      <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 rounded font-bold uppercase">Svc: {rule.trigger_service_name}</span>
                    ) : (
                      <span className="text-[9px] text-slate-400 italic font-bold">Any Service</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <UserPlus size={11} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-700">{rule.eligible_users_count} Eligible BDEs</span>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <button 
                    onClick={() => toggleActive(rule)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase transition-colors ${
                      rule.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {rule.is_active ? <Play size={10} fill="currentColor" /> : <Pause size={10} fill="currentColor" />}
                    {rule.is_active ? 'Active' : 'Paused'}
                  </button>
                </td>
                <td className="px-3 py-1.5 text-right group-hover:opacity-100 opacity-60 transition-opacity">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      onClick={() => { setEditingRule(rule); setShowModal(true); }}
                      className="p-1 hover:text-indigo-600 rounded"
                    >
                      <Settings size={14} />
                    </button>
                    <button className="p-1 hover:text-rose-600 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal - Rule Configuration */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-white rounded shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-900">Configure Assignment Logic</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>
            
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto scroll-y">
              {/* Basic Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Rule Label</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Website Tech Leads Round Robin"
                    value={editingRule?.name || ''}
                    onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Processing Priority</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={editingRule?.priority || 0}
                    onChange={e => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 mb-1 block">Distribution Pattern</label>
                  <select className="input-field cursor-not-allowed" disabled>
                    <option value="round_robin">Round Robin</option>
                  </select>
                </div>
              </div>

              {/* Triggers */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-900 flex items-center gap-1">
                  <Play size={10} className="text-indigo-600" /> Intake Triggers
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Trigger Source</label>
                    <select 
                      className="input-field"
                      value={editingRule?.trigger_source || ''}
                      onChange={e => setEditingRule({ ...editingRule, trigger_source: e.target.value || null })}
                    >
                      <option value="">-- Any Source --</option>
                      {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-semibold text-slate-500 block mb-1">Trigger Service</label>
                    <select 
                      className="input-field"
                      value={editingRule?.trigger_service || ''}
                      onChange={e => setEditingRule({ ...editingRule, trigger_service: e.target.value || null })}
                    >
                      <option value="">-- Any Service --</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* User Selection */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-900 border-b border-slate-100 pb-1">Eligible BDEs</p>
                <div className="grid grid-cols-2 gap-2 h-40 overflow-y-auto pr-1">
                  {users.map(user => {
                    const isSelected = editingRule?.eligible_users?.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          const current = editingRule?.eligible_users || [];
                          const updated = isSelected 
                            ? current.filter(id => id !== user.id)
                            : [...current, user.id];
                          setEditingRule({ ...editingRule, eligible_users: updated });
                        }}
                        className={`flex items-center justify-between px-2 py-1.5 rounded border text-left transition-all ${
                          isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase truncate">{user.name || user.email}</span>
                        {isSelected && <Check size={12} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button 
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1 py-1.5 font-black uppercase tracking-tighter"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="btn-primary flex-1 py-1.5 font-black uppercase tracking-tighter"
              >
                Deploy Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadAssignmentRulesPage;
