import apiClient from '../api/apiClient';

export interface Tenant {
  id: string;
  name: string;
  industry?: string;
  status: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TenantSettings {
  timezone: string;
  currency: string;
  date_format: string;
  theme: string;
}

export interface TenantCreateData {
  name: string;
  industry?: string;
  status: boolean;
  settings?: Partial<TenantSettings>;
}

export const TenantService = {
  list: async (params?: Record<string, string>) => {
    const response = await apiClient.get('/tenants/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/tenants/${id}/`);
    return response.data;
  },

  create: async (data: TenantCreateData) => {
    const response = await apiClient.post('/tenants/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<TenantCreateData>) => {
    const response = await apiClient.put(`/tenants/${id}/`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/tenants/${id}/`);
    return response.data;
  },
};
