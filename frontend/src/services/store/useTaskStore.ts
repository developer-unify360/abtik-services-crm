import { create } from 'zustand';
import { TaskApi } from '../api/TaskApi';
import type { ServiceRequest, ServiceRequestCreateData } from '../api/TaskApi';

interface TaskState {
  tasks: ServiceRequest[];
  isLoading: boolean;
  error: string | null;
  
  fetchTasks: (filters?: Record<string, string>) => Promise<void>;
  createTask: (data: ServiceRequestCreateData) => Promise<void>;
  assignTask: (id: string, userId: string) => Promise<void>;
  updateTaskStatus: (id: string, status: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = await TaskApi.list(filters);
      // Backend returns drf paginated response sometimes if configured, 
      // but based on API spec it might be direct data or results: []
      set({ tasks: Array.isArray(data) ? data : (data.results || []), isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch tasks', isLoading: false });
    }
  },

  createTask: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await TaskApi.create(data);
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || 'Failed to create task', isLoading: false });
    }
  },

  assignTask: async (id, userId) => {
    set({ isLoading: true, error: null });
    try {
      await TaskApi.assign(id, userId);
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || 'Failed to assign task', isLoading: false });
    }
  },

  updateTaskStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      await TaskApi.updateStatus(id, status);
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || 'Failed to update task status', isLoading: false });
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await TaskApi.delete(id);
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete task', isLoading: false });
    }
  },
}));
