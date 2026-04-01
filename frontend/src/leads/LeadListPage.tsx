import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  X,
  Phone,
  Download,
  ArrowUpRight,
  Play,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { LeadService } from './LeadService';
import type { Lead } from './LeadService';
import { useAuthStore } from '../auth/authStore';
import { downloadLeadInteractionHistoryPdf } from './leadHistoryPdf';
import { toastSuccess } from '../services/toastNotify';

import { isBdeUser } from '../auth/roleUtils';

const PAGE_SIZE = 10;

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'new': { label: 'New', color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
  'contacted': { label: 'Contacted', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
  'qualified': { label: 'Qualified', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  'proposal_sent': { label: 'Proposal Sent', color: 'text-indigo-700', bg: 'bg-indigo-100', border: 'border-indigo-200' },
  'negotiation': { label: 'Negotiation', color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-200' },
  'closed_won': { label: 'Closed Won', color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' },
  'closed_lost': { label: 'Closed Lost', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
};

const statusAdvanceOrder = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'closed_won'] as const;

const getNextPipelineStatus = (currentStatus?: string) => {
  if (!currentStatus) {
    return 'contacted';
  }

  if (currentStatus === 'closed_lost') {
    return 'closed_lost';
  }

  const currentIndex = statusAdvanceOrder.indexOf(currentStatus as (typeof statusAdvanceOrder)[number]);
  if (currentIndex === -1) {
    return currentStatus in statusConfig ? currentStatus : 'contacted';
  }

  return statusAdvanceOrder[Math.min(currentIndex + 1, statusAdvanceOrder.length - 1)];
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
  const isBde = isBdeUser(currentUser);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unassigned' | 'my' | 'overdue'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [loadingSelectedLead, setLoadingSelectedLead] = useState(false);
  const selectedLeadIdRef = useRef<string | null>(null);

  const [showCallModal, setShowCallModal] = useState(false);
  const [callNotes, setCallNotes] = useState('');
  const [callStatus, setCallStatus] = useState('contacted');
  const [savingCall, setSavingCall] = useState(false);
  const [exportingHistory, setExportingHistory] = useState(false);

  const syncLeadInList = (updatedLead: Lead) => {
    setLeads((currentLeads) =>
      currentLeads.map((lead) =>
        lead.id === updatedLead.id
          ? { ...lead, ...updatedLead }
          : lead
      )
    );
  };

  const loadLeadDetails = async (leadId: string, previewLead?: Lead) => {
    selectedLeadIdRef.current = leadId;
    if (previewLead) {
      setSelectedLead(previewLead);
    }
    setLoadingSelectedLead(true);

    try {
      const leadDetails = await LeadService.get(leadId);
      if (selectedLeadIdRef.current !== leadId) return;

      setSelectedLead(leadDetails);
      syncLeadInList(leadDetails);
    } catch (error) {
      console.error('Failed to fetch lead details:', error);
    } finally {
      if (selectedLeadIdRef.current === leadId) {
        setLoadingSelectedLead(false);
      }
    }
  };

  const openLeadWorkspace = (lead: Lead) => {
    setShowWorkspace(true);
    void loadLeadDetails(lead.id, lead);
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const leadsData = await LeadService.list();
      setLeads(leadsData.results || leadsData);
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

  // Reset to page 1 whenever filter changes
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLeads = filteredLeads.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleLogCall = async () => {
    if (!selectedLead) return;
    setSavingCall(true);
    const leadId = selectedLead.id;
    try {
      await LeadService.logActivity(leadId, {
        activity_type: 'call',
        description: `Call Logged: ${callNotes}`
      });
      await LeadService.updateStatus(leadId, {
        status: callStatus
      });
      setShowCallModal(false);
      setCallNotes('');
      toastSuccess('Interaction logged successfully.');
      await loadLeadDetails(leadId);
    } catch (error) {
      console.error('Call log fail:', error);
    } finally {
      setSavingCall(false);
    }
  };

  const handleNotesBlur = async (notes: string) => {
    if (!selectedLead) return;
    if (notes === (selectedLead.notes || '')) return;

    try {
      const updatedLead = await LeadService.update(selectedLead.id, { notes });
      setSelectedLead(updatedLead);
      syncLeadInList(updatedLead);
      toastSuccess('Lead notes updated.');
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleDownloadFullHistory = async () => {
    if (!selectedLead) return;

    const leadId = selectedLead.id;
    setExportingHistory(true);

    try {
      const latestLead = await LeadService.get(leadId);
      if (selectedLeadIdRef.current !== leadId) return;

      setSelectedLead(latestLead);
      syncLeadInList(latestLead);
      downloadLeadInteractionHistoryPdf(latestLead);
      toastSuccess('Interaction history download started.');
    } catch (error) {
      console.error('Failed to download interaction history:', error);
    } finally {
      setExportingHistory(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col h-full min-h-0 space-y-3 overflow-x-hidden">
      <div className="shrink-0 min-w-0 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="table-scroll flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {(['all', 'unassigned', 'my', 'overdue'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === tab
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {tab === 'my' ? 'Assigned' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-56 shrink-0">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads..."
                className="input-field pl-8 py-1.5 text-sm"
                value={searchTerm}
                onChange={e => handleSearchChange(e.target.value)}
              />
            </div>
            <button
              onClick={() => navigate('/leads/new')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus size={14} />
              New Lead
            </button>
          </div>
        </div>
      </div>

      {/* Table Area — flex-1 fills remaining height, only this container scrolls */}
      <div className="flex min-w-0 flex-1 min-h-0 w-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="table-scroll min-w-0 flex-1 min-h-0 overflow-auto">
          <table className="w-full min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-xs font-semibold text-slate-600">
                <th className="px-3 py-2 text-center whitespace-nowrap">Score</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Lead</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Service</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Priority</th>
                <th className="px-3 py-2 text-left whitespace-nowrap">Follow-up</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Loading...</td></tr>
              ) : paginatedLeads.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">No leads found.</td></tr>
              ) : paginatedLeads.map(lead => (
                <tr
                  key={lead.id}
                  onClick={() => openLeadWorkspace(lead)}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selectedLead?.id === lead.id ? 'bg-indigo-50' : ''}`}
                >
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${lead.lead_score > 70 ? 'bg-emerald-100 text-emerald-700' :
                      lead.lead_score > 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                      {lead.lead_score}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-medium text-slate-800">{lead.client_name}</div>
                    <div className="text-xs text-slate-500">{lead.company_name || 'Individual'}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-slate-700">{lead.service_name || 'Generic'}</div>
                    <div className="text-xs text-slate-500">{lead.source_name}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`badge ${statusConfig[lead.status]?.bg} ${statusConfig[lead.status]?.color}`}>
                      {statusConfig[lead.status]?.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-xs font-medium ${priorityConfig[lead.priority]?.color}`}>
                      {priorityConfig[lead.priority]?.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`text-xs ${lead.next_follow_up_date && lead.next_follow_up_date < new Date().toISOString().split('T')[0] ? 'text-rose-600 font-medium' : 'text-slate-500'
                      }`}>
                      {lead.next_follow_up_date || 'TBD'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredLeads.length > PAGE_SIZE && (
          <div className="shrink-0 flex min-w-0 flex-col gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-slate-500">
              {`${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredLeads.length)} of ${filteredLeads.length}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-xs text-slate-500 px-1">{safePage} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Workspace Panel — fixed overlay on mobile, side panel on lg+ */}
      {showWorkspace && selectedLead && (
        <>
          {/* Mobile overlay backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setShowWorkspace(false)}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[480px] bg-white flex flex-col shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <div className="shrink-0 p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 shadow-lg relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10 min-w-0">
                <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-500/20">
                  {selectedLead.client_name?.[0]}
                </div>
                <div className="leading-tight min-w-0">
                  <p className="text-sm font-semibold text-white tracking-tight leading-none mb-1 truncate">
                    {selectedLead.client_name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{selectedLead.mobile || 'No Mobile'} · {selectedLead.email || 'No Email'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{selectedLead.company_name || 'Individual Client'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowWorkspace(false)}
                className="shrink-0 p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white ml-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5 space-y-6 bg-slate-50/40">
              {/* Action Engine */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900 border-l-4 border-indigo-600 pl-3">Lead Workflow</p>
                <div className="flex gap-2 flex-wrap">
                  {!isBde && (
                    <button
                      onClick={() => {
                        setCallNotes('');
                        setCallStatus(getNextPipelineStatus(selectedLead.status));
                        setShowCallModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs bg-white text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-all"
                    >
                      <div className="p-2 bg-indigo-100 rounded-xl"><Phone size={14} /></div>
                      <span className="font-semibold">Log Outreach</span>
                    </button>
                  )}
                  {!isBde && (
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
                                services: selectedLead.service ? [selectedLead.service] : [],
                                lead_id: selectedLead.id,
                              }
                            }
                          });
                        });
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs bg-white text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-all"
                    >
                      <div className="p-2 bg-emerald-100 rounded-xl"><ArrowUpRight size={14} /></div>
                      <span className="font-semibold">Convert Lead</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <p className="text-sm font-semibold text-slate-900">Interactions</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleDownloadFullHistory()}
                      disabled={loadingSelectedLead || exportingHistory}
                      className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Download size={12} />
                      {exportingHistory ? 'Preparing PDF...' : 'Download Full History'}
                    </button>
                  </div>
                </div>
                <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-slate-200">
                  {loadingSelectedLead ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-white/50 border border-dashed border-slate-300 rounded-2xl">
                      <p className="text-sm font-medium mb-1">Loading Timeline</p>
                      <p className="text-xs">Fetching recent outreach history...</p>
                    </div>
                  ) : !selectedLead.activities || selectedLead.activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-white/50 border border-dashed border-slate-300 rounded-2xl">
                      <p className="text-sm font-medium mb-1">Timeline Empty</p>
                      <p className="text-xs">Log your first interaction above</p>
                    </div>
                  ) : (
                    selectedLead.activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="relative pl-8">
                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center z-10 shadow-sm">
                          <Play size={10} className="text-indigo-600" fill="currentColor" />
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-slate-900">{activity.activity_type}</p>
                            <p className="text-xs text-slate-500 font-medium">{new Date(activity.created_at).toLocaleDateString()}</p>
                          </div>
                          <p className="text-sm text-slate-600">{activity.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {!isBde && (
              <div className="shrink-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_0_rgba(0,0,0,0.03)]">
                <label className="text-xs font-medium text-slate-500 mb-2 block">Manager Intelligence / Notes</label>
                <textarea
                  key={selectedLead.id}
                  className="w-full p-3 text-sm border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white focus:border-indigo-500 transition-all outline-none min-h-[80px] shadow-inner"
                  placeholder="Strategic notes about this client's requirements..."
                  defaultValue={selectedLead.notes || ''}
                  onBlur={(e) => void handleNotesBlur(e.target.value)}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Outreach Modal — responsive */}
      {showCallModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 fade-in duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><Phone size={18} /></div>
                <span className="text-sm font-semibold text-slate-900">Log Interaction Outcome</span>
              </div>
              <button onClick={() => setShowCallModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={22} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 block">Interaction Narrative</label>
                <textarea
                  autoFocus
                  className="input-field min-h-[100px] rounded-2xl p-3 text-sm"
                  placeholder="Briefly describe the discussion flow, objections, and next steps..."
                  value={callNotes}
                  onChange={e => setCallNotes(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 block">Update Pipeline</label>
                  <select
                    className="input-field rounded-xl text-sm"
                    value={callStatus}
                    onChange={e => setCallStatus(e.target.value)}
                  >
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 block">Engagement Quality</label>
                  <select className="input-field rounded-xl text-sm">
                    <option>High Interest</option>
                    <option>Discovery Call</option>
                    <option>No Contact</option>
                    <option>Busy/Reschedule</option>
                    <option>Qualified</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowCallModal(false)} className="btn-secondary flex-1 py-3 text-sm font-semibold rounded-2xl">Dismiss</button>
              <button
                onClick={handleLogCall}
                disabled={savingCall}
                className="btn-primary flex-1 py-3 text-sm font-semibold rounded-2xl shadow-lg !bg-emerald-600 border-none"
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
