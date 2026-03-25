import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  X,
  Phone,
  ArrowUpRight,
  Layers,
  Play
} from 'lucide-react';
import { LeadService } from './LeadService';
import type { Lead, LeadSummary } from './LeadService';
import { useAuthStore } from '../auth/authStore';

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'new': { label: 'New', color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
  'contacted': { label: 'Contacted', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
  'qualified': { label: 'Qualified', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  'proposal_sent': { label: 'Proposal Sent', color: 'text-indigo-700', bg: 'bg-indigo-100', border: 'border-indigo-200' },
  'negotiation': { label: 'Negotiation', color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-200' },
  'closed_won': { label: 'Closed Won', color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' },
  'closed_lost': { label: 'Closed Lost', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  'low': { label: 'Low', color: 'text-slate-500' },
  'medium': { label: 'Medium', color: 'text-blue-600' },
  'high': { label: 'High', color: 'text-orange-600' },
  'urgent': { label: 'Urgent', color: 'text-red-600' },
};

const LeadListPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unassigned' | 'my' | 'overdue'>('all');
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showWorkspace, setShowWorkspace] = useState(false);
  
  const [showCallModal, setShowCallModal] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [callStatus, setCallStatus] = useState('contacted');
  const [savingCall, setSavingCall] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const [leadsData, summaryData] = await Promise.all([
        LeadService.list(),
        LeadService.getSummary(),
      ]);
      setLeads(leadsData.results || leadsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    let result = leads.filter(lead => {
      const nameMatch = lead.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const companyMatch = lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || companyMatch;
    });

    if (activeTab === 'unassigned') result = result.filter(l => !l.assigned_to);
    if (activeTab === 'my') result = result.filter(l => l.assigned_to === currentUser?.id);
    if (activeTab === 'overdue') {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(l => l.next_follow_up_date && l.next_follow_up_date < today && l.status !== 'closed_won' && l.status !== 'closed_lost');
    }

    return result;
  }, [leads, searchTerm, activeTab, currentUser]);

  const handleLogCall = async () => {
    if (!selectedLead) return;
    setSavingCall(true);
    try {
      await LeadService.logActivity(selectedLead.id, {
        activity_type: 'call',
        description: `Call Logged: ${callNotes}`
      });
      await LeadService.updateStatus(selectedLead.id, {
        status: callStatus
      });
      setShowCallModal(false);
      setCallNotes('');
      fetchLeads();
      const updated = await LeadService.get(selectedLead.id);
      setSelectedLead(updated);
    } catch (error) {
      console.error('Call log fail:', error);
    } finally {
      setSavingCall(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden shadow-inner no-select">
      {/* Page Header */}
      <div className="shrink-0 border-b border-slate-200 px-6 py-4 bg-white/50 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Lead Processing Inbox</h1>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
                {(['all', 'unassigned', 'my', 'overdue'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-md transition-all ${
                      activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-900'
                    }`}
                  >
                    {tab === 'my' ? 'Assigned' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Find leads by name..."
                className="input-field pl-10 w-64 shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => navigate('/leads/new')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> New Lead
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main List Area */}
        <div className={`flex-1 flex flex-col min-w-0 ${showWorkspace ? 'border-r border-slate-200 shadow-2xl z-10' : ''}`}>
          <div className="flex-1 overflow-auto scroll-y bg-slate-50/30">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-slate-200 shadow-sm">
                <tr className="table-header">
                  <th className="px-6 py-4 w-16 text-center">Score</th>
                  <th className="px-6 py-4">Lead Details</th>
                  <th className="px-6 py-4">Service & Origin</th>
                  <th className="px-6 py-4">Current Status</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4 text-right">Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">Retrieving inbox...</td></tr>
                ) : filteredLeads.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-bold uppercase tracking-widest text-sm">No leads in this queue</td></tr>
                ) : filteredLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    onClick={() => { setSelectedLead(lead); setShowWorkspace(true); }}
                    className={`table-row cursor-pointer transition-all ${selectedLead?.id === lead.id ? 'bg-indigo-50/80 border-l-4 border-indigo-600 scale-[1.002]' : ''}`}
                  >
                    <td className="px-6 py-5 text-center">
                      <span className={`text-sm font-black p-2 rounded-lg border ${
                        lead.lead_score > 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        lead.lead_score > 40 ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {lead.lead_score}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 tracking-tight">{lead.client_name}</span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[200px]">{lead.company_name || 'Individual'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{lead.service_name || 'Generic Inquiry'}</span>
                        <span className="text-[11px] text-slate-400 font-bold italic">{lead.source_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`badge ${statusConfig[lead.status]?.bg} ${statusConfig[lead.status]?.color} border-2 ${statusConfig[lead.status]?.border} shadow-sm px-3 py-1 font-black`}>
                        {statusConfig[lead.status]?.label}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-xs font-black uppercase tracking-widest ${priorityConfig[lead.priority]?.color}`}>
                        {priorityConfig[lead.priority]?.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className={`text-xs font-black ${
                        lead.next_follow_up_date && lead.next_follow_up_date < new Date().toISOString().split('T')[0] ? 'text-rose-600' : 'text-slate-500'
                      }`}>
                        {lead.next_follow_up_date || 'TBD'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* List Footer */}
          <div className="shrink-0 h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between shadow-inner">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Queue Density: {filteredLeads.length} Records</span>
            <div className="flex items-center gap-6">
              {summary && (
                <>
                  <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><Play size={10} fill="currentColor" /> Closed Won: {summary.closed_won}</span>
                  <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1"><Layers size={10} fill="currentColor" /> Pipeline Velocity: {summary.conversion_rate}%</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Workspace */}
        {showWorkspace && selectedLead && (
          <div className="w-[480px] shrink-0 bg-white flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 shadow-2xl border-l border-slate-200">
            <div className="shrink-0 p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 shadow-lg relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-indigo-500/20">
                  {selectedLead.client_name?.[0]}
                </div>
                <div className="leading-tight">
                  <p className="text-lg font-black text-white tracking-tight leading-none mb-1">{selectedLead.client_name}</p>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.15em]">{selectedLead.company_name || 'Individual Client'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWorkspace(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto scroll-y p-6 space-y-8 bg-slate-50/40">
              {/* Profile Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Mobile Contact</p>
                  <p className="text-sm font-black text-slate-900">{selectedLead.mobile || 'Not provided'}</p>
                </div>
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Email Channel</p>
                  <p className="text-sm font-black text-slate-900 truncate">{selectedLead.email || 'Not provided'}</p>
                </div>
              </div>

              {/* Action Engine */}
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] border-l-4 border-indigo-600 pl-3">Lead Workflow</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { setCallStatus('contacted'); setShowCallModal(true); }}
                    className="flex flex-col items-center justify-center gap-2 p-5 bg-white text-indigo-700 border-2 border-indigo-50 shadow-sm rounded-2xl hover:bg-indigo-50 hover:border-indigo-100 transition-all active:scale-95 group"
                  >
                    <div className="p-3 bg-indigo-100 rounded-xl group-hover:scale-110 transition-transform"><Phone size={24} /></div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Log Outreach</span>
                  </button>
                  <button 
                    onClick={() => {
                      LeadService.convert(selectedLead.id).then(() => {
                        navigate('/bookings/new', { 
                          state: { 
                            prefill: {
                              client_name: selectedLead.client_name,
                              company_name: selectedLead.company_name,
                              email: selectedLead.email,
                              mobile: selectedLead.mobile,
                              bde_name: selectedLead.bde_name,
                              lead_source: selectedLead.source,
                              service: selectedLead.service,
                              lead_id: selectedLead.id,
                            } 
                          } 
                        });
                      });
                    }}
                    className="flex flex-col items-center justify-center gap-2 p-5 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 rounded-2xl hover:bg-emerald-700 transition-all active:scale-95 group"
                  >
                    <div className="p-3 bg-white/20 rounded-xl group-hover:scale-110 transition-transform"><ArrowUpRight size={24} /></div>
                    <span className="text-[11px] font-black uppercase tracking-widest">Convert Lead</span>
                  </button>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <p className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Interactions</p>
                  <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline px-2 py-1 bg-indigo-50 rounded">History</button>
                </div>
                <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200">
                  {!selectedLead.activities || selectedLead.activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-white/50 border border-dashed border-slate-300 rounded-2xl">
                       <p className="text-[11px] font-bold uppercase tracking-widest mb-1">Timeline Empty</p>
                       <p className="text-[10px]">Log your first interaction above</p>
                    </div>
                  ) : (
                    selectedLead.activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="relative pl-8">
                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center z-10 shadow-sm">
                           <Play size={10} className="text-indigo-600" fill="currentColor" />
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">{activity.activity_type}</p>
                            <p className="text-[9px] text-slate-400 font-black uppercase">{new Date(activity.created_at).toLocaleDateString()}</p>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">{activity.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="shrink-0 p-6 bg-white border-t border-slate-200 shadow-[0_-4px_20px_0_rgba(0,0,0,0.03)]">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Manager Intelligence / Notes</label>
               <textarea 
                  className="w-full p-4 text-sm border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-500 transition-all outline-none min-h-[100px] shadow-inner"
                  placeholder="Strategic notes about this client's requirements..."
                  defaultValue={selectedLead.notes || ''}
                  onBlur={(e) => LeadService.update(selectedLead.id, { notes: e.target.value })}
               />
            </div>
          </div>
        )}
      </div>

      {/* Outreach Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6">
          <div className="w-[450px] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><Phone size={20} /></div>
                <span className="text-sm font-black uppercase tracking-widest text-slate-900">Log Interaction Outcome</span>
              </div>
              <button onClick={() => setShowCallModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Interaction Narrative</label>
                <textarea 
                  autoFocus
                  className="input-field min-h-[120px] rounded-2xl p-4 text-sm" 
                  placeholder="Briefly describe the discussion flow, objections, and next steps..."
                  value={callNotes}
                  onChange={e => setCallNotes(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Update Pipeline</label>
                  <select 
                    className="input-field rounded-xl"
                    value={callStatus}
                    onChange={e => setCallStatus(e.target.value)}
                  >
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block">Engagement Quality</label>
                  <select className="input-field rounded-xl font-bold">
                    <option>High Interest</option>
                    <option>Discovery Call</option>
                    <option>No Contact</option>
                    <option>Busy/Reschedule</option>
                    <option>Qualified</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setShowCallModal(false)} className="btn-secondary flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-2xl">Dismiss</button>
              <button 
                onClick={handleLogCall}
                disabled={savingCall}
                className="btn-primary flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg !bg-emerald-600 border-none"
              >
                {savingCall ? 'Uploading...' : 'Confirm Outcome'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadListPage;
