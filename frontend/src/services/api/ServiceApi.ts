import apiClient from '../../api/apiClient';

export interface ServiceCategory {
  id: string;
  tenant: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategoryCreateData {
  name: string;
  description?: string;
}

export interface Service {
  id: string;
  tenant: string;
  category: string;
  category_name: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCreateData {
  category: string;
  name: string;
  description?: string;
}

export const ServiceCategoryApi = {
  list: async () => {
    const response = await apiClient.get('/service-categories/');
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/service-categories/${id}/`);
    return response.data;
  },

  create: async (data: ServiceCategoryCreateData) => {
    const response = await apiClient.post('/service-categories/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<ServiceCategoryCreateData>) => {
    const response = await apiClient.put(`/service-categories/${id}/`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/service-categories/${id}/`);
    return response.data;
  },
};

export const ServiceApi = {
  list: async (categoryId?: string) => {
    const params = categoryId ? { category_id: categoryId } : {};
    const response = await apiClient.get('/services/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/services/${id}/`);
    return response.data;
  },

  create: async (data: ServiceCreateData) => {
    const response = await apiClient.post('/services/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<ServiceCreateData>) => {
    const response = await apiClient.put(`/services/${id}/`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/services/${id}/`);
    return response.data;
  },
};
