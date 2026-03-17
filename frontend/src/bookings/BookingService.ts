import apiClient from '../api/apiClient';

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
  payment_date?: string;
  remarks?: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at?: string;
}

export interface BookingCreateData {
  client_id: string;
  payment_type: string;
  bank_account?: string;
  booking_date: string;
  payment_date?: string;
  remarks?: string;
  status?: string;
}

export const BookingService = {
  list: async (params?: Record<string, string>) => {
    const response = await apiClient.get('/bookings/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/bookings/${id}/`);
    return response.data;
  },

  create: async (data: BookingCreateData) => {
    const response = await apiClient.post('/bookings/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<BookingCreateData>) => {
    const response = await apiClient.put(`/bookings/${id}/`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/bookings/${id}/`);
    return response.data;
  },
};
