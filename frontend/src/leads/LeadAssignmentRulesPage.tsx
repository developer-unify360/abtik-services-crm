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
import apiClient from '../api/apiClient';
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

const ASSIGNMENT_RULES_ENDPOINT = '/leads/assignment-rules/';

const LeadAssignmentRulesPage: React.FC = () => {
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<AssignmentRule> | null>(null);
  const [formError, setFormError] = useState('');

  // Lookups
  const [sources, setSources] = useState<Attribute[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const [rulesRes, sourcesRes, servicesRes, usersRes] = await Promise.all([
        apiClient.get(ASSIGNMENT_RULES_ENDPOINT),
        AttributeService.listLeadSources(),
        ServiceApi.list(),
        UserService.list()
      ]);
      setRules(rulesRes.data?.data ?? rulesRes.data?.results ?? rulesRes.data ?? []);
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
    if (!editingRule?.name?.trim()) {
      setFormError('Rule name is required.');
      return;
    }

    if (!editingRule.eligible_users?.length) {
      setFormError('Select at least one eligible user.');
      return;
    }

    setFormError('');

    try {
      if (editingRule?.id) {
        await apiClient.patch(`${ASSIGNMENT_RULES_ENDPOINT}${editingRule.id}/`, editingRule);
      } else {
        await apiClient.post(ASSIGNMENT_RULES_ENDPOINT, editingRule);
      }
      setFormError('');
      setShowModal(false);
      fetchRules();
    } catch (err: any) {
      setFormError(
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.eligible_users?.[0] ||
        'Failed to save rule.'
      );
      console.error('Save error:', err);
    }
  };

  const toggleActive = async (rule: AssignmentRule) => {
    try {
      await apiClient.patch(`${ASSIGNMENT_RULES_ENDPOINT}${rule.id}/`, { is_active: !rule.is_active });
      fetchRules();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  return (
    <div className="flex min-w-0 flex-col h-full overflow-hidden bg-white no-select">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/50 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-indigo-600" />
          <h1 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Assignment Engine</h1>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">Admin Only</span>
        </div>
        <button
          onClick={() => {
            setFormError('');
            setEditingRule({ strategy: 'round_robin', priority: 0, is_active: true, eligible_users: [] });
            setShowModal(true);
          }}
          className="page-header-action bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus size={12} /> New Rule
        </button>
      </div>

      <div className="table-scroll flex-1 min-w-0 overflow-auto scroll-y">
        <div className="min-w-[700px]">
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
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase transition-colors ${rule.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                      {rule.is_active ? <Play size={10} fill="currentColor" /> : <Pause size={10} fill="currentColor" />}
                      {rule.is_active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="px-3 py-1.5 text-right group-hover:opacity-100 opacity-60 transition-opacity">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setFormError('');
                          setEditingRule(rule);
                          setShowModal(true);
                        }}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-[2px]">
            <div className="mx-4 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800">
                  {editingRule?.id ? 'Edit Assignment Rule' : 'New Assignment Rule'}
                </h3>
                <button
                  onClick={() => {
                    setFormError('');
                    setShowModal(false);
                  }}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[80vh] space-y-5 overflow-y-auto p-6 scroll-y">
                {formError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {formError}
                  </div>
                )}

                {/* Basic Meta */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Rule Name</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      placeholder="e.g. Website Tech Leads Round Robin"
                      value={editingRule?.name || ''}
                      onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Priority</label>
                    <input
                      type="number"
                      className="input-field text-sm"
                      value={editingRule?.priority || 0}
                      onChange={e => setEditingRule({ ...editingRule, priority: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Distribution Pattern</label>
                    <select className="input-field cursor-not-allowed text-sm" disabled>
                      <option value="round_robin">Round Robin</option>
                    </select>
                  </div>
                </div>

                {/* Triggers */}
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Play size={14} className="text-indigo-600" /> Intake Triggers
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Trigger Source</label>
                      <select
                        className="input-field text-sm"
                        value={editingRule?.trigger_source || ''}
                        onChange={e => setEditingRule({ ...editingRule, trigger_source: e.target.value || null })}
                      >
                        <option value="">-- Any Source --</option>
                        {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Trigger Service</label>
                      <select
                        className="input-field text-sm"
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
                  <p className="border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">Eligible BDEs</p>
                  <div className="grid h-10 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
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
                          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                        >
                          <span className="truncate text-sm font-medium">{user.name || user.email}</span>
                          {isSelected && <Check size={12} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <button
                  onClick={() => {
                    setFormError('');
                    setShowModal(false);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                >
                  Save Rule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadAssignmentRulesPage;
