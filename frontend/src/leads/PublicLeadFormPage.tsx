import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Mail,
  Phone,
  Search,
  UserPlus,
  CheckCircle,
  Briefcase,
  BarChart3,
  Flag,
  Calendar,
  ArrowLeft
} from 'lucide-react';

import apiClient from '../api/apiClient';
import { useAuthStore } from '../auth/authStore';
import { useNavigate } from 'react-router-dom';
import { UserService, type User as SystemUser } from '../users/UserService';

interface LeadFormState {
  client_name: string;
  company_name: string;
  email: string;
  mobile: string;
  bde_name: string;
  source: string;
  status: string;
  priority: string;
  lead_score: number;
  assigned_to: string;
  service: string;
  notes: string;
  industry: string;
  next_follow_up_date: string;
}

interface Attribute {
  id: string;
  name: string;
  is_active: boolean;
}

interface Service {
  id: string;
  name: string;
}

const emptyFormState = (): LeadFormState => ({
  client_name: '',
  company_name: '',
  email: '',
  mobile: '',
  bde_name: '',
  source: '',
  status: 'new',
  priority: 'medium',
  lead_score: 0,
  assigned_to: '',
  service: '',
  notes: '',
  industry: '',
  next_follow_up_date: '',
});

const Field = ({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | string[];
  children: React.ReactNode;
}) => {
  const errorText = Array.isArray(error) ? error[0] : error;
  return (
    <label className="block">
      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </div>
      {children}
      {errorText && (
        <div className="mt-1 text-[10px] font-medium text-red-600 animate-in fade-in slide-in-from-top-1">
          {errorText}
        </div>
      )}
    </label>
  );
};

const PublicLeadFormPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [formState, setFormState] = useState<LeadFormState>(() => ({
    ...emptyFormState(),
    bde_name: user?.name || '',
  }));
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [industries, setIndustries] = useState<Attribute[]>([]);
  const [leadSources, setLeadSources] = useState<Attribute[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);
  const dropdownTriggerRef = React.useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const openDropdown = () => {
    if (dropdownTriggerRef.current) {
      const rect = dropdownTriggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 180;
      const top = spaceBelow >= dropdownHeight ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight;
      setDropdownPos({ top, left: rect.left + window.scrollX, width: rect.width });
    }
    setShowUserDropdown(v => !v);
  };


  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, industriesData, sourcesData, servicesData] = await Promise.all([
          UserService.salesManagersList(),
          apiClient.get('/attributes/industries/').then(res => res.data),
          apiClient.get('/attributes/lead-sources/').then(res => res.data),
          apiClient.get('/services/').then(res => res.data)
        ]);

        const salesManagers = usersData.results || usersData || [];
        setUsers(Array.isArray(salesManagers) ? salesManagers : []);

        const industries = industriesData.results || industriesData || [];
        setIndustries(Array.isArray(industries) ? industries.filter((ind: Attribute) => ind.is_active) : []);

        const sources = sourcesData.results || sourcesData || [];
        setLeadSources(Array.isArray(sources) ? sources.filter((src: Attribute) => src.is_active) : []);

        const servicesRaw = servicesData.data || servicesData.results || servicesData || [];
        setServices(Array.isArray(servicesRaw) ? servicesRaw : []);
      } catch (err) {
        console.error('Failed to load form data:', err);
      }
    };

    fetchData();
  }, []);

  const handleFieldChange = (field: keyof LeadFormState, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: field === 'lead_score' ? parseInt(value) || 0 : value
    }));
  };

  const filteredUsers = (users || []).filter(user =>
    (user?.name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (user?.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const selectedUser = (users || []).find(u => {
    if (!u.id || !formState.assigned_to) return false;
    return String(u.id) === String(formState.assigned_to);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});

    const payload = {
      ...formState,
      next_follow_up_date: formState.next_follow_up_date || null,
    };

    try {
      await apiClient.post('/leads/', payload);
      setSuccess(true);
    } catch (err: any) {
      console.error('Lead submission failed:', err);
      const resData = err.response?.data;
      if (resData && typeof resData === 'object' && !resData.detail) {
        setFieldErrors(resData);
        setError('Please correct the highlighted errors.');
      } else {
        setError(resData?.detail || 'Failed to submit lead. Please check all fields.');
      }
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
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">Lead Submitted!</h2>
            <p className="text-slate-500">
              The lead has been recorded successfully. Our team will follow up on this shortly.
            </p>
          </div>
          <button
            onClick={() => {
              setSuccess(false);
              setFormState({
                ...emptyFormState(),
                bde_name: user?.name || '',
              });
            }}
            className="w-full rounded-2xl bg-blue-700 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-800 transition-all hover:-translate-y-0.5"
          >
            Submit Another Lead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-8 px-2 sm:px-4 lg:px-8 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="mx-auto max-w-4xl flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2">
          <button
            onClick={() => navigate('/leads')}
            className="group flex h-10 w-10 items-center justify-center rounded-[16px] bg-white text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
            title="Back to Leads"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-blue-600 text-white shadow-lg shadow-blue-200 shrink-0">
            <UserPlus size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Lead Generation</h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Fill in the potential client's details
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-2">
          {/* Combined compact form layout */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {/* Required Fields Section */}
            <Field label="BDE Name" required error={fieldErrors.bde_name}>
              <div className="relative">
                <User size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  disabled
                  className="input-field pl-8 py-1.5 text-sm bg-slate-50 cursor-not-allowed border-dashed"
                  value={formState.bde_name}
                />
              </div>
            </Field>

            <Field label="Lead Source" required error={fieldErrors.source}>
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

            <Field label="Assign To" required error={fieldErrors.assigned_to}>
              <div className="relative">
                <div
                  ref={dropdownTriggerRef}
                  className="input-field flex items-center justify-between cursor-pointer py-1.5 text-sm min-h-[38px]"
                  onClick={openDropdown}
                >
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-400" />
                    <span className={selectedUser ? 'text-slate-900' : 'text-slate-400'}>
                      {selectedUser ? (selectedUser.name || selectedUser.email) : 'Select user'}
                    </span>
                  </div>
                  <Search size={14} className="text-slate-400" />
                </div>

                {showUserDropdown && dropdownPos && (
                  <div
                    className="fixed z-[9999] rounded-lg border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in duration-200"
                    style={{ top: dropdownPos.top, left: dropdownPos.left, width: Math.min(dropdownPos.width, window.innerWidth - 16) }}
                  >
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
                    <div className="max-h-[140px] overflow-y-auto p-1">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <div
                            key={user.id}
                            className={`flex flex-col px-3 py-2 rounded-lg cursor-pointer transition-colors ${String(formState.assigned_to) === String(user.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                            onClick={() => {
                              handleFieldChange('assigned_to', String(user.id));
                              setShowUserDropdown(false);
                              setDropdownPos(null);
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

            <Field label="Client Mobile" required error={fieldErrors.mobile}>
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

            {/* Non-Required Fields Section */}
            <Field label="Client Name" error={fieldErrors.client_name}>
              <div className="relative">
                <User size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input-field pl-8 py-1.5 text-sm"
                  placeholder="Client name"
                  value={formState.client_name}
                  onChange={(e) => handleFieldChange('client_name', e.target.value)}
                />
              </div>
            </Field>

            <Field label="Company Name" error={fieldErrors.company_name}>
              <div className="relative">
                <Building2 size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input-field pl-8 py-1.5 text-sm"
                  placeholder="Company"
                  value={formState.company_name}
                  onChange={(e) => handleFieldChange('company_name', e.target.value)}
                />
              </div>
            </Field>

            <Field label="Industry" error={fieldErrors.industry}>
              <select
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

            <Field label="Email" error={fieldErrors.email}>
              <div className="relative">
                <Mail size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="input-field pl-8 py-1.5 text-sm"
                  placeholder="Email"
                  value={formState.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
              </div>
            </Field>

            <Field label="Service Required" error={fieldErrors.service}>
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

            <Field label="Status" error={fieldErrors.status}>
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

            <Field label="Priority" error={fieldErrors.priority}>
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

            <Field label="Lead Score" error={fieldErrors.lead_score}>
              <input
                type="number"
                min="0"
                max="10"
                className="input-field py-1.5 text-sm"
                placeholder="0"
                value={formState.lead_score}
                onChange={(e) => handleFieldChange('lead_score', e.target.value)}
              />
            </Field>

            <Field label="Follow-up Date" error={fieldErrors.next_follow_up_date}>
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
            <div className="col-span-full">
              <Field label="Notes" error={fieldErrors.notes}>
                <textarea
                  className="input-field min-h-[50px] py-1.5 text-sm pt-2"
                  placeholder="Additional notes..."
                  value={formState.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
            {error && (
              <div className="mr-auto text-sm text-red-600 font-medium flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/leads')}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Create Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicLeadFormPage;
