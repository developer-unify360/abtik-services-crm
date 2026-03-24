import apiClient from '../api/apiClient';
import publicApiClient from '../api/publicApiClient';

export interface Lead {
  id: string;
  client: string | null;
  client_info?: {
    id: string | null;
    client_name: string;
    company_name: string;
    email: string;
    mobile: string;
    industry: string | null;
    industry_name: string | null;
  };
  client_name?: string;
  company_name?: string;
  email?: string;
  mobile?: string;
  industry?: string | null;
  industry_name?: string;
  source: string | null;
  source_name?: string;
  service?: string | null;
  service_name?: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  lead_score: number;
  assigned_to?: string | null;
  assigned_to_name?: string;
  bde_name?: string;
  notes?: string;
  last_contacted_at?: string | null;
  next_follow_up_date?: string | null;
  activities: LeadActivity[];
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead: string;
  activity_type: string;
  description: string;
  performed_by?: string;
  performed_by_name?: string;
  created_at: string;
}

export interface LeadSummary {
  total_leads: number;
  new_leads: number;
  qualified_leads: number;
  closed_won: number;
  conversion_rate: number;
  stats_by_source: Record<string, number>;
}

export const LeadService = {
  list: async (params?: Record<string, string>) => {
    const response = await apiClient.get('/leads/', { params });
    return response.data;
  },

  listForDropdown: async (search?: string) => {
    const params: Record<string, string> = {};
    if (search) {
      params.search = search;
    }
    // Get all leads, limit to 100 for dropdown performance
    params.limit = '100';
    const response = await publicApiClient.get('/leads/', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/leads/${id}/`);
    return response.data;
  },

  updateStatus: async (id: string, data: { status: string; notes?: string }) => {
    const response = await apiClient.post(`/leads/${id}/update-status/`, data);
    return response.data;
  },

  logActivity: async (id: string, data: { activity_type: string; description: string }) => {
    const response = await apiClient.post(`/leads/${id}/log-activity/`, data);
    return response.data;
  },

  getSummary: async () => {
    const response = await apiClient.get('/leads/summary/');
    return response.data;
  },

  update: async (id: string, data: Partial<Lead>) => {
    const response = await apiClient.patch(`/leads/${id}/`, data);
    return response.data;
  },

  convert: async (id: string) => {
    const response = await apiClient.post(`/leads/${id}/convert/`);
    return response.data;
  }
};
