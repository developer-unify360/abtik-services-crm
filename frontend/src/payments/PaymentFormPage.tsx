import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, FileText, IndianRupee, Save, Upload, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import AttributeService, { type Attribute } from '../attributes/AttributeService';
import { BankApi, type Bank } from '../bookings/api/BankApi';
import { ClientService, type Client } from '../clients/ClientService';
import { PaymentService } from './PaymentService';

interface PaymentFormState {
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
}

const emptyFormState = (): PaymentFormState => ({
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
  const [paymentTypes, setPaymentTypes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');

  const clientOptions = useMemo(() => (clients || []).slice().sort((left, right) => {
    const leftLabel = `${left.client_name} ${left.company_name}`.trim().toLowerCase();
    const rightLabel = `${right.client_name} ${right.company_name}`.trim().toLowerCase();
    return leftLabel.localeCompare(rightLabel);
  }), [clients]);

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setPageError('');

        const [clientData, bankData, paymentTypeData] = await Promise.all([
          ClientService.list({ page_size: '100' }),
          BankApi.list(),
          AttributeService.listPaymentTypes(),
        ]);

        const loadedClients = clientData.results || clientData;
        setClients(loadedClients);
        setBanks(bankData.filter((bank: Bank) => bank.is_active));
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
          total_payment_remarks: payment.total_payment_remarks || '',
          received_amount: toInputValue(payment.received_amount),
          received_amount_remarks: payment.received_amount_remarks || '',
          remaining_amount: toInputValue(payment.remaining_amount),
          remaining_amount_remarks: payment.remaining_amount_remarks || '',
          after_fund_disbursement_percentage: toInputValue(payment.after_fund_disbursement_percentage),
          after_fund_disbursement_remarks: payment.after_fund_disbursement_remarks || '',
          remarks: payment.remarks || '',
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
      setFormState((previous) => ({ ...previous, client_id: '' }));
      return;
    }

    const selectedClient = clientOptions.find((client) => client.id === clientId);
    if (!selectedClient) {
      setFormState((previous) => ({ ...previous, client_id: clientId }));
      return;
    }

    setFormState((previous) => ({
      ...previous,
      client_id: selectedClient.id,
      client_name: selectedClient.client_name || '',
      company_name: selectedClient.company_name || '',
      gst_pan: selectedClient.gst_pan || '',
      email: selectedClient.email || '',
      mobile: selectedClient.mobile || '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
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
        total_payment_remarks: formState.total_payment_remarks,
        received_amount: formState.received_amount || null,
        received_amount_remarks: formState.received_amount_remarks,
        remaining_amount: formState.remaining_amount || null,
        remaining_amount_remarks: formState.remaining_amount_remarks,
        after_fund_disbursement_percentage: formState.after_fund_disbursement_percentage || null,
        after_fund_disbursement_remarks: formState.after_fund_disbursement_remarks,
        remarks: formState.remarks,
        attachment: formState.attachment,
        remove_attachment: formState.remove_attachment,
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

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="shrink-0 w-full space-y-2">
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-slate-600">
            Create manual payment records with client and payment details.
          </p>
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
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Link an existing client for reporting continuity, or leave on manual entry and type details directly.
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
                    <select
                      className="input-field py-1.5 text-sm"
                      value={formState.client_id}
                      onChange={(event) => handleClientSelect(event.target.value)}
                    >
                      <option value="">Manual Entry</option>
                      {clientOptions.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.client_name} - {client.company_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="hidden sm:block" />
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

              <CompactSection title="Remarks" icon={<FileText size={14} />}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Total Remarks">
                    <textarea
                      className="input-field min-h-[60px] py-1.5 text-sm resize-none"
                      value={formState.total_payment_remarks}
                      onChange={(event) => handleFieldChange('total_payment_remarks', event.target.value)}
                      placeholder="Notes"
                    />
                  </Field>
                  <Field label="Received Remarks">
                    <textarea
                      className="input-field min-h-[60px] py-1.5 text-sm resize-none"
                      value={formState.received_amount_remarks}
                      onChange={(event) => handleFieldChange('received_amount_remarks', event.target.value)}
                      placeholder="Notes"
                    />
                  </Field>
                  <Field label="Remaining Remarks">
                    <textarea
                      className="input-field min-h-[60px] py-1.5 text-sm resize-none"
                      value={formState.remaining_amount_remarks}
                      onChange={(event) => handleFieldChange('remaining_amount_remarks', event.target.value)}
                      placeholder="Notes"
                    />
                  </Field>
                  <Field label="Fund Disb. Remarks">
                    <textarea
                      className="input-field min-h-[60px] py-1.5 text-sm resize-none"
                      value={formState.after_fund_disbursement_remarks}
                      onChange={(event) => handleFieldChange('after_fund_disbursement_remarks', event.target.value)}
                      placeholder="Notes"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="General Remarks">
                      <textarea
                        className="input-field min-h-[60px] py-1.5 text-sm resize-none"
                        value={formState.remarks}
                        onChange={(event) => handleFieldChange('remarks', event.target.value)}
                        placeholder="Additional remarks"
                      />
                    </Field>
                  </div>
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
