import apiClient from '../api/apiClient';

export interface Payment {
  id: string;
  booking?: string | null;
  booking_id?: string | null;
  booking_client_name?: string | null;
  client?: string | null;
  client_name: string;
  company_name: string;
  gst_pan?: string;
  email?: string;
  mobile?: string;
  source: 'booking' | 'manual';
  source_display: string;
  payment_type?: string | null;
  payment_type_name?: string | null;
  bank?: string | null;
  bank_name?: string | null;
  reference_number?: string;
  payment_date?: string | null;
  total_payment_amount?: string | null;
  total_payment_remarks?: string;
  received_amount?: string | null;
  received_amount_remarks?: string;
  remaining_amount?: string | null;
  remaining_amount_remarks?: string;
  after_fund_disbursement_percentage?: string | null;
  after_fund_disbursement_remarks?: string;
  attachment_url?: string | null;
  remarks?: string;
  is_editable: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PaymentCreateData {
  client_id?: string | null;
  client_name: string;
  company_name: string;
  gst_pan?: string;
  email?: string;
  mobile?: string;
  payment_type?: string | null;
  bank?: string | null;
  reference_number?: string;
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
  attachment?: File | null;
  remove_attachment?: boolean;
}

const toMultipartPayload = (data: PaymentCreateData) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (value instanceof File) {
      formData.append(key, value);
      return;
    }

    if (value === null) {
      formData.append(key, '');
      return;
    }

    formData.append(key, String(value));
  });

  return formData;
};

const buildRequestConfig = (data: PaymentCreateData) => {
  if (!data.attachment) {
    return {
      payload: data,
      config: undefined,
    };
  }

  return {
    payload: toMultipartPayload(data),
    config: {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  };
};

export const PaymentService = {
  list: async (params?: Record<string, string>) => {
    const response = await apiClient.get('/payments/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/payments/${id}/`);
    return response.data.data || response.data;
  },

  create: async (data: PaymentCreateData) => {
    const request = buildRequestConfig(data);
    const response = await apiClient.post('/payments/', request.payload, request.config);
    return response.data.data || response.data;
  },

  update: async (id: string, data: PaymentCreateData) => {
    const request = buildRequestConfig(data);
    const response = await apiClient.put(`/payments/${id}/`, request.payload, request.config);
    return response.data.data || response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/payments/${id}/`);
    return response.data;
  },
};
