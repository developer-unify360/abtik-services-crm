import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, IndianRupee, Save, Upload, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import AttributeService, { type Attribute } from '../attributes/AttributeService';
import { BookingService, type Booking } from '../bookings/BookingService';
import { BankApi, type Bank } from '../bookings/api/BankApi';
import { ClientService, type Client } from '../clients/ClientService';
import SearchableSelect, { type SearchableSelectOption } from '../components/SearchableSelect';
import { ServiceApi, ServiceRequestApi, type Service, type ServiceRequest } from '../services/api/ServiceApi';
import { PaymentService, type Payment } from './PaymentService';

interface PaymentFormState {
  booking_id: string;
  service_id: string;
  client_id: string;
  client_name: string;
  company_name: string;
  gst_pan: string;
  email: string;
  mobile: string;
  payment_type: string;
  bank: string;
  reference_number: string;
  payment_date: string;
  total_payment_amount: string;
  received_amount: string;
  remaining_amount: string;
  after_fund_disbursement_percentage: string;
  attachment: File | null;
  existingAttachmentUrl: string;
  remove_attachment: boolean;
}

interface ClientBookingServiceOption {
  value: string;
  bookingId: string;
  serviceId: string;
  label: string;
  searchText?: string;
  badge?: string;
  badgeTone?: 'amber' | 'slate' | 'emerald' | 'blue';
  disabled?: boolean;
}

type BookingWithPayments = Booking & { payments?: Payment[] };

const emptyFormState = (): PaymentFormState => ({
  booking_id: '',
  service_id: '',
  client_id: '',
  client_name: '',
  company_name: '',
  gst_pan: '',
  email: '',
  mobile: '',
  payment_type: '',
  bank: '',
  reference_number: '',
  payment_date: new Date().toISOString().split('T')[0],
  total_payment_amount: '',
  received_amount: '',
  remaining_amount: '',
  after_fund_disbursement_percentage: '',
  attachment: null,
  existingAttachmentUrl: '',
  remove_attachment: false,
});

const toInputValue = (value?: string | number | null) => (value === null || value === undefined ? '' : String(value));

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

