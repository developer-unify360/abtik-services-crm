import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Target,
  ArrowUpRight,
  Edit2,
  X,
  User as UserIcon,
  Building2,
  Phone,
  Mail,
  Briefcase,
  MessageSquare,
  Save
} from 'lucide-react';
import { LeadService } from './LeadService';
import type { Lead, LeadSummary } from './LeadService';
import AttributeService, { type Attribute } from '../attributes/AttributeService';
import { ServiceApi, type Service } from '../services/api/ServiceApi';
import { UserService } from '../users/UserService';
import type { User } from '../users/UserService';

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'new': { label: 'New', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  'contacted': { label: 'Contacted', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  'qualified': { label: 'Qualified', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  'proposal_sent': { label: 'Proposal', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  'negotiation': { label: 'Negotiation', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  'closed_won': { label: 'Won', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
  'closed_lost': { label: 'Lost', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  'low': { label: 'Low', color: 'bg-slate-400' },
  'medium': { label: 'Medium', color: 'bg-blue-500' },
  'high': { label: 'High', color: 'bg-orange-500' },
  'urgent': { label: 'Urgent', color: 'bg-red-600' },
};

const LeadListPage: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  
  // Dropdown data
  const [industries, setIndustries] = useState<Attribute[]>([]);
  const [leadSources, setLeadSources] = useState<Attribute[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [leadsData, summaryData, industriesData, sourcesData, servicesData, usersData] = await Promise.all([
          LeadService.list(),
          LeadService.getSummary(),
          AttributeService.listIndustries(),
          AttributeService.listLeadSources(),
          ServiceApi.list(),
          UserService.list()
        ]);
        setLeads(leadsData.results || leadsData);
        setSummary(summaryData);
        setIndustries(industriesData.filter((ind: Attribute) => ind.is_active));
        setLeadSources(sourcesData.filter((src: Attribute) => src.is_active));
        setServices(servicesData);
        setUsers((usersData.results || usersData).filter((u: User) => u.status !== false));
      } catch (error) {
        console.error('Failed to fetch leads:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Edit handlers
  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setEditFormData({
      client_name: lead.client_name,
      company_name: lead.company_name,
      email: lead.email,
      mobile: lead.mobile,
      industry: lead.industry || '',
      source: lead.source || '',
      service: lead.service || '',
      assigned_to: lead.assigned_to || '',
      bde_name: lead.bde_name,
      status: lead.status,
      priority: lead.priority,
      lead_score: lead.lead_score,
      notes: lead.notes,
      next_follow_up_date: lead.next_follow_up_date || ''
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingLead(null);
    setEditFormData({});
  };

  const handleEditSave = async () => {
    if (!editingLead) return;
    setSaving(true);
    try {
      const updateData = {
        ...editFormData,
        industry: editFormData.industry || null,
        source: editFormData.source || null,
        service: editFormData.service || null,
        assigned_to: editFormData.assigned_to || null,
      };
      await LeadService.update(editingLead.id, updateData);
      // Refresh leads list
      const leadsData = await LeadService.list();
      setLeads(leadsData.results || leadsData);
      closeEditModal();
    } catch (error) {
      console.error('Failed to update lead:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lead Management</h1>
          <p className="text-slate-500 mt-1">Nurture and convert your high-potential opportunities.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/leads/new')}
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            <Plus size={18} className="transition-transform group-hover:rotate-90" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Summary Stats cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Leads</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.total_leads}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <Target size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
              <TrendingUp size={12} />
              <span>+12.5% this month</span>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Qualified</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.qualified_leads}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <BarChart3 size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-slate-200" />
                ))}
              </div>
              <span>Nurtured by team</span>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Converted</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.closed_won}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div className="mt-4 text-xs font-medium text-slate-500">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${summary.conversion_rate}%` }} />
              </div>
              <p className="mt-1">{summary.conversion_rate}% Conversion rate</p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">New Leads</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{summary.new_leads}</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
                <AlertCircle size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 w-fit px-2 py-1 rounded-full">
              <Clock size={12} />
              <span>Requires Attention</span>
            </div>
          </div>
        </div>
      )}

      {/* Main List Section */}
      <div className="rounded-[28px] border border-slate-200 bg-white shadow-xl overflow-hidden">
        {/* Controls */}
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-6 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search leads by name, company..." 
              className="w-full rounded-xl border-slate-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              <Filter size={16} />
              <select 
                className="bg-transparent outline-none cursor-pointer"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Lead Contact</th>
                <th className="px-3 py-2 text-left">BDE & Source</th>
                <th className="px-3 py-2 text-left">Service</th>
                <th className="px-3 py-2 text-left">Status & Priority</th>
                <th className="px-3 py-2 text-left">Assigned To</th>
                <th className="px-3 py-2 text-left">Score</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                      <span>Loading high-potential leads...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : filteredLeads.map((lead) => {
                const cfg = statusConfig[lead.status] || statusConfig['new'];
                const pcfg = priorityConfig[lead.priority] || priorityConfig['medium'];
                
                return (
                  <tr 
                    key={lead.id} 
                    className="group hover:bg-slate-50 border-b border-slate-100 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {lead.client_name?.[0].toUpperCase() || 'L'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{lead.client_name}</p>
                          <div className="flex gap-2">
                             <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{lead.company_name}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-700">{lead.bde_name || 'System'}</span>
                        <span className="text-[9px] uppercase tracking-tighter text-slate-400 font-bold">{lead.source_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-medium text-slate-700">
                        {lead.service_name || <span className="text-slate-400 italic">Not specified</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border} whitespace-nowrap`}>
                          {cfg.label}
                        </span>
                        <span className={`text-[10px] font-bold uppercase ${pcfg.color.replace('bg-', 'text-')}`}>{lead.priority_display}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <div className="h-5 w-5 rounded-full bg-slate-200" />
                        <span className="font-medium">{lead.assigned_to_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-sm font-bold text-slate-900">{lead.lead_score}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          title="Edit Lead"
                          onClick={() => openEditModal(lead)}
                          className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-600 hover:bg-slate-600 hover:text-white transition-all shadow-sm"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          title="Convert to Booking"
                          onClick={() => {
                            LeadService.convert(lead.id).catch(console.error);
                            navigate('/bookings/new', { 
                              state: { 
                                prefill: {
                                  client_name: lead.client_name,
                                  company_name: lead.company_name,
                                  email: lead.email,
                                  mobile: lead.mobile,
                                  bde_name: lead.bde_name,
                                  lead_source: lead.source,
                                  service: lead.service,
                                  lead_id: lead.id,
                                } 
                              } 
                            });
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2">
          <div className="absolute bg-black/50 backdrop-blur-sm" onClick={closeEditModal} />
          <div className="relative w-full max-w-3xl max-h-[85vh] rounded-xl bg-white shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Edit Lead</h2>
                  <p className="text-[10px] text-slate-500">{editingLead.client_name}</p>
                </div>
              </div>
              <button 
                onClick={closeEditModal}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content - Compact grid */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid gap-2 md:grid-cols-4 text-xs">
                {/* Row 1: Client Details */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Client Name</label>
                  <input
                    type="text"
                    className="input-field py-1 text-xs"
                    value={editFormData.client_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, client_name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Company Name</label>
                  <input
                    type="text"
                    className="input-field py-1 text-xs"
                    value={editFormData.company_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Email</label>
                  <input
                    type="email"
                    className="input-field py-1 text-xs"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Mobile</label>
                  <input
                    type="text"
                    className="input-field py-1 text-xs"
                    value={editFormData.mobile || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Industry</label>
                  <select
                    className="input-field py-1 text-xs"
                    value={editFormData.industry || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, industry: e.target.value })}
                  >
                    <option value="">-</option>
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.id}>{ind.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Lead Source</label>
                  <select
                    className="input-field py-1 text-xs"
                    value={editFormData.source || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value })}
                  >
                    <option value="">-</option>
                    {leadSources.map((src) => (
                      <option key={src.id} value={src.id}>{src.name}</option>
                    ))}
                  </select>
                </div>

                {/* Row 2: Status, Priority, Score */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Status</label>
                  <select
                    className="input-field py-1 text-xs"
                    value={editFormData.status || 'new'}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal_sent">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="closed_won">Won</option>
                    <option value="closed_lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Priority</label>
                  <select
                    className="input-field py-1 text-xs"
                    value={editFormData.priority || 'medium'}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Score</label>
                  <input
                    type="number"
                    className="input-field py-1 text-xs"
                    value={editFormData.lead_score || 0}
                    onChange={(e) => setEditFormData({ ...editFormData, lead_score: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Service</label>
                  <select
                    className="input-field py-1 text-xs"
                    value={editFormData.service || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, service: e.target.value })}
                  >
                    <option value="">-</option>
                    {services.map((srv) => (
                      <option key={srv.id} value={srv.id}>{srv.name}</option>
                    ))}
                  </select>
                </div>

                {/* Row 3: Assign, BDE, Follow-up */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Assign To</label>
                  <select
                    className="input-field py-1 text-xs"
                    value={editFormData.assigned_to || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, assigned_to: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">BDE Name</label>
                  <input
                    type="text"
                    className="input-field py-1 text-xs"
                    value={editFormData.bde_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, bde_name: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Follow-up Date</label>
                  <input
                    type="date"
                    className="input-field py-1 text-xs"
                    value={editFormData.next_follow_up_date || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, next_follow_up_date: e.target.value })}
                  />
                </div>

                {/* Notes - full width */}
                <div className="col-span-4">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">Notes</label>
                  <textarea
                    className="input-field py-1 text-xs min-h-[40px]"
                    value={editFormData.notes || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    placeholder="Notes..."
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
              <button
                onClick={closeEditModal}
                className="rounded px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save size={12} />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadListPage;
