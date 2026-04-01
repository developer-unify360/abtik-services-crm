import apiClient from '../api/apiClient';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  role_display?: string;
  status: boolean;
  is_superuser?: boolean;
  created_at: string;
}

export interface UserCreateData {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  password?: string;
}

export const UserService = {
  list: async (params?: Record<string, string>) => {
    const response = await apiClient.get('/users/', { params });
    return response.data;
  },

  publicList: async () => {
    const response = await apiClient.get('/users/public/');
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/users/${id}/`);
    return response.data;
  },

  create: async (data: UserCreateData) => {
    const response = await apiClient.post('/users/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<UserCreateData>) => {
    const response = await apiClient.patch(`/users/${id}/`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}/`);
    return response.data;
  },
};
