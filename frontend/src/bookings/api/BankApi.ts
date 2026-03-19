import apiClient from '../../api/apiClient';

export interface Bank {
  id: string;
  bank_name: string;
  account_number: string;
  branch_name: string;
  ifsc_code: string;
  account_holder_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const BankApi = {
  list: async () => {
    const response = await apiClient.get('/bookings/bank/');
    return response.data.results || response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/bookings/bank/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Bank>) => {
    const response = await apiClient.post('/bookings/bank/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Bank>) => {
    const response = await apiClient.put(`/bookings/bank/${id}/`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/bookings/bank/${id}/`);
    return response.data;
  },
};
