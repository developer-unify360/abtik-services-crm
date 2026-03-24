import React, { useEffect, useState } from 'react';
import AttributeService, { type Attribute } from '../attributes/AttributeService';
import { ServiceApi, type Service } from '../services/api/ServiceApi';
import { 
  UserPlus, 
  CheckCircle, 
  User, 
  Building2, 
  Phone, 
  Mail, 
  Send,
  Search,
  Briefcase,
  BarChart3,
  Flag,
  Calendar
} from 'lucide-react';

import apiClient from '../api/apiClient';
import { UserService, type User as SystemUser } from '../users/UserService';

interface LeadFormState {
  bde_name: string;
  client_name: string;
  company_name: string;
  email: string;
  mobile: string;
  industry: string;
  assigned_to: string;
  source: string;
  service: string;
  notes: string;
  status: string;
  priority: string;
  lead_score: string;
  next_follow_up_date: string;
}

const emptyFormState = (): LeadFormState => ({
  bde_name: '',
  client_name: '',
  company_name: '',
  email: '',
  mobile: '',
  industry: '',
  assigned_to: '',
  source: '',
  service: '',
  notes: '',
  status: 'new',
  priority: 'medium',
  lead_score: '0',
  next_follow_up_date: '',
});

const Field = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <label className="block">
    <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
      {label} {required ? <span className="text-red-500">*</span> : null}
    </div>
    {children}
  </label>
);

