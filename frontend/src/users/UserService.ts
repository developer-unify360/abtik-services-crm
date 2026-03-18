import apiClient from '../api/apiClient';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;  // Now stores role name (e.g., 'BDE', 'Admin')
  role_name: string;
  status: boolean;
  created_at: string;
}

export interface UserCreateData {
  name: string;
  email: string;
  phone?: string;
  role: string;  // Role name like 'BDE', 'Admin', etc.
  role_name: string;
  password?: string;
}

export const UserService = {
  list: async (params?: Record<string, string>) => {
    const response = await apiClient.get('/users/', { params });
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

// Role service for fetching roles
export interface Role {
  id: string;
  name: string;
  description?: string;
}

export const RoleService = {
  list: async () => {
    const response = await apiClient.get('/roles/');
    return response.data as Role[];
  },
};
