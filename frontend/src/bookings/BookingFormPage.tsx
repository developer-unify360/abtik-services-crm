import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  CalendarDays, CheckCircle, FileText, Save,
  Upload, UserRound, Wrench,
  AlertCircle
} from 'lucide-react';

import { useAuthStore } from '../auth/authStore';
import { BookingService } from './BookingService';
import { ClientService } from '../clients/ClientService';
import { LeadService, type Lead } from '../leads/LeadService';
import { ServiceApi, ServiceRequestApi, type Service, type ServiceRequest } from '../services/api/ServiceApi';
import { BankApi, type Bank } from './api/BankApi';
import MultiSelect from '../components/MultiSelect';

import AttributeService from '../attributes/AttributeService';
import type { Attribute } from '../attributes/AttributeService';
import { toastSuccess } from '../services/toastNotify';

interface ServicePaymentRow {
  service_id: string;
  payment_id?: string;          // existing Payment DB id (for edit mode)
  payment_type: string;
  bank: string;
  payment_date: string;
  total_payment_amount: string;
  received_amount: string;
  remaining_amount: string;
  after_fund_disbursement_percentage: string;
}

interface BookingFormState {
  client_name: string;
  company_name: string;
  gst_pan: string;
  email: string;
  mobile: string;
  industry: string;
  bde_name: string;
  lead_source: string;
  payment_type: string;       // default payment type for new rows
  bank: string;               // default bank for new rows
  booking_date: string;
  payment_date: string;       // default payment date for new rows
  service_ids: string[];
  total_payment_amount: string;
  received_amount: string;
  remaining_amount: string;
  after_fund_disbursement_percentage: string;
  attachment: File | null;
  existingAttachmentUrl: string;
  remove_attachment: boolean;
  lead_id?: string;
  service_payments: ServicePaymentRow[];
  initial_service_ids: string[];  // services that existed when we loaded in edit mode
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
  received_amount: '',
  remaining_amount: '',
  after_fund_disbursement_percentage: '',
  attachment: null,
  existingAttachmentUrl: '',
  remove_attachment: false,
  service_payments: [],
  initial_service_ids: [],
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

/** Returns true when all payment amount fields are empty/blank */
const isPaymentEmpty = (row: ServicePaymentRow): boolean => {
  return (
    !row.total_payment_amount &&
    !row.received_amount &&
    !row.remaining_amount
  );
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
          const prefillServiceIds = normalizeSelectedServiceIds(prefillServices ?? prefillService);

          // Create payment rows for any prefilled services
          const prefillPaymentRows: ServicePaymentRow[] = prefillServiceIds.map((sid) => ({
            service_id: sid,
            payment_type: '',
            bank: '',
            payment_date: '',
            total_payment_amount: '',
            received_amount: '',
            remaining_amount: '',
            after_fund_disbursement_percentage: '',
          }));

          setFormState((prev) => ({
            ...prev,
            ...prefillFields,
            bde_name: initialBdeName,
            service_ids: prefillServiceIds,
            service_payments: prefillPaymentRows,
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

        const initial_service_ids = normalizeSelectedServiceIds(
          normalizedServiceRequests.map((req) => req.service)
        );

        // Build service → payment mapping from existing payments
        const allPayments: any[] = booking.payments || [];
        const servicePaymentRows: ServicePaymentRow[] = [];

        // Build a map: service_id → payment data
        const serviceToPaymentMap = new Map<string, any>();
        for (const p of allPayments) {
          const paymentServices: string[] = p.services || [];
          for (const sid of paymentServices) {
            serviceToPaymentMap.set(String(sid), p);
          }
        }

        // For each service in the booking, create a payment row
        for (const sid of initial_service_ids) {
          const p = serviceToPaymentMap.get(sid);
          if (p) {
            servicePaymentRows.push({
              service_id: sid,
              payment_id: p.id,
              payment_type: p.payment_type || '',
              bank: p.bank || '',
              payment_date: p.payment_date || '',
              total_payment_amount: toInputValue(p.total_payment_amount),
              received_amount: toInputValue(p.received_amount),
              remaining_amount: toInputValue(p.remaining_amount),
              after_fund_disbursement_percentage: toInputValue(p.after_fund_disbursement_percentage),
            });
          } else {
            servicePaymentRows.push({
              service_id: sid,
              payment_type: booking.payment_type || '',
              bank: booking.bank || '',
              payment_date: booking.payment_date || '',
              total_payment_amount: '',
              received_amount: '',
              remaining_amount: '',
              after_fund_disbursement_percentage: '',
            });
          }
        }

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
          service_ids: initial_service_ids,
          total_payment_amount: toInputValue(booking.total_payment_amount),
          received_amount: toInputValue(booking.received_amount),
          remaining_amount: toInputValue(booking.remaining_amount),
          after_fund_disbursement_percentage: toInputValue(booking.after_fund_disbursement_percentage),
          attachment: null,
          existingAttachmentUrl: booking.attachment || '',
          remove_attachment: false,
          service_payments: servicePaymentRows,
          initial_service_ids: initial_service_ids,
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
      const leadsArray = Array.isArray(data) ? data : (data?.results || []);
      
      // Filter out leads already converted to Bookings (status 'closed_won')
      // but allow the currently selected lead to appear in the list if it's already there
      const currentLeadId = formState.lead_id;
      const filteredLeads = Array.isArray(leadsArray) 
        ? leadsArray.filter((lead: Lead) => lead.status !== 'closed_won' || lead.id === currentLeadId)
        : [];
        
      setLeads(filteredLeads);
    } catch (error) {
      console.error('Failed to load leads:', error);
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Handle lead selection
  const handleLeadSelect = (lead: Lead) => {
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

  const handleLeadSearchChange = (value: string) => {
    setLeadSearch(value);
    setShowLeadDropdown(true);
    loadLeads(value);
  };

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

  const filteredLeads = leads;

  const handleFieldChange = (field: keyof BookingFormState, value: string | string[] | boolean | File | null) => {
    setFormState((previous) => {
      const nextState = { ...previous, [field]: value } as BookingFormState;

      if (field === 'attachment' && value) {
        nextState.remove_attachment = false;
      }

      return nextState;
    });
  };

  /**
   * When services change, sync service_payments rows:
   *  - newly added services → new empty payment row
   *  - removed services → remove their payment row (unless locked in edit mode)
   */
  const handleServiceChange = (nextServiceIds: string[]) => {
    setFormState((prev) => {
      // In edit mode, prevent removal of initial services
      let finalServiceIds = nextServiceIds;
      if (isEditMode) {
        const initialIds = prev.initial_service_ids || [];
        const missingInitials = initialIds.filter(id => !nextServiceIds.includes(id));
        if (missingInitials.length > 0) {
          finalServiceIds = [...new Set([...nextServiceIds, ...initialIds])];
        }
      }

      const existingPaymentMap = new Map<string, ServicePaymentRow>();
      for (const row of prev.service_payments) {
        existingPaymentMap.set(row.service_id, row);
      }

      const newServicePayments: ServicePaymentRow[] = finalServiceIds.map((sid) => {
        const existing = existingPaymentMap.get(sid);
        if (existing) return existing;

        // New service → new empty payment row with defaults from booking-level fields
        return {
          service_id: sid,
          payment_type: prev.payment_type || '',
          bank: prev.bank || '',
          payment_date: prev.payment_date || '',
          total_payment_amount: '',
          received_amount: '',
          remaining_amount: '',
          after_fund_disbursement_percentage: '',
        };
      });

      return {
        ...prev,
        service_ids: finalServiceIds,
        service_payments: newServicePayments,
      };
    });
  };

  const handleUpdateServicePayment = (serviceId: string, field: keyof ServicePaymentRow, value: any) => {
    setFormState((prev) => {
      const updatedPayments = prev.service_payments.map((row) => {
        if (row.service_id !== serviceId) return row;
        const updated = { ...row, [field]: value };

        if (field === 'total_payment_amount' || field === 'received_amount') {
          updated.remaining_amount = calculateRemainingAmount(
            updated.total_payment_amount,
            updated.received_amount,
          );
        }

        return updated;
      });

      return { ...prev, service_payments: updatedPayments };
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

      // Build payments array from service_payments
      // Only include rows that have actual payment data (non-empty amounts)
      const paymentsPayload = formState.service_payments.map((row) => {
        const hasPaymentData = !isPaymentEmpty(row);

        return {
          id: row.payment_id,
          payment_type: row.payment_type || null,
          bank: row.bank || null,
          payment_date: row.payment_date || null,
          total_payment_amount: hasPaymentData ? (row.total_payment_amount || null) : null,
          received_amount: hasPaymentData ? (row.received_amount || null) : null,
          remaining_amount: hasPaymentData ? (row.remaining_amount || null) : null,
          after_fund_disbursement_percentage: hasPaymentData ? (row.after_fund_disbursement_percentage || null) : null,
          services: [row.service_id],
          _skip_create: !hasPaymentData,  // Signal backend to skip creating this record
        };
      });

      // Compute aggregate totals for the booking model
      const aggregateTotals = formState.service_payments.reduce(
        (acc, row) => {
          if (!isPaymentEmpty(row)) {
            acc.total += Number(row.total_payment_amount) || 0;
            acc.received += Number(row.received_amount) || 0;
            acc.remaining += Number(row.remaining_amount) || 0;
          }
          return acc;
        },
        { total: 0, received: 0, remaining: 0 }
      );

      const hasAnyPaymentData = formState.service_payments.some(r => !isPaymentEmpty(r));

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
          total_payment_amount: hasAnyPaymentData ? aggregateTotals.total || null : null,
          received_amount: hasAnyPaymentData ? aggregateTotals.received || null : null,
          remaining_amount: hasAnyPaymentData ? aggregateTotals.remaining || null : null,
          after_fund_disbursement_percentage: formState.after_fund_disbursement_percentage || null,
          remove_attachment: formState.remove_attachment,
          lead_id: formState.lead_id || null,
          payments: paymentsPayload.filter(p => !p._skip_create),
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
        await BookingService.createFull(payload);
        toastSuccess('Booking created successfully.');
        navigate('/bookings');
      }
    } catch (error: any) {
      console.error('Booking form submission failed:', error);
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

  // Helper to get service name by id
  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  // Compute summary totals
  const summaryTotals = formState.service_payments.reduce(
    (acc, row) => {
      if (!isPaymentEmpty(row)) {
        acc.total += Number(row.total_payment_amount) || 0;
        acc.received += Number(row.received_amount) || 0;
        acc.remaining += Number(row.remaining_amount) || 0;
        acc.filledCount += 1;
      }
      return acc;
    },
    { total: 0, received: 0, remaining: 0, filledCount: 0 }
  );
  const pendingCount = formState.service_payments.length - summaryTotals.filledCount;

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
                <div className="flex flex-col lg:flex-row gap-2">
                  {/* Column 1: Client Information -> Booking Details -> Additional Info */}
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
                            <option value="">Select</option>
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
                      </div>
                    </SectionCard>
                  </div>

                  {/* Column 2: Services & Payments */}
                  <div className="flex-1 flex flex-col gap-2">
                    <SectionCard title="Services & Payments" icon={<Wrench size={14} />}>
                      <div className="space-y-3">
                        {/* Service selector */}
                        <Field label="Services" required>
                          <MultiSelect
                            options={serviceOptions}
                            value={formState.service_ids}
                            onChange={handleServiceChange}
                            placeholder="Select services"
                            searchPlaceholder="Search services..."
                            emptyMessage="No services available."
                          />
                          {isEditMode && (
                            <p className="mt-1 text-[10px] text-slate-500 italic">
                              Initial services are locked and cannot be removed.
                            </p>
                          )}
                        </Field>

                        {/* Payment rows — one per selected service */}
                        {formState.service_payments.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Payment per Service
                              </div>
                              {/* Summary badge */}
                              <div className="flex items-center gap-2">
                                {summaryTotals.filledCount > 0 && (
                                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                    ₹{summaryTotals.received.toLocaleString()} received
                                  </span>
                                )}
                                {pendingCount > 0 && (
                                  <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertCircle size={10} />
                                    {pendingCount} pending
                                  </span>
                                )}
                              </div>
                            </div>

                            {formState.service_payments.map((row) => {
                              const svcName = getServiceName(row.service_id);
                              const empty = isPaymentEmpty(row);

                              return (
                                <div
                                  key={row.service_id}
                                  className={`rounded-lg border overflow-hidden transition-all ${
                                    empty
                                      ? 'border-amber-200 bg-amber-50/30'
                                      : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  {/* Service header row */}
                                  <div className={`flex items-center justify-between px-3 py-1.5 ${
                                    empty ? 'bg-amber-50' : 'bg-slate-50'
                                  } border-b ${empty ? 'border-amber-200' : 'border-slate-200'}`}>
                                    <div className="flex items-center gap-2">
                                      <Wrench size={11} className={empty ? 'text-amber-500' : 'text-blue-500'} />
                                      <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                                        {svcName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {empty ? (
                                        <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1">
                                          <AlertCircle size={10} />
                                          Payment Pending
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-medium text-green-600">
                                          ₹{row.received_amount || '0'} received
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Payment fields grid */}
                                  <div className="p-1 grid gap-2 md:grid-cols-4">
                                    <Field label="Total Amount">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="input-field py-1 text-xs"
                                        value={row.total_payment_amount}
                                        onChange={(e) => handleUpdateServicePayment(row.service_id, 'total_payment_amount', e.target.value)}
                                        placeholder="Total"
                                      />
                                    </Field>
                                    <Field label="Received">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="input-field py-1 text-xs"
                                        value={row.received_amount}
                                        onChange={(e) => handleUpdateServicePayment(row.service_id, 'received_amount', e.target.value)}
                                        placeholder="Received"
                                      />
                                    </Field>
                                    <Field label="Remaining">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="input-field py-1 text-xs"
                                        value={row.remaining_amount}
                                        disabled
                                        placeholder="Remaining"
                                      />
                                    </Field>
                                    <Field label="Fund %">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="input-field py-1 text-xs"
                                        value={row.after_fund_disbursement_percentage}
                                        onChange={(e) => handleUpdateServicePayment(row.service_id, 'after_fund_disbursement_percentage', e.target.value)}
                                        placeholder="Fund %"
                                      />
                                    </Field>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Aggregate summary row */}
                            {formState.service_payments.length > 1 && summaryTotals.filledCount > 0 && (
                              <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-700">Total Summary</span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-slate-600">
                                      Total: <strong className="text-slate-800">₹{summaryTotals.total.toLocaleString()}</strong>
                                    </span>
                                    <span className="text-green-600">
                                      Received: <strong>₹{summaryTotals.received.toLocaleString()}</strong>
                                    </span>
                                    <span className="text-amber-600">
                                      Remaining: <strong>₹{summaryTotals.remaining.toLocaleString()}</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Empty state when no services selected */}
                        {formState.service_payments.length === 0 && (
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                            <Wrench size={20} className="mx-auto text-slate-300 mb-1" />
                            <p className="text-xs text-slate-500">
                              Select services above to configure payment for each service.
                            </p>
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </div>
                </div>

                <div className="sticky bottom-0 mt-4 flex items-end border-t border-slate-200 bg-white py-3 justify-start gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-lg bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={16} />
                    {submitting ? 'Saving...' : isEditMode ? 'Update Booking' : 'Save Booking'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
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
