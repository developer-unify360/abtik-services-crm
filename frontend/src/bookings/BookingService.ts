import apiClient from '../api/apiClient';
import type { ClientCreateData } from '../clients/ClientService';

export interface Booking {
  id: string;
  client: string;
  client_name: string;
  company_name: string;
  bde_user?: string;
  bde_name?: string;
  payment_type: string;
  payment_type_display: string;
  bank_account?: string;
  booking_date: string;
  payment_date?: string | null;
  total_payment_amount?: string | null;
  total_payment_remarks?: string;
  received_amount?: string | null;
  received_amount_remarks?: string;
  remaining_amount?: string | null;
  remaining_amount_remarks?: string;
  after_fund_disbursement_percentage?: string | null;
  after_fund_disbursement_remarks?: string;
  attachment?: string | null;
  remarks?: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at?: string;
}

export interface BookingCreateData {
  client_id?: string;
  payment_type: string;
  bank_account?: string;
  booking_date: string;
  payment_date?: string | null;
  total_payment_amount?: string | null;
  total_payment_remarks?: string;
  received_amount?: string | null;
  received_amount_remarks?: string;
  remaining_amount?: string | null;
  remaining_amount_remarks?: string;
  after_fund_disbursement_percentage?: string | null;
  after_fund_disbursement_remarks?: string;
  remarks?: string;
  status?: string;
  remove_attachment?: boolean;
}

export interface BookingFullFormData {
  client: ClientCreateData;
  booking: BookingCreateData;
  service_request?: {
    service?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
  attachment?: File | null;
}

const appendJsonField = (formData: FormData, key: string, value: unknown) => {
  formData.append(key, JSON.stringify(value ?? {}));
};

const toMultipartPayload = (data: BookingFullFormData) => {
  const formData = new FormData();
  appendJsonField(formData, 'client', data.client);
  appendJsonField(formData, 'booking', data.booking);
  appendJsonField(formData, 'service_request', data.service_request ?? {});

  if (data.attachment) {
    formData.append('attachment', data.attachment);
  }

  return formData;
};

export const BookingService = {
  list: async (params?: Record<string, string>) => {
    const response = await apiClient.get('/bookings/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/bookings/${id}/`);
    return response.data.data || response.data;
  },

  create: async (data: BookingCreateData) => {
    const response = await apiClient.post('/bookings/', data);
    return response.data.data || response.data;
  },

  update: async (id: string, data: Partial<BookingCreateData>) => {
    const response = await apiClient.put(`/bookings/${id}/`, data);
    return response.data.data || response.data;
  },

  createFull: async (data: BookingFullFormData) => {
    const response = await apiClient.post('/bookings/bde-form/', toMultipartPayload(data), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data || response.data;
  },

  updateFull: async (id: string, data: BookingFullFormData) => {
    const response = await apiClient.put(`/bookings/${id}/bde-form/`, toMultipartPayload(data), {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data || response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/bookings/${id}/`);
    return response.data;
  },
};
