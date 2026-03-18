import { create } from 'zustand';
import { ServiceApi, ServiceCategoryApi } from '../api/ServiceApi';
import type { Service, ServiceCategory, ServiceCreateData, ServiceCategoryCreateData } from '../api/ServiceApi';

interface ServiceState {
  categories: ServiceCategory[];
  services: Service[];
  isLoading: boolean;
  error: string | null;
  
  fetchCategories: () => Promise<void>;
  fetchServices: (categoryId?: string) => Promise<void>;
  
  createCategory: (data: ServiceCategoryCreateData) => Promise<void>;
  updateCategory: (id: string, data: Partial<ServiceCategoryCreateData>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  createService: (data: ServiceCreateData) => Promise<void>;
  updateService: (id: string, data: Partial<ServiceCreateData>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  categories: [],
  services: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await ServiceCategoryApi.list();
      set({ categories: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch categories', isLoading: false });
    }
  },

  fetchServices: async (categoryId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await ServiceApi.list(categoryId);
      set({ services: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch services', isLoading: false });
    }
  },

  createCategory: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await ServiceCategoryApi.create(data);
      await get().fetchCategories();
    } catch (err: any) {
      set({ error: err.message || 'Failed to create category', isLoading: false });
    }
  },

  updateCategory: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await ServiceCategoryApi.update(id, data);
      await get().fetchCategories();
    } catch (err: any) {
      set({ error: err.message || 'Failed to update category', isLoading: false });
    }
  },

  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await ServiceCategoryApi.delete(id);
      await get().fetchCategories();
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete category', isLoading: false });
    }
  },

  createService: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await ServiceApi.create(data);
      await get().fetchServices();
    } catch (err: any) {
      set({ error: err.message || 'Failed to create service', isLoading: false });
    }
  },

  updateService: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await ServiceApi.update(id, data);
      await get().fetchServices();
    } catch (err: any) {
      set({ error: err.message || 'Failed to update service', isLoading: false });
    }
  },

  deleteService: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await ServiceApi.delete(id);
      await get().fetchServices();
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete service', isLoading: false });
    }
  },
}));
