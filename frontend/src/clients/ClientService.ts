import apiClient from '../api/apiClient';

export interface Client {
  id: string;
  client_name: string;
  company_name: string;
  gst_pan?: string;
  email: string;
  mobile: string;
  industry?: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface ClientCreateData {
  client_name: string;
  company_name: string;
  gst_pan?: string;
  email: string;
  mobile: string;
  industry?: string;
}

export const ClientService = {
  list: async (params?: Record<string, string>) => {
    const response = await apiClient.get('/clients/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/clients/${id}/`);
    return response.data;
  },

  create: async (data: ClientCreateData) => {
    const response = await apiClient.post('/clients/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<ClientCreateData>) => {
    const response = await apiClient.put(`/clients/${id}/`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/clients/${id}/`);
    return response.data;
  },
};
