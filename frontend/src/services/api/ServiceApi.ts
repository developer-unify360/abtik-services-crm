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
  category: string | null;
  category_name: string | null;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceCreateData {
  category?: string | null;
  name: string;
  description?: string;
}

export interface ServiceRequest {
  id: string;
  tenant: string;
  booking: string;
  booking_details?: {
    id: string;
    client_name?: string;
    company_name?: string;
    booking_date?: string;
    status?: string;
  };
  service: string;
  service_name: string;
  category_name: string | null;
  assigned_to: string | null;
  assigned_user?: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'assigned' | 'in_progress' | 'waiting_client' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestCreateData {
  booking: string;
  service: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ServiceRequestAssignData {
  assigned_to: string;
}

export interface ServiceRequestStatusUpdateData {
  status: 'pending' | 'assigned' | 'in_progress' | 'waiting_client' | 'completed' | 'closed';
}

export const ServiceCategoryApi = {
  list: async () => {
    const response = await apiClient.get('/service-categories/');
    // Handle Django REST Framework paginated response
    return response.data.results || response.data;
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
    console.log('ServiceApi.list params:', params);
    const response = await apiClient.get('/services/', { params });
    console.log('ServiceApi.list response:', response);
    const payload = response.data;
    console.log('ServiceApi.list response payload:', payload);
    return payload.data || payload.results || payload || [];
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

// Service Request API
export const ServiceRequestApi = {
  list: async (filters?: { status?: string; assigned_to?: string; priority?: string; booking_id?: string }) => {
    const response = await apiClient.get('/service-requests/', { params: filters });
    const payload = response.data;
    // Handle new envelope from view: { success, data, message }
    return payload.data || payload.results || payload || [];
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/service-requests/${id}/`);
    return response.data;
  },

  create: async (data: ServiceRequestCreateData) => {
    const response = await apiClient.post('/service-requests/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<ServiceRequestCreateData>) => {
    const response = await apiClient.put(`/service-requests/${id}/`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/service-requests/${id}/`);
    return response.data;
  },

  assign: async (id: string, data: ServiceRequestAssignData) => {
    const response = await apiClient.put(`/service-requests/${id}/assign/`, data);
    return response.data;
  },

  updateStatus: async (id: string, data: ServiceRequestStatusUpdateData) => {
    const response = await apiClient.patch(`/service-requests/${id}/status/`, data);
    return response.data;
  },

  createTask: async (id: string) => {
    const response = await apiClient.post(`/service-requests/${id}/create_task/`);
    // normalize output
    return response.data.data?.task || response.data;
  },
};
