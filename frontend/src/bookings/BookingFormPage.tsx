import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CalendarDays, CheckCircle, FileText, IndianRupee, Save, Upload, UserRound, Wrench, ChevronDown, ChevronUp } from 'lucide-react';

import { useAuthStore } from '../auth/authStore';
import { BookingService } from './BookingService';
import { ClientService } from '../clients/ClientService';
import { LeadService, type Lead } from '../leads/LeadService';
import { ServiceApi, ServiceRequestApi, type Service, type ServiceRequest } from '../services/api/ServiceApi';
import { BankApi, type Bank } from './api/BankApi';
import MultiSelect from '../components/MultiSelect';

import AttributeService, { type Attribute } from '../attributes/AttributeService';
import { toastSuccess } from '../services/toastNotify';

interface BookingFormState {
  client_name: string;
  company_name: string;
  gst_pan: string;
  email: string;
  mobile: string;
  industry: string;
  bde_name: string;
  lead_source: string;
  payment_type: string;
  bank: string;
  booking_date: string;
  payment_date: string;
  service_ids: string[];
  total_payment_amount: string;
  total_payment_remarks: string;
  received_amount: string;
  received_amount_remarks: string;
  remaining_amount: string;
  remaining_amount_remarks: string;
  after_fund_disbursement_percentage: string;
  after_fund_disbursement_remarks: string;
  remarks: string;
  attachment: File | null;
  existingAttachmentUrl: string;
  remove_attachment: boolean;
  lead_id?: string;
}

const emptyFormState = (): BookingFormState => ({
  client_name: '',
  company_name: '',
  gst_pan: '',
  email: '',
  mobile: '',
  industry: '',
  bde_name: '',
  lead_source: '',
  payment_type: '',
  bank: '',
  booking_date: new Date().toISOString().split('T')[0],
  payment_date: '',
  service_ids: [],
  total_payment_amount: '',
  total_payment_remarks: '',
  received_amount: '',
  received_amount_remarks: '',
  remaining_amount: '',
  remaining_amount_remarks: '',
  after_fund_disbursement_percentage: '',
  after_fund_disbursement_remarks: '',
  remarks: '',
  attachment: null,
  existingAttachmentUrl: '',
  remove_attachment: false,
});

const toInputValue = (value?: string | number | null) => (value === null || value === undefined ? '' : String(value));

const normalizeSelectedServiceIds = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
          .filter(Boolean),
      ),
    );
  }

  if (value === null || value === undefined) {
    return [];
  }

  const normalized = String(value).trim();
  return normalized ? [normalized] : [];
};

const calculateRemainingAmount = (totalAmount: string, receivedAmount: string) => {
  if (!totalAmount || !receivedAmount) {
    return '';
  }

  const total = Number(totalAmount);
  const received = Number(receivedAmount);
  if (Number.isNaN(total) || Number.isNaN(received)) {
    return '';
  }

  return (total - received).toFixed(2);
};

const SectionCard = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2 py-1">
      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-700">
        {icon}
      </div>
      <h2 className="text-xs font-bold text-slate-900">{title}</h2>
    </div>
    <div className="p-2">{children}</div>
  </section>
);

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

const BookingFormPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams<{ bookingId: string }>();
  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const isEditMode = Boolean(bookingId);
  const [formState, setFormState] = useState<BookingFormState>(emptyFormState);
  const [services, setServices] = useState<Service[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [industries, setIndustries] = useState<Attribute[]>([]);
  const [leadSources, setLeadSources] = useState<Attribute[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<Attribute[]>([]);
  const [existingServiceRequest, setExistingServiceRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showPaymentRemarks, setShowPaymentRemarks] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setPageError('');

        const [serviceData, bankData, industryData, sourceData, paymentData] = await Promise.all([
          ServiceApi.list(),
          BankApi.list(),
          AttributeService.listIndustries(),
          AttributeService.listLeadSources(),
          AttributeService.listPaymentTypes(),
        ]);
        setServices(serviceData);
        // Filter only active attributes
        setBanks(bankData.filter((b: Bank) => b.is_active));
        setIndustries(industryData.filter((ind: Attribute) => ind.is_active));
        setLeadSources(sourceData.filter((src: Attribute) => src.is_active));
        setPaymentTypes(paymentData.filter((pt: Attribute) => pt.is_active));

        if (!isEditMode || !bookingId) {
          const prefill = location.state?.prefill ?? {};
          const initialBdeName = prefill?.bde_name || authUser?.name || '';
          const {
            service: prefillService,
            services: prefillServices,
            ...prefillFields
          } = prefill;
          setFormState((prev) => ({ 
            ...prev, 
            ...prefillFields,
            bde_name: initialBdeName,
            service_ids: normalizeSelectedServiceIds(prefillServices ?? prefillService),
          }));
          setLoading(false);
          return;
        }

        const booking = await BookingService.get(bookingId);
        const [client, serviceRequests] = await Promise.all([
          ClientService.get(booking.client),
          ServiceRequestApi.list({ booking_id: bookingId }),
        ]);

        const normalizedServiceRequests = Array.isArray(serviceRequests) ? serviceRequests : [];
        const currentServiceRequest = normalizedServiceRequests.length > 0
          ? normalizedServiceRequests[0]
          : null;
        setExistingServiceRequest(currentServiceRequest);

        setFormState({
          client_name: client.client_name || '',
          company_name: client.company_name || '',
          gst_pan: client.gst_pan || '',
          email: client.email || '',
          mobile: client.mobile || '',
          industry: client.industry || '',
          bde_name: booking.bde_name || authUser?.name || '',
          lead_source: booking.lead_source || '',
          payment_type: booking.payment_type || '',
          bank: booking.bank || '',
          booking_date: booking.booking_date || '',
          payment_date: booking.payment_date || '',
          service_ids: normalizeSelectedServiceIds(
            normalizedServiceRequests.map((serviceRequest) => serviceRequest.service),
          ),
          total_payment_amount: toInputValue(booking.total_payment_amount),
          total_payment_remarks: booking.total_payment_remarks || '',
          received_amount: toInputValue(booking.received_amount),
          received_amount_remarks: booking.received_amount_remarks || '',
          remaining_amount: toInputValue(booking.remaining_amount),
          remaining_amount_remarks: booking.remaining_amount_remarks || '',
          after_fund_disbursement_percentage: toInputValue(booking.after_fund_disbursement_percentage),
          after_fund_disbursement_remarks: booking.after_fund_disbursement_remarks || '',
          remarks: booking.remarks || '',
          attachment: null,
          existingAttachmentUrl: booking.attachment || '',
          remove_attachment: false,
        });
      } catch (error) {
        console.error('Failed to load booking form:', error);
        setPageError('Unable to load the booking form right now.');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [authUser?.name, bookingId, isEditMode]);

  // Load leads for dropdown
  const loadLeads = async (search: string = '') => {
    try {
      setLoadingLeads(true);
      const data = await LeadService.listForDropdown(search);
      // Handle both paginated and non-paginated responses
      const leadsArray = Array.isArray(data) ? data : (data?.results || []);
      setLeads(Array.isArray(leadsArray) ? leadsArray : []);
    } catch (error) {
      console.error('Failed to load leads:', error);
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Handle lead selection
  const handleLeadSelect = (lead: Lead) => {
    // Get lead info from either client_info or direct fields
    const clientInfo = lead.client_info;
    const leadData = {
      lead_id: lead.id,
      client_name: clientInfo?.client_name || lead.client_name || '',
      company_name: clientInfo?.company_name || lead.company_name || '',
      email: clientInfo?.email || lead.email || '',
      mobile: clientInfo?.mobile || lead.mobile || '',
      industry: clientInfo?.industry || lead.industry || '',
    };

    setFormState((prev) => ({
      ...prev,
      ...leadData,
    }));
    setShowLeadDropdown(false);
    setLeadSearch('');
  };

  // Handle lead search input change
  const handleLeadSearchChange = (value: string) => {
    setLeadSearch(value);
    setShowLeadDropdown(true);
    loadLeads(value);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.lead-dropdown-container')) {
        setShowLeadDropdown(false);
      }
    };

    if (showLeadDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLeadDropdown]);

  // Filter leads for dropdown display
  const filteredLeads = leads;

  const handleFieldChange = (field: keyof BookingFormState, value: string | string[] | boolean | File | null) => {
    setFormState((previous) => {
      const nextState = { ...previous, [field]: value } as BookingFormState;

      if (field === 'total_payment_amount' || field === 'received_amount') {
        nextState.remaining_amount = calculateRemainingAmount(
          field === 'total_payment_amount' ? String(value) : previous.total_payment_amount,
          field === 'received_amount' ? String(value) : previous.received_amount,
        );
      }

      if (field === 'attachment' && value) {
        nextState.remove_attachment = false;
      }

      return nextState;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      if (formState.service_ids.length === 0) {
        setPageError('Select at least one service before submitting the booking.');
        return;
      }

      setSubmitting(true);
      setPageError('');

      const payload = {
        client: {
          client_name: formState.client_name,
          company_name: formState.company_name,
          gst_pan: formState.gst_pan,
          email: formState.email,
          mobile: formState.mobile,
          industry: formState.industry,
        },
        booking: {
          bde_name: formState.bde_name,
          lead_source: formState.lead_source || null,
          payment_type: formState.payment_type || null,
          bank: formState.bank || null,
          booking_date: formState.booking_date,
          payment_date: formState.payment_date || null,
          total_payment_amount: formState.total_payment_amount || null,
          total_payment_remarks: formState.total_payment_remarks,
          received_amount: formState.received_amount || null,
          received_amount_remarks: formState.received_amount_remarks,
          remaining_amount: formState.remaining_amount || null,
          remaining_amount_remarks: formState.remaining_amount_remarks,
          after_fund_disbursement_percentage: formState.after_fund_disbursement_percentage || null,
          after_fund_disbursement_remarks: formState.after_fund_disbursement_remarks,
          remarks: formState.remarks,
          remove_attachment: formState.remove_attachment,
          lead_id: formState.lead_id || null,
        },
        service_request: formState.service_ids.length > 0
          ? {
              services: formState.service_ids,
              priority: existingServiceRequest?.priority || 'medium',
            }
          : {},
        attachment: formState.attachment,
      };

      if (isEditMode && bookingId) {
        await BookingService.updateFull(bookingId, payload);
        toastSuccess('Booking updated successfully.');
        navigate('/bookings');
      } else {
        if (isAuthenticated) {
          await BookingService.createFull(payload);
          toastSuccess('Booking created successfully.');
          navigate('/bookings');
        } else {
          await BookingService.createPublicFull(payload);
          setSubmitSuccess(true);
          toastSuccess('Booking submitted successfully.');
        }
      }
    } catch (error: any) {
      console.error('Booking form submission failed:', error);
      // Interceptor will show the toast automatically for Bad Requests
    } finally {
      setSubmitting(false);
    }
  };

  const attachmentName = formState.attachment?.name
    || (formState.existingAttachmentUrl ? decodeURIComponent(formState.existingAttachmentUrl.split('/').pop() || 'Current attachment') : '');
  const serviceOptions = services.map((service) => ({
    value: service.id,
    label: service.name,
  }));

  // Public submission success screen
  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center space-y-5">
          <CheckCircle size={56} className="mx-auto text-green-500" />
          <h2 className="text-2xl font-bold text-slate-800">Booking Submitted!</h2>
          <p className="text-slate-500 text-sm">
            Your booking has been received successfully. Our team will get in touch with you shortly.
          </p>
          <button
            onClick={() => { setSubmitSuccess(false); setFormState(emptyFormState()); }}
            className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors"
          >
            Submit Another Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col space-y-3">
      {isAuthenticated ? (
        <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{isEditMode ? 'Update booking, client, service, and payment details.' : 'Create a booking and capture the handoff details in one place.'}</span>
              {existingServiceRequest ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  Service request linked
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                form="booking-form"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={14} />
                {submitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/bookings')}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">

        <div className="flex-1 overflow-y-auto p-3">
          {pageError ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-600">
              Loading booking form...
            </div>
          ) : (
            <>
              <form id="booking-form" className="space-y-1" onSubmit={handleSubmit}>
                {/* Main layout: Left column (Booking + Service + Additional) and Right column (Client + Payment) */}
                <div className="flex flex-col lg:flex-row gap-2">
                {/* Left column: Booking Details + Service Details + Additional Info */}
                <div className="flex-1 flex flex-col gap-2">
                  <SectionCard title="Booking Details" icon={<CalendarDays size={14} />}>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Field label="BDE Name">
                        <input
                          className="input-field py-1.5 text-sm"
                          value={formState.bde_name}
                          onChange={(event) => {
                            handleFieldChange('bde_name', event.target.value);
                          }}
                        />
                      </Field>
                      <Field label="Payment Type" required>
                        <select
                          className="input-field py-1.5 text-sm"
                          value={formState.payment_type}
                          onChange={(event) => handleFieldChange('payment_type', event.target.value)}
                        >
                          {paymentTypes.map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Bank Account">
                        <select
                          className="input-field py-1.5 text-sm"
                          value={formState.bank}
                          onChange={(event) => handleFieldChange('bank', event.target.value)}
                        >
                          <option value="">Select</option>
                          {banks.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.bank_name} - {bank.account_number}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Lead Source">
                        <select
                        className="input-field py-1.5 text-sm"
                        value={formState.lead_source}
                        onChange={(e) => setFormState({ ...formState, lead_source: e.target.value })}
                      >
                        <option value="">Select</option>
                        {leadSources.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.name}
                          </option>
                        ))}
                      </select>
                      </Field>
                      <Field label="Booking Date" required>
                        <input
                          type="date"
                          className="input-field py-1.5 text-sm"
                          value={formState.booking_date}
                          onChange={(event) => handleFieldChange('booking_date', event.target.value)}
                        />
                      </Field>
                      <Field label="Payment Date">
                        <input
                          type="date"
                          className="input-field py-1.5 text-sm"
                          value={formState.payment_date}
                          onChange={(event) => handleFieldChange('payment_date', event.target.value)}
                        />
                      </Field>
                    </div>
                  </SectionCard>

                  <SectionCard title="Service Details" icon={<Wrench size={14} />}>
                    <div className="grid gap-2 grid-cols-1">
                      <Field label="Services" required>
                        <MultiSelect
                          options={serviceOptions}
                          value={formState.service_ids}
                          onChange={(nextValue) => handleFieldChange('service_ids', nextValue)}
                          placeholder="Select services"
                          searchPlaceholder="Search services..."
                          emptyMessage="No services available."
                        />
                      </Field>
                    </div>
                  </SectionCard>

                  <SectionCard title="Additional Info" icon={<FileText size={14} />}>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Field label="Attachment">
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-2">
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white">
                              <Upload size={12} />
                              Choose
                            </span>
                            <span className="truncate">{attachmentName || 'No file'}</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(event) => handleFieldChange('attachment', event.target.files?.[0] || null)}
                            />
                          </label>
                          {formState.existingAttachmentUrl && !formState.attachment && !formState.remove_attachment ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <a
                                href={formState.existingAttachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-blue-700 hover:text-blue-800"
                              >
                                Open
                              </a>
                              <button
                                type="button"
                                onClick={() => handleFieldChange('remove_attachment', true)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          ) : null}
                          {formState.remove_attachment ? (
                            <button
                              type="button"
                              onClick={() => handleFieldChange('remove_attachment', false)}
                              className="mt-2 text-xs font-medium text-blue-700 hover:text-blue-800"
                            >
                              Keep
                            </button>
                          ) : null}
                        </div>
                      </Field>
                      <Field label="Remarks">
                        <textarea
                          className="input-field min-h-[50px] py-1.5 text-sm"
                          value={formState.remarks}
                          onChange={(event) => handleFieldChange('remarks', event.target.value)}
                          placeholder="Additional info"
                        />
                      </Field>
                    </div>
                  </SectionCard>
                </div>

                {/* Right column: Client Information + Payment Info */}
                <div className="flex-1 flex flex-col gap-2">
                  <SectionCard title="Client Information" icon={<UserRound size={14} />}>
                    {/* Lead Selection Dropdown */}
                    <div className="mb-3 lead-dropdown-container">
                      <Field label="Select Lead (Optional)">
                        <div className="relative">
                          <input
                            type="text"
                            className="input-field py-1.5 text-sm w-full"
                            placeholder="Search leads by name, email, mobile or company..."
                            value={leadSearch}
                            onChange={(e) => handleLeadSearchChange(e.target.value)}
                            onFocus={() => { setShowLeadDropdown(true); if (leads.length === 0) loadLeads(); }}
                          />
                          {showLeadDropdown && (
                            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                              {loadingLeads ? (
                                <div className="p-2 text-xs text-slate-500">Loading...</div>
                              ) : filteredLeads.length > 0 ? (
                                filteredLeads.map((lead) => (
                                  <button
                                    key={lead.id}
                                    type="button"
                                    className="w-full px-3 py-2 text-left text-xs hover:bg-slate-100 focus:bg-slate-100"
                                    onClick={() => handleLeadSelect(lead)}
                                  >
                                    <div className="font-medium text-slate-800">
                                      {lead.client_info?.client_name || lead.client_name || 'Unnamed Lead'}
                                    </div>
                                    <div className="text-slate-500">
                                      {lead.client_info?.company_name || lead.company_name || 'No company'} 
                                      {lead.client_info?.mobile || lead.mobile ? ` | ${lead.client_info?.mobile || lead.mobile}` : ''}
                                      {lead.client_info?.email || lead.email ? ` | ${lead.client_info?.email || lead.email}` : ''}
                                    </div>
                                  </button>
                                ))
                              ) : (
                                <div className="p-2 text-xs text-slate-500">No leads found</div>
                              )}
                            </div>
                          )}
                        </div>
                      </Field>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Field label="Client Name" required>
                        <input
                          className="input-field py-1.5 text-sm"
                          value={formState.client_name}
                          onChange={(event) => handleFieldChange('client_name', event.target.value)}
                          placeholder="Client name"
                        />
                      </Field>
                      <Field label="Company Name" required>
                        <input
                          className="input-field py-1.5 text-sm"
                          value={formState.company_name}
                          onChange={(event) => handleFieldChange('company_name', event.target.value)}
                          placeholder="Company"
                        />
                      </Field>
                      <Field label="GST/PAN">
                        <input
                          className="input-field py-1.5 text-sm"
                          value={formState.gst_pan}
                          onChange={(event) => handleFieldChange('gst_pan', event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                          placeholder="GST/PAN"
                        />
                      </Field>
                      <Field label="Email" required>
                        <input
                          type="email"
                          className="input-field py-1.5 text-sm"
                          value={formState.email}
                          onChange={(event) => handleFieldChange('email', event.target.value)}
                          placeholder="Email"
                        />
                      </Field>
                      <Field label="Mobile" required>
                        <input
                          className="input-field py-1.5 text-sm"
                          value={formState.mobile}
                          onChange={(event) => handleFieldChange('mobile', event.target.value)}
                          placeholder="Mobile"
                        />
                      </Field>
                      <Field label="Industry">
                        <select
                          className="input-field py-1.5 text-sm"
                          value={formState.industry}
                          onChange={(e) => setFormState({ ...formState, industry: e.target.value })}
                        >
                          <option value="">Select</option>
                          {industries.map((ind) => (
                            <option key={ind.id} value={ind.id}>
                              {ind.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </SectionCard>

                  {/* Payment Info - below Client Information */}
                  <SectionCard title="Payment Info" icon={<IndianRupee size={14} />}>
                    <div className="grid gap-2 md:grid-cols-4">
                      <Field label="Total Amount">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-field py-1.5 text-sm"
                          value={formState.total_payment_amount}
                          onChange={(event) => handleFieldChange('total_payment_amount', event.target.value)}
                          placeholder="Total"
                        />
                      </Field>
                      <Field label="Received">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-field py-1.5 text-sm"
                          value={formState.received_amount}
                          onChange={(event) => handleFieldChange('received_amount', event.target.value)}
                          placeholder="Received"
                        />
                      </Field>
                      <Field label="Remaining">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-field py-1.5 text-sm"
                          value={formState.remaining_amount}
                          onChange={(event) => handleFieldChange('remaining_amount', event.target.value)}
                          placeholder="Remaining"
                        />
                      </Field>
                      <Field label="Fund %">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="input-field py-1.5 text-sm"
                          value={formState.after_fund_disbursement_percentage}
                          onChange={(event) => handleFieldChange('after_fund_disbursement_percentage', event.target.value)}
                          placeholder="Fund %"
                        />
                      </Field>
                    </div>
                    <div className="mt-2 text-[10px] sm:text-xs">
                      <button
                        type="button"
                        onClick={() => setShowPaymentRemarks(!showPaymentRemarks)}
                        className="flex items-center gap-1 font-bold text-blue-700 hover:text-blue-800"
                      >
                        {showPaymentRemarks ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {showPaymentRemarks ? 'Hide Remarks' : 'Show Payment Remarks'}
                      </button>
                      {showPaymentRemarks && (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <Field label="Total Amt Remarks">
                            <input
                              className="input-field py-1.5 text-sm"
                              value={formState.total_payment_remarks}
                              onChange={(event) => handleFieldChange('total_payment_remarks', event.target.value)}
                              placeholder="Remarks"
                            />
                          </Field>
                          <Field label="Received Amt Remarks">
                            <input
                              className="input-field py-1.5 text-sm"
                              value={formState.received_amount_remarks}
                              onChange={(event) => handleFieldChange('received_amount_remarks', event.target.value)}
                              placeholder="Remarks"
                            />
                          </Field>
                          <Field label="Remaining Amt Remarks">
                            <input
                              className="input-field py-1.5 text-sm"
                              value={formState.remaining_amount_remarks}
                              onChange={(event) => handleFieldChange('remaining_amount_remarks', event.target.value)}
                              placeholder="Remarks"
                            />
                          </Field>
                          <Field label="Fund % Remarks">
                            <input
                              className="input-field py-1.5 text-sm"
                              value={formState.after_fund_disbursement_remarks}
                              onChange={(event) => handleFieldChange('after_fund_disbursement_remarks', event.target.value)}
                              placeholder="Remarks"
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </div>
                </div>

                <div className="sticky bottom-0 mt-4 flex items-center justify-between border-t border-slate-200 bg-white py-3">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={16} />
                    {submitting ? 'Saving...' : isEditMode ? 'Update Booking' : 'Save Booking'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFormPage;