const formatBookingServiceDate = (value?: string | null) => {
  if (!value) {
    return 'No date';
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const serializeLinkedService = (bookingId?: string | null, serviceId?: string | null) => (
  bookingId && serviceId ? `${bookingId}::${serviceId}` : ''
);

const CompactSection = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        {icon}
      </div>
      <h2 className="text-xs font-semibold text-slate-900">{title}</h2>
    </div>
    <div className="p-3">{children}</div>
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
    <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
      {label} {required ? <span className="text-red-500">*</span> : null}
    </div>
    {children}
  </label>
);

const PaymentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { paymentId } = useParams<{ paymentId: string }>();

  const isEditMode = Boolean(paymentId);
  const [formState, setFormState] = useState<PaymentFormState>(emptyFormState);
  const [clients, setClients] = useState<Client[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<Attribute[]>([]);
  const [linkedServiceOptions, setLinkedServiceOptions] = useState<ClientBookingServiceOption[]>([]);
  const [loadingLinkedServices, setLoadingLinkedServices] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');

  const clientOptions = useMemo(() => (clients || []).slice().sort((left, right) => {
    const leftLabel = `${left.client_name} ${left.company_name}`.trim().toLowerCase();
    const rightLabel = `${right.client_name} ${right.company_name}`.trim().toLowerCase();
    return leftLabel.localeCompare(rightLabel);
  }), [clients]);

  const linkedClientOptions = useMemo<SearchableSelectOption[]>(() => (
    clientOptions.map((client) => ({
      value: client.id,
      label: [client.client_name, client.company_name].filter(Boolean).join(' - ') || 'Unnamed client',
      searchText: [
        client.client_name,
        client.company_name,
        client.email,
        client.mobile,
        client.gst_pan,
      ].filter(Boolean).join(' '),
    }))
  ), [clientOptions]);

  const bookingServiceSelectOptions = useMemo<SearchableSelectOption[]>(() => (
    linkedServiceOptions.map((option) => ({
      value: option.value,
      label: option.label,
      searchText: option.searchText,
      badge: option.badge,
      badgeTone: option.badgeTone,
      disabled: option.disabled,
    }))
  ), [linkedServiceOptions]);

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setPageError('');

        const [clientData, bankData, paymentTypeData, serviceData] = await Promise.all([
          ClientService.list({ page_size: '100' }),
          BankApi.list(),
          AttributeService.listPaymentTypes(),
          ServiceApi.list(),
        ]);

        const loadedClients = clientData.results || clientData;
        setClients(loadedClients);
        setBanks(bankData.filter((bank: Bank) => bank.is_active));
        setServices(serviceData);
        setPaymentTypes(paymentTypeData.filter((paymentType: Attribute) => paymentType.is_active));

        if (!isEditMode || !paymentId) {
          setFormState(emptyFormState());
          return;
        }

        const payment = await PaymentService.get(paymentId);
        if (payment.source !== 'manual') {
          setPageError('Booking-linked payments can only be edited from the booking form.');
          return;
        }

        if (payment.client && !loadedClients.some((client: Client) => client.id === payment.client)) {
          try {
            const linkedClient = await ClientService.get(payment.client);
            setClients((previous) => [...previous, linkedClient]);
          } catch (error) {
            console.error('Failed to load linked client:', error);
          }
        }

        setFormState({
          booking_id: '',
          service_id: '',
          client_id: payment.client || '',
          client_name: payment.client_name || '',
          company_name: payment.company_name || '',
          gst_pan: payment.gst_pan || '',
          email: payment.email || '',
          mobile: payment.mobile || '',
          payment_type: payment.payment_type || '',
          bank: payment.bank || '',
          reference_number: payment.reference_number || '',
          payment_date: payment.payment_date || '',
          total_payment_amount: toInputValue(payment.total_payment_amount),
          received_amount: toInputValue(payment.received_amount),
          remaining_amount: toInputValue(payment.remaining_amount),
          after_fund_disbursement_percentage: toInputValue(payment.after_fund_disbursement_percentage),
          attachment: null,
          existingAttachmentUrl: payment.attachment_url || '',
          remove_attachment: false,
        });
      } catch (error) {
        console.error('Failed to load payment form:', error);
        setPageError('Unable to load the payment form right now.');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [isEditMode, paymentId]);

  useEffect(() => {
    if (isEditMode) {
      setLinkedServiceOptions([]);
      setLoadingLinkedServices(false);
      return;
    }

    if (!formState.client_id) {
      setLinkedServiceOptions([]);
      setLoadingLinkedServices(false);
      return;
    }

    let cancelled = false;

    const loadLinkedServices = async () => {
      try {
        setLoadingLinkedServices(true);

        const bookingListResponse = await BookingService.list({
          client_id: formState.client_id,
          page_size: '100',
        });
        const clientBookings = (bookingListResponse.results || bookingListResponse || []) as Booking[];

        if (!clientBookings.length) {
          if (!cancelled) {
            setLinkedServiceOptions([]);
          }
          return;
        }

        const linkedServiceGroups = await Promise.all(
          clientBookings.map(async (bookingSummary) => {
            const [bookingDetail, serviceRequestsResponse] = await Promise.all([
              BookingService.get(bookingSummary.id) as Promise<BookingWithPayments>,
              ServiceRequestApi.list({ booking_id: bookingSummary.id }),
            ]);

            const serviceRequests = Array.isArray(serviceRequestsResponse) ? serviceRequestsResponse : [];
            const bookingServiceIds = new Set(serviceRequests.map((serviceRequest: ServiceRequest) => String(serviceRequest.service)));

            return services
              .map((service: Service): ClientBookingServiceOption => {
                const linkedPayments = (bookingDetail.payments || []).filter((payment) =>
                  (payment.services || []).some((serviceId) => String(serviceId) === String(service.id)),
                );
                const hasLockedPayment = linkedPayments.some((payment) => (
                  payment.total_payment_amount !== null
                  && payment.total_payment_amount !== undefined
                  && String(payment.total_payment_amount).trim() !== ''
                ));
                const hasPendingBookingService = bookingServiceIds.has(String(service.id));

                return {
                  value: serializeLinkedService(bookingDetail.id, service.id),
                  bookingId: bookingDetail.id,
                  serviceId: service.id,
                  label: `${service.name} - Booking ${formatBookingServiceDate(bookingDetail.booking_date)} - ${bookingDetail.id.slice(0, 8)}`,
                  searchText: `${service.name} ${bookingDetail.booking_date || ''} ${bookingDetail.id}`,
                  badge: hasLockedPayment ? 'Saved' : hasPendingBookingService ? 'Payment Pending' : undefined,
                  badgeTone: hasLockedPayment ? 'slate' : hasPendingBookingService ? 'amber' : undefined,
                  disabled: hasLockedPayment,
                };
              });
          }),
        );

        const nextOptions = linkedServiceGroups
          .flat()
          .sort((left, right) => left.label.localeCompare(right.label));

        if (!cancelled) {
          setLinkedServiceOptions(nextOptions);
          setFormState((previous) => {
            if (!previous.booking_id || !previous.service_id) {
              return previous;
            }

            const isExistingSelection = nextOptions.some(
              (option) => option.bookingId === previous.booking_id && option.serviceId === previous.service_id,
            );

            return isExistingSelection
              ? previous
              : { ...previous, booking_id: '', service_id: '' };
          });
        }
      } catch (error) {
        console.error('Failed to load linked booking services:', error);
        if (!cancelled) {
          setLinkedServiceOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingLinkedServices(false);
        }
      }
    };

    loadLinkedServices();

    return () => {
      cancelled = true;
    };
  }, [formState.client_id, isEditMode, services]);

  const handleFieldChange = (field: keyof PaymentFormState, value: string | boolean | File | null) => {
    setFormState((previous) => {
      const nextState = { ...previous, [field]: value } as PaymentFormState;

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

  const handleClientSelect = (clientId: string) => {
    if (!clientId) {
      setFormState((previous) => ({
        ...previous,
        client_id: '',
        booking_id: '',
        service_id: '',
      }));
      return;
    }

    const selectedClient = clientOptions.find((client) => client.id === clientId);
    if (!selectedClient) {
      setFormState((previous) => ({
        ...previous,
        client_id: clientId,
        booking_id: '',
        service_id: '',
      }));
      return;
    }

    setFormState((previous) => ({
      ...previous,
      booking_id: '',
      service_id: '',
      client_id: selectedClient.id,
      client_name: selectedClient.client_name || '',
      company_name: selectedClient.company_name || '',
      gst_pan: selectedClient.gst_pan || '',
      email: selectedClient.email || '',
      mobile: selectedClient.mobile || '',
    }));
  };

  const handleLinkedServiceSelect = (value: string) => {
    const selectedOption = linkedServiceOptions.find((option) => option.value === value);

    setFormState((previous) => ({
      ...previous,
      booking_id: selectedOption?.bookingId || '',
      service_id: selectedOption?.serviceId || '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      if (!isEditMode && Boolean(formState.booking_id) !== Boolean(formState.service_id)) {
        setPageError('Select a valid booking service before saving this linked payment.');
        return;
      }

      setSubmitting(true);
      setPageError('');

      const payload = {
        client_id: formState.client_id || null,
        client_name: formState.client_name,
        company_name: formState.company_name,
        gst_pan: formState.gst_pan,
        email: formState.email,
        mobile: formState.mobile,
        payment_type: formState.payment_type || null,
        bank: formState.bank || null,
        reference_number: formState.reference_number,
        payment_date: formState.payment_date || null,
        total_payment_amount: formState.total_payment_amount || null,
        received_amount: formState.received_amount || null,
        remaining_amount: formState.remaining_amount || null,
        after_fund_disbursement_percentage: formState.after_fund_disbursement_percentage || null,
        attachment: formState.attachment,
        remove_attachment: formState.remove_attachment,
        ...(!isEditMode && formState.booking_id && formState.service_id
          ? {
              booking_id: formState.booking_id,
              services: [formState.service_id],
            }
          : {}),
      };

      if (isEditMode && paymentId) {
        await PaymentService.update(paymentId, payload);
        navigate('/payments', {
          replace: true,
          state: { toast: 'Payment updated successfully.', toastType: 'success' },
        });
        return;
      }

      await PaymentService.create(payload);
      navigate('/payments', {
        replace: true,
        state: { toast: 'Payment created successfully.', toastType: 'success' },
      });
    } catch (error: any) {
      console.error('Payment form submission failed:', error);
      const errorMessage =
        error.response?.data?.error?.message
        || error.response?.data?.detail
        || 'Unable to save the payment right now.';

      setPageError(
        typeof errorMessage === 'string'
          ? errorMessage
          : Object.entries(errorMessage)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('\n')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const attachmentName = formState.attachment?.name
    || (formState.existingAttachmentUrl ? decodeURIComponent(formState.existingAttachmentUrl.split('/').pop() || 'Current attachment') : '');
  const selectedLinkedServiceValue = serializeLinkedService(formState.booking_id, formState.service_id);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="shrink-0 w-full space-y-2">
        <div className="flex justify-end rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="payment-form"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={14} />
              {submitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/payments')}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {pageError ? (
        <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs whitespace-pre-line text-red-700">
          {pageError}
        </div>
      ) : null}

      {loading ? (
        <div className="flex-1 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-600">
          Loading payment form...
        </div>
      ) : (
        <form id="payment-form" className="flex-1 min-h-0 flex flex-col" onSubmit={handleSubmit}>
          <div className="flex-1 min-h-0 overflow-auto pr-1">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <CompactSection title="Client Details" icon={<UserRound size={14} />}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Linked Client">
                    <SearchableSelect
                      options={linkedClientOptions}
                      value={formState.client_id}
                      onChange={handleClientSelect}
                      placeholder="Manual Entry"
                      searchPlaceholder="Search clients..."
                      emptyMessage="No clients available."
                      emptySearchMessage="No clients match your search."
                      clearable
                      clearLabel="Clear"
                      compact
                    />
                  </Field>
                  {!isEditMode ? (
                    <Field label="Select Service">
                      <div>
                        <SearchableSelect
                          options={bookingServiceSelectOptions}
                          value={selectedLinkedServiceValue}
                          onChange={handleLinkedServiceSelect}
                          disabled={!formState.client_id || loadingLinkedServices}
                          placeholder={
                            !formState.client_id
                              ? 'Link a client first'
                              : loadingLinkedServices
                                ? 'Loading services...'
                                : linkedServiceOptions.length === 0
                                  ? 'No booking services'
                                  : 'Select one service'
                          }
                          searchPlaceholder="Search booking services..."
                          emptyMessage={
                            !formState.client_id
                              ? 'Link a client first to view booking services.'
                              : 'No booking services available.'
                          }
                          emptySearchMessage="No booking services match your search."
                          clearable
                          clearLabel="Clear"
                          compact
                        />
                      </div>
                    </Field>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                  <Field label="Client Name" required>
                    <input
                      className="input-field py-1.5 text-sm"
                      value={formState.client_name}
                      onChange={(event) => handleFieldChange('client_name', event.target.value)}
                      placeholder="Name"
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
                  <Field label="Email">
                    <input
                      type="email"
                      className="input-field py-1.5 text-sm"
                      value={formState.email}
                      onChange={(event) => handleFieldChange('email', event.target.value)}
                      placeholder="Email"
                    />
                  </Field>
                  <Field label="Mobile">
                    <input
                      className="input-field py-1.5 text-sm"
                      value={formState.mobile}
                      onChange={(event) => handleFieldChange('mobile', event.target.value)}
                      placeholder="Mobile"
                    />
                  </Field>
                  <Field label="GST / PAN">
                    <input
                      className="input-field py-1.5 text-sm"
                      value={formState.gst_pan}
                      onChange={(event) => handleFieldChange('gst_pan', event.target.value.toUpperCase())}
                      placeholder="GST/PAN"
                    />
                  </Field>
                </div>
              </CompactSection>

              <CompactSection title="Payment Details" icon={<IndianRupee size={14} />}>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Payment Type">
                    <select
                      className="input-field py-1.5 text-sm"
                      value={formState.payment_type}
                      onChange={(event) => handleFieldChange('payment_type', event.target.value)}
                    >
                      <option value="">Select</option>
                      {paymentTypes.map((paymentType) => (
                        <option key={paymentType.id} value={paymentType.id}>
                          {paymentType.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Bank">
                    <select
                      className="input-field py-1.5 text-sm"
                      value={formState.bank}
                      onChange={(event) => handleFieldChange('bank', event.target.value)}
                    >
                      <option value="">Select</option>
                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.bank_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Reference No.">
                    <input
                      className="input-field py-1.5 text-sm"
                      value={formState.reference_number}
                      onChange={(event) => handleFieldChange('reference_number', event.target.value)}
                      placeholder="UTR/Cheque No."
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
                  <Field label="Total Amount">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field py-1.5 text-sm"
                      value={formState.total_payment_amount}
                      onChange={(event) => handleFieldChange('total_payment_amount', event.target.value)}
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Received Amount">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field py-1.5 text-sm"
                      value={formState.received_amount}
                      onChange={(event) => handleFieldChange('received_amount', event.target.value)}
                      placeholder="0.00"
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
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Fund Disb. %">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="input-field py-1.5 text-sm"
                      value={formState.after_fund_disbursement_percentage}
                      onChange={(event) => handleFieldChange('after_fund_disbursement_percentage', event.target.value)}
                      placeholder="0.00"
                    />
                  </Field>
                </div>
              </CompactSection>

              <CompactSection title="Attachment" icon={<CreditCard size={14} />}>
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-700">
                    <span className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 font-medium text-white">
                      <Upload size={12} />
                      Choose
                    </span>
                    <span className="truncate max-w-[150px]">{attachmentName || 'No file'}</span>
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
                        className="font-medium text-emerald-700 hover:text-emerald-800"
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
                      className="mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Keep existing
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Upload receipts, challans, or payment proof.
                </p>
              </CompactSection>
            </div>
          </div>


        </form>
      )}
    </div>
  );
};

export default PaymentFormPage;
