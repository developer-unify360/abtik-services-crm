import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle, FileText, IndianRupee, Save, Upload, UserRound, Wrench } from 'lucide-react';

import { useAuthStore } from '../auth/authStore';
import { BookingService } from './BookingService';
import { ClientService } from '../clients/ClientService';
import { ServiceApi, ServiceRequestApi, type Service, type ServiceRequest } from '../services/api/ServiceApi';
import { BankApi, type Bank } from './api/BankApi';

const paymentTypes = [
  { value: 'new_payment', label: 'New Payment' },
  { value: 'remaining_payment', label: 'Remaining Payment' },
  { value: 'complimentary', label: 'Complimentary' },
  { value: 'converted', label: 'Converted' },
  { value: 'transfer', label: 'Transfer' },
];

interface BookingFormState {
  client_name: string;
  company_name: string;
  gst_pan: string;
  email: string;
  mobile: string;
  industry: string;
  bde_name: string;
  payment_type: string;
  bank: string;
  booking_date: string;
  payment_date: string;
  service: string;
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

const emptyFormState = (): BookingFormState => ({
  client_name: '',
  company_name: '',
  gst_pan: '',
  email: '',
  mobile: '',
  industry: '',
  bde_name: '',
  payment_type: 'new_payment',
  bank: '',
  booking_date: new Date().toISOString().split('T')[0],
  payment_date: '',
  service: '',
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

const SectionCard = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-3 rounded-t-2xl border-b border-slate-200 bg-slate-50 px-6 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
    </div>
    <div>{children}</div>
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
    <div className="mb-2 text-sm font-semibold text-slate-700">
      {label} {required ? <span className="text-red-500">*</span> : null}
    </div>
    {children}
  </label>
);

const BookingFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const authUser = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const isEditMode = Boolean(bookingId);
  const [formState, setFormState] = useState<BookingFormState>(emptyFormState);
  const [services, setServices] = useState<Service[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [existingServiceRequest, setExistingServiceRequest] = useState<ServiceRequest | null>(null);
  const [displayBdeName, setDisplayBdeName] = useState(authUser?.name || '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        setPageError('');

        const [serviceData, bankData] = await Promise.all([
          ServiceApi.list(),
          BankApi.list(),
        ]);
        setServices(serviceData);
        setBanks(bankData);

        if (!isEditMode || !bookingId) {
          const initialBdeName = authUser?.name || '';
          setDisplayBdeName(initialBdeName);
          setFormState((prev) => ({ ...prev, bde_name: initialBdeName }));
          setLoading(false);
          return;
        }

        const booking = await BookingService.get(bookingId);
        setDisplayBdeName(booking.bde_name || authUser?.name || '');
        const [client, serviceRequests] = await Promise.all([
          ClientService.get(booking.client),
          ServiceRequestApi.list({ booking_id: bookingId }),
        ]);

        const currentServiceRequest = Array.isArray(serviceRequests) && serviceRequests.length > 0
          ? serviceRequests[0]
          : null;
        setExistingServiceRequest(currentServiceRequest);

        let selectedServiceId = currentServiceRequest?.service || '';

        setFormState({
          client_name: client.client_name || '',
          company_name: client.company_name || '',
          gst_pan: client.gst_pan || '',
          email: client.email || '',
          mobile: client.mobile || '',
          industry: client.industry || '',
          bde_name: booking.bde_name || authUser?.name || '',
          payment_type: booking.payment_type || 'new_payment',
          bank: booking.bank || '',
          booking_date: booking.booking_date || '',
          payment_date: booking.payment_date || '',
          service: selectedServiceId,
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

  const handleFieldChange = (field: keyof BookingFormState, value: string | boolean | File | null) => {
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
          payment_type: formState.payment_type,
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
        },
        service_request: formState.service
          ? {
              service: formState.service,
              priority: existingServiceRequest?.priority || 'medium',
            }
          : {},
        attachment: formState.attachment,
      };

      if (isEditMode && bookingId) {
        await BookingService.updateFull(bookingId, payload);
        navigate('/bookings', {
          replace: true,
          state: { toast: 'Booking updated successfully.', toastType: 'success' },
        });
      } else {
        if (isAuthenticated) {
          await BookingService.createFull(payload);
          navigate('/bookings', {
            replace: true,
            state: { toast: 'Booking created successfully.', toastType: 'success' },
          });
        } else {
          await BookingService.createPublicFull(payload);
          setSubmitSuccess(true);
        }
      }
    } catch (error: any) {
      console.error('Booking form submission failed:', error);
      
      // Try to extract detailed validation errors
      const errorData = error.response?.data?.error;
      let errorMessage = 'Unable to save the booking right now.';
      
      if (errorData?.details) {
        // Build detailed error message from validation details
        const details = errorData.details;
        const errorParts: string[] = [];
        
        if (details.client) {
          const clientErrors = details.client;
          Object.entries(clientErrors).forEach(([field, messages]: [string, any]) => {
            if (Array.isArray(messages)) {
              errorParts.push(`Client ${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'object') {
              Object.entries(messages).forEach(([subField, subMessages]: [string, any]) => {
                errorParts.push(`Client ${field}.${subField}: ${Array.isArray(subMessages) ? subMessages.join(', ') : subMessages}`);
              });
            }
          });
        }
        
        if (details.booking) {
          const bookingErrors = details.booking;
          Object.entries(bookingErrors).forEach(([field, messages]: [string, any]) => {
            if (Array.isArray(messages)) {
              errorParts.push(`Booking ${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'object') {
              Object.entries(messages).forEach(([subField, subMessages]: [string, any]) => {
                errorParts.push(`Booking ${field}.${subField}: ${Array.isArray(subMessages) ? subMessages.join(', ') : subMessages}`);
              });
            }
          });
        }
        
        if (errorParts.length > 0) {
          errorMessage = errorParts.join('\n');
        } else {
          errorMessage = errorData.message || errorMessage;
        }
      } else {
        errorMessage = errorData?.message || error.response?.data?.detail || errorMessage;
      }
      
      setPageError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const attachmentName = formState.attachment?.name
    || (formState.existingAttachmentUrl ? decodeURIComponent(formState.existingAttachmentUrl.split('/').pop() || 'Current attachment') : '');

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
    <div className="space-y-6">

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-cyan-600 px-6 py-8 text-white">
          <h2 className="text-2xl font-semibold">Abtik Booking Form</h2>
          <p className="mt-2 text-sm text-blue-100">Fill in the details below and our team will follow up with you shortly.</p>
        </div>

        <div className="p-6 lg:p-8">
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
            <form className="space-y-6" onSubmit={handleSubmit}>
              <SectionCard title="Booking Details" icon={<CalendarDays size={20} />}>
                <div className="grid gap-5 md:grid-cols-2 p-3">
                  <Field label="BDE Name">
                    <input
                      className="input-field"
                      value={formState.bde_name}
                      onChange={(event) => {
                        handleFieldChange('bde_name', event.target.value);
                        setDisplayBdeName(event.target.value);
                      }}
                    />
                  </Field>
                  <Field label="Bank Account">
                    <select
                      className="input-field"
                      value={formState.bank}
                      onChange={(event) => handleFieldChange('bank', event.target.value)}
                    >
                      <option value="">Select bank account</option>
                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.bank_name} - {bank.account_number}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Payment Type" required>
                    <select
                      className="input-field"
                      value={formState.payment_type}
                      onChange={(event) => handleFieldChange('payment_type', event.target.value)}
                    >
                      {paymentTypes.map((paymentType) => (
                        <option key={paymentType.value} value={paymentType.value}>
                          {paymentType.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Booking Date" required>
                    <input
                      type="date"
                      className="input-field"
                      value={formState.booking_date}
                      onChange={(event) => handleFieldChange('booking_date', event.target.value)}
                    />
                  </Field>
                  <Field label="Payment Date">
                    <input
                      type="date"
                      className="input-field"
                      value={formState.payment_date}
                      onChange={(event) => handleFieldChange('payment_date', event.target.value)}
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Client Information" icon={<UserRound size={20} />}>
                <div className="grid gap-5 md:grid-cols-2 p-3 xl:grid-cols-3">
                  <Field label="B2B Client Name" required>
                    <input
                      className="input-field"
                      value={formState.client_name}
                      onChange={(event) => handleFieldChange('client_name', event.target.value)}
                      placeholder="Enter client name"
                    />
                  </Field>
                  <Field label="Company Name" required>
                    <input
                      className="input-field"
                      value={formState.company_name}
                      onChange={(event) => handleFieldChange('company_name', event.target.value)}
                      placeholder="Enter company name"
                    />
                  </Field>
                  <Field label="GST or PAN Number">
                    <input
                      className="input-field"
                      value={formState.gst_pan}
                      onChange={(event) => handleFieldChange('gst_pan', event.target.value.toUpperCase())}
                      placeholder="Enter GST or PAN number"
                    />
                  </Field>
                  <Field label="Client Email" required>
                    <input
                      type="email"
                      className="input-field"
                      value={formState.email}
                      onChange={(event) => handleFieldChange('email', event.target.value)}
                      placeholder="Enter client email"
                    />
                  </Field>
                  <Field label="Client Mobile No." required>
                    <input
                      className="input-field"
                      value={formState.mobile}
                      onChange={(event) => handleFieldChange('mobile', event.target.value)}
                      placeholder="Enter client mobile number"
                    />
                  </Field>
                  <Field label="Industry / Sector">
                    <input
                      className="input-field"
                      value={formState.industry}
                      onChange={(event) => handleFieldChange('industry', event.target.value)}
                      placeholder="Enter industry or sector"
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Service Details" icon={<Wrench size={20} />}>
                <div className="grid gap-5 md:grid-cols-2 p-3">
                  <Field label="Service">
                    <select
                      className="input-field"
                      value={formState.service}
                      onChange={(event) => handleFieldChange('service', event.target.value)}
                    >
                      <option value="">Select service</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    {services.length > 0
                      ? 'Choose the service that should be linked to this booking.'
                      : 'No services are available yet. Ask an Admin or Super Admin to add one from the Services page.'}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Payment Information" icon={<IndianRupee size={20} />}>
                <div className="grid gap-5 md:grid-cols-2 p-3">
                  <Field label="Total Payment Amount">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={formState.total_payment_amount}
                      onChange={(event) => handleFieldChange('total_payment_amount', event.target.value)}
                      placeholder="Enter total payment amount"
                    />
                  </Field>
                  <Field label="Total Payment Remarks">
                    <input
                      className="input-field"
                      value={formState.total_payment_remarks}
                      onChange={(event) => handleFieldChange('total_payment_remarks', event.target.value)}
                      placeholder="Enter remarks"
                    />
                  </Field>
                  <Field label="Received Amount">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={formState.received_amount}
                      onChange={(event) => handleFieldChange('received_amount', event.target.value)}
                      placeholder="Enter received amount"
                    />
                  </Field>
                  <Field label="Received Amount Remarks">
                    <input
                      className="input-field"
                      value={formState.received_amount_remarks}
                      onChange={(event) => handleFieldChange('received_amount_remarks', event.target.value)}
                      placeholder="Enter remarks"
                    />
                  </Field>
                  <Field label="Remaining Amount">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field"
                      value={formState.remaining_amount}
                      onChange={(event) => handleFieldChange('remaining_amount', event.target.value)}
                      placeholder="Enter remaining amount"
                    />
                  </Field>
                  <Field label="Remaining Amount Remarks">
                    <input
                      className="input-field"
                      value={formState.remaining_amount_remarks}
                      onChange={(event) => handleFieldChange('remaining_amount_remarks', event.target.value)}
                      placeholder="Enter remarks"
                    />
                  </Field>
                  <Field label="After Fund Disbursement (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="input-field"
                      value={formState.after_fund_disbursement_percentage}
                      onChange={(event) => handleFieldChange('after_fund_disbursement_percentage', event.target.value)}
                      placeholder="Enter percentage"
                    />
                  </Field>
                  <Field label="After Fund Disbursement Remarks">
                    <input
                      className="input-field"
                      value={formState.after_fund_disbursement_remarks}
                      onChange={(event) => handleFieldChange('after_fund_disbursement_remarks', event.target.value)}
                      placeholder="Enter remarks"
                    />
                  </Field>
                </div>
              </SectionCard>

              <SectionCard title="Additional Information" icon={<FileText size={20} />}>
                <div className="space-y-5 p-3">
                  <Field label="Upload File(s) or Folder">
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                      <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                        <span className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 font-medium text-white">
                          <Upload size={16} />
                          Choose File
                        </span>
                        <span className="truncate">{attachmentName || 'No file chosen'}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(event) => handleFieldChange('attachment', event.target.files?.[0] || null)}
                        />
                      </label>

                      {formState.existingAttachmentUrl && !formState.attachment && !formState.remove_attachment ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                          <a
                            href={formState.existingAttachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-700 hover:text-blue-800"
                          >
                            Open current attachment
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFieldChange('remove_attachment', true)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove attachment
                          </button>
                        </div>
                      ) : null}

                      {formState.remove_attachment ? (
                        <button
                          type="button"
                          onClick={() => handleFieldChange('remove_attachment', false)}
                          className="mt-3 text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                          Keep current attachment
                        </button>
                      ) : null}
                    </div>
                  </Field>

                  <Field label="Remarks">
                    <textarea
                      className="input-field min-h-[140px]"
                      value={formState.remarks}
                      onChange={(event) => handleFieldChange('remarks', event.target.value)}
                      placeholder="Any additional information"
                    />
                  </Field>
                </div>
              </SectionCard>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-2 sm:flex-row sm:justify-start">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} />
                  {submitting ? 'Saving...' : isEditMode ? 'Update Booking' : 'Submit Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/bookings')}
                  className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingFormPage;
