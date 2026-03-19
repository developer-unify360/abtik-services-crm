import apiClient from '../../api/apiClient';

export interface AssignedUser {
  id: string;
  name: string;
  email: string;
}

export interface ServiceRequest {
  id: string;
  tenant: string;
  booking: string;
  booking_details?: any; // Consider typing properly using Booking type
  service: string;
  service_name: string;
  category_name: string | null;
  assigned_to: string | null;
  assigned_user: AssignedUser | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'waiting_client' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestCreateData {
  booking: string;
  service: string;
  priority: string;
}

export const TaskApi = {
  list: async (filters?: Record<string, string>) => {
    const response = await apiClient.get('/service-requests/', { params: filters });
    const payload = response.data;
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

  assign: async (id: string, assignedToId: string) => {
    const response = await apiClient.put(`/service-requests/${id}/assign/`, {
      assigned_to: assignedToId
    });
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/service-requests/${id}/status/`, {
      status
    });
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/service-requests/${id}/`);
    return response.data;
  },
};