const PublicLeadFormPage: React.FC = () => {
  const [formState, setFormState] = useState<LeadFormState>(emptyFormState);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [industries, setIndustries] = useState<Attribute[]>([]);
  const [leadSources, setLeadSources] = useState<Attribute[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, industriesData, sourcesData, servicesData] = await Promise.all([
          UserService.publicList(),
          AttributeService.listIndustries(),
          AttributeService.listLeadSources(),
          ServiceApi.list()
        ]);
        // Filter only active attributes
        setUsers((usersData.results || usersData).filter((u: any) => u.is_active !== false));
        setIndustries(industriesData.filter((ind: Attribute) => ind.is_active));
        setLeadSources(sourcesData.filter((src: Attribute) => src.is_active));
        setServices(servicesData);
      } catch (err) {
        console.error('Failed to load form data:', err);
      }
    };
    fetchData();
  }, []);

  const handleFieldChange = (field: keyof LeadFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === formState.assigned_to);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await apiClient.post('/leads/public/', formState);
      setSuccess(true);
    } catch (err: any) {
      console.error('Lead submission failed:', err);
      setError(err.response?.data?.detail || 'Failed to submit lead. Please check all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-[32px] shadow-xl border border-slate-200 p-10 max-w-md w-full text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Lead Submitted!</h2>
            <p className="text-slate-500">
              The lead has been recorded successfully. Our team will follow up on this shortly.
            </p>
          </div>
          <button
            onClick={() => { setSuccess(false); setFormState(emptyFormState()); }}
            className="w-full rounded-2xl bg-blue-700 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all hover:-translate-y-0.5"
          >
            Submit Another Lead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 p-4 overflow-hidden">
      <div className="mx-auto max-w-4xl h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-blue-600 text-white shadow-lg shadow-blue-200">
            <UserPlus size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Lead Generation Form</h1>
            <p className="text-xs text-slate-500">
              Fill in the potential client's details
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1">
          {/* Combined compact form layout */}
          <div className="grid gap-3 md:grid-cols-3">
            {/* Agent & Source */}
            <Field label="BDE Name" required>
              <div className="relative">
                <User className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  required
                  className="input-field pl-8 py-1.5 text-sm"
                  placeholder="Your name"
                  value={formState.bde_name}
                  onChange={(e) => handleFieldChange('bde_name', e.target.value)}
                />
              </div>
            </Field>
            <Field label="Lead Source" required>
              <select
                required
                className="input-field py-1.5 text-sm"
                value={formState.source}
                onChange={(e) => handleFieldChange('source', e.target.value)}
              >
                <option value="">Select</option>
                {leadSources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Assign To">
              <div className="relative">
                <div 
                  className="input-field flex items-center justify-between cursor-pointer py-1.5 text-sm"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                >
                  <span className={selectedUser ? 'text-slate-900' : 'text-slate-400'}>
                    {selectedUser ? selectedUser.name : 'Select user'}
                  </span>
                  <Search size={14} className="text-slate-400" />
                </div>

                {showUserDropdown && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg animate-in fade-in zoom-in duration-200">
                    <div className="p-2 border-b border-slate-100">
                      <input
                        autoFocus
                        className="w-full rounded-lg bg-slate-50 border-none px-3 py-1.5 text-xs focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Search..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-[100px] overflow-y-auto p-1">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <div
                            key={user.id}
                            className={`flex flex-col px-3 py-2 rounded-lg cursor-pointer transition-colors ${formState.assigned_to === user.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                            onClick={() => {
                              handleFieldChange('assigned_to', user.id);
                              setShowUserDropdown(false);
                              setUserSearchTerm('');
                            }}
                          >
                            <span className="font-bold text-xs">{user.name}</span>
                            <span className="text-[10px] opacity-70">{user.email}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-slate-400 text-xs">
                          No users found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Field>

            {/* Client Details */}
            <Field label="Client Name" required>
              <div className="relative">
                <User size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  className="input-field pl-8 py-1.5 text-sm"
                  placeholder="Client name"
                  value={formState.client_name}
                  onChange={(e) => handleFieldChange('client_name', e.target.value)}
                />
              </div>
            </Field>
            <Field label="Company Name" required>
              <div className="relative">
                <Building2 size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  className="input-field pl-8 py-1.5 text-sm"
                  placeholder="Company"
                  value={formState.company_name}
                  onChange={(e) => handleFieldChange('company_name', e.target.value)}
                />
              </div>
            </Field>
            <Field label="Industry" required>
              <select
                required
                className="input-field py-1.5 text-sm"
                value={formState.industry}
                onChange={(e) => handleFieldChange('industry', e.target.value)}
              >
                <option value="">Select</option>
                {industries.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Mobile" required>
              <div className="relative">
                <Phone size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  className="input-field pl-8 py-1.5 text-sm"
                  placeholder="Mobile"
                  value={formState.mobile}
                  onChange={(e) => handleFieldChange('mobile', e.target.value)}
                />
              </div>
            </Field>
            <Field label="Email" required>
              <div className="relative">
                <Mail size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="email"
                  className="input-field pl-8 py-1.5 text-sm"
                  placeholder="Email"
                  value={formState.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
              </div>
            </Field>
            <Field label="Service Required">
              <div className="relative">
                <Briefcase size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  className="input-field pl-8 py-1.5 text-sm"
                  value={formState.service}
                  onChange={(e) => handleFieldChange('service', e.target.value)}
                >
                  <option value="">Select Service</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </Field>

            {/* Additional Fields - Status, Priority, Score, Follow-up */}
            <Field label="Status">
              <div className="relative">
                <BarChart3 size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  className="input-field pl-8 py-1.5 text-sm"
                  value={formState.status}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              </div>
            </Field>
            <Field label="Priority">
              <div className="relative">
                <Flag size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  className="input-field pl-8 py-1.5 text-sm"
                  value={formState.priority}
                  onChange={(e) => handleFieldChange('priority', e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </Field>
            <Field label="Lead Score">
              <input
                type="number"
                className="input-field py-1.5 text-sm"
                placeholder="0"
                value={formState.lead_score}
                onChange={(e) => handleFieldChange('lead_score', e.target.value)}
              />
            </Field>
            <Field label="Follow-up Date">
              <div className="relative">
                <Calendar size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  className="input-field pl-8 py-1.5 text-sm"
                  value={formState.next_follow_up_date}
                  onChange={(e) => handleFieldChange('next_follow_up_date', e.target.value)}
                />
              </div>
            </Field>

            {/* Notes - spans full width */}
            <div className="md:col-span-4">
              <Field label="Notes">
                <textarea
                  className="input-field min-h-[50px] py-1.5 text-sm pt-2"
                  placeholder="Additional notes..."
                  value={formState.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Lead</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicLeadFormPage;
