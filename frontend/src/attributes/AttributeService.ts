import apiClient from '../api/apiClient';

export interface Attribute {
  id: string;
  name: string;
  is_active: boolean;
}

const AttributeService = {
  // Industries
  listIndustries: async (signal?: AbortSignal) => {
    const response = await apiClient.get('/attributes/industries/', { signal });
    // Handle paginated response
    return response.data.results ?? response.data;
  },
  createIndustry: async (data: Partial<Attribute>) => {
    const response = await apiClient.post('/attributes/industries/', data);
    return response.data;
  },
  updateIndustry: async (id: string, data: Partial<Attribute>) => {
    const response = await apiClient.put(`/attributes/industries/${id}/`, data);
    return response.data;
  },
  deleteIndustry: async (id: string) => {
    const response = await apiClient.delete(`/attributes/industries/${id}/`);
    return response.data;
  },

  // Lead Sources
  listLeadSources: async (signal?: AbortSignal) => {
    const response = await apiClient.get('/attributes/lead-sources/', { signal });
    // Handle paginated response
    return response.data.results ?? response.data;
  },
  createLeadSource: async (data: Partial<Attribute>) => {
    const response = await apiClient.post('/attributes/lead-sources/', data);
    return response.data;
  },
  updateLeadSource: async (id: string, data: Partial<Attribute>) => {
    const response = await apiClient.put(`/attributes/lead-sources/${id}/`, data);
    return response.data;
  },
  deleteLeadSource: async (id: string) => {
    const response = await apiClient.delete(`/attributes/lead-sources/${id}/`);
    return response.data;
  },

  // Payment Types
  listPaymentTypes: async (signal?: AbortSignal) => {
    const response = await apiClient.get('/attributes/payment-types/', { signal });
    // Handle paginated response
    return response.data.results ?? response.data;
  },
  createPaymentType: async (data: Partial<Attribute>) => {
    const response = await apiClient.post('/attributes/payment-types/', data);
    return response.data;
  },
  updatePaymentType: async (id: string, data: Partial<Attribute>) => {
    const response = await apiClient.put(`/attributes/payment-types/${id}/`, data);
    return response.data;
  },
  deletePaymentType: async (id: string) => {
    const response = await apiClient.delete(`/attributes/payment-types/${id}/`);
    return response.data;
  },

  listBDEs: async (signal?: AbortSignal) => {
    const response = await apiClient.get('/attributes/bdes/', { signal });
    return response.data.results ?? response.data;
  },
  createBDE: async (data: Partial<Attribute>) => {
    const response = await apiClient.post('/attributes/bdes/', data);
    return response.data;
  },
  updateBDE: async (id: string, data: Partial<Attribute>) => {
    const response = await apiClient.put(`/attributes/bdes/${id}/`, data);
    return response.data;
  },
  deleteBDE: async (id: string) => {
    const response = await apiClient.delete(`/attributes/bdes/${id}/`);
    return response.data;
  },
};

export default AttributeService;
