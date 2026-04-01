import apiClient from '../../api/apiClient';
import publicApiClient from '../../api/publicApiClient';
import { toBrowserAssetUrl } from '../../api/assetUrl';

export interface ServiceCategory {
  id: string;
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
  category?: string | null;
  category_name?: string | null;
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
  category_name?: string | null;
  assigned_to: string | null;
  assigned_user?: {
    id: string;
    name: string;
    email: string;
  };
  status: 'pending' | 'assigned' | 'in_progress' | 'waiting_client' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  note: string;
  promised_timeline: string;
  client_primary_contact: string;
  documents_received: boolean;
  payment_visibility_summary: string;
  handoff_status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  handoff_status_display: string;
  handoff_rejection_reason: string;
  handoff_submitted_at: string | null;
  handoff_reviewed_at: string | null;
  handoff_reviewed_by: string | null;
  handoff_reviewed_by_name?: string | null;
  handoff_is_complete: boolean;
  handoff_missing_fields: string[];
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

export interface ServiceRequestHandoffData {
  note?: string;
  promised_timeline?: string;
  client_primary_contact?: string;
  documents_received?: boolean;
  payment_visibility_summary?: string;
}

export interface ServiceRequestHandoffReviewData {
  decision: 'accepted' | 'rejected';
  rejection_reason?: string;
}

export interface ClientDocumentRequirement {
  id: string;
  label: string;
  description?: string;
  is_required: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClientDocumentSubmission {
  id: string;
  portal: string;
  portal_title?: string;
  client: string;
  client_name?: string;
  company_name?: string;
  requirement: string | null;
  requirement_label?: string | null;
  document_name: string;
  file: string;
  note: string;
  submitted_by_name: string;
  submitted_by_email: string;
  created_at: string;
  updated_at?: string;
}

export interface ClientDocumentPortal {
  id: string;
  client: string;
  client_name: string;
  company_name: string;
  title: string;
  instructions: string;
  token: string;
  is_active: boolean;
  created_by?: string | null;
  created_by_name?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  last_shared_at?: string | null;
  required_documents_count: number;
  submitted_documents_count: number;
  missing_required_documents: string[];
  requirements: ClientDocumentRequirement[];
  submissions: ClientDocumentSubmission[];
  created_at: string;
  updated_at: string;
}

export interface DocumentPortalCreateData {
  client: string;
  title?: string;
  instructions?: string;
  is_active?: boolean;
  requirements: Array<{
    id?: string;
    label: string;
    description?: string;
    is_required?: boolean;
    sort_order?: number;
  }>;
}

const normalizeSubmission = <T extends ClientDocumentSubmission>(submission: T): T => ({
  ...submission,
  file: toBrowserAssetUrl(submission.file),
});

const normalizePortal = <T extends ClientDocumentPortal>(portal: T): T => ({
  ...portal,
  submissions: Array.isArray(portal.submissions)
    ? portal.submissions.map(normalizeSubmission)
    : [],
});

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
    const response = await apiClient.get('/services/', { params });
    const payload = response.data;
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
  list: async (filters?: {
    status?: string;
    assigned_to?: string;
    priority?: string;
    booking_id?: string;
    handoff_status?: string;
    handoff_incomplete?: string;
  }) => {
    const response = await apiClient.get('/service-requests/', { params: filters });
    const payload = response.data;
    return payload.data || payload.results || payload || [];
  },

  deliveryBoard: async (filters?: {
    status?: string;
    priority?: string;
    booking_id?: string;
    handoff_status?: string;
    handoff_incomplete?: string;
  }) => {
    const response = await apiClient.get('/service-requests/delivery-board/', { params: filters });
    const payload = response.data;
    return payload.data || payload.results || payload || [];
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/service-requests/${id}/`);
    return response.data.data || response.data;
  },

  create: async (data: ServiceRequestCreateData) => {
    const response = await apiClient.post('/service-requests/', data);
    return response.data.data || response.data;
  },

  update: async (id: string, data: Partial<ServiceRequestCreateData>) => {
    const response = await apiClient.put(`/service-requests/${id}/`, data);
    return response.data.data || response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/service-requests/${id}/`);
    return response.data.data || response.data;
  },

  assign: async (id: string, data: ServiceRequestAssignData) => {
    const response = await apiClient.put(`/service-requests/${id}/assign/`, data);
    return response.data.data || response.data;
  },

  updateStatus: async (id: string, data: ServiceRequestStatusUpdateData) => {
    const response = await apiClient.patch(`/service-requests/${id}/status/`, data);
    return response.data.data || response.data;
  },

  updateHandoff: async (id: string, data: ServiceRequestHandoffData) => {
    const response = await apiClient.patch(`/service-requests/${id}/handoff/`, data);
    return response.data.data || response.data;
  },

  submitHandoff: async (id: string) => {
    const response = await apiClient.post(`/service-requests/${id}/submit-handoff/`);
    return response.data.data || response.data;
  },

  reviewHandoff: async (id: string, data: ServiceRequestHandoffReviewData) => {
    const response = await apiClient.post(`/service-requests/${id}/review-handoff/`, data);
    return response.data.data || response.data;
  },

  createTask: async (id: string) => {
    const response = await apiClient.post(`/service-requests/${id}/create_task/`);
    return response.data.data?.task || response.data;
  },

  getKanban: async () => {
    const response = await apiClient.get('/service-requests/kanban/');
    return response.data.data;
  },
};

export const DocumentPortalApi = {
  list: async (filters?: { client_id?: string; has_submissions?: string; is_active?: string }) => {
    const response = await apiClient.get('/document-portals/', { params: filters });
    const payload = response.data;
    const data = payload.data || payload.results || payload || [];
    return Array.isArray(data) ? data.map(normalizePortal) : [];
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/document-portals/${id}/`);
    return normalizePortal(response.data.data || response.data);
  },

  save: async (data: DocumentPortalCreateData) => {
    const response = await apiClient.post('/document-portals/', data);
    return normalizePortal(response.data.data || response.data);
  },

  update: async (id: string, data: DocumentPortalCreateData) => {
    const response = await apiClient.put(`/document-portals/${id}/`, data);
    return normalizePortal(response.data.data || response.data);
  },

  markShared: async (id: string) => {
    const response = await apiClient.post(`/document-portals/${id}/mark-shared/`);
    return normalizePortal(response.data.data || response.data);
  },

  publicGet: async (token: string) => {
    const response = await publicApiClient.get(`/document-portals/public/${token}/`);
    return normalizePortal(response.data.data || response.data);
  },

  publicSubmit: async (token: string, data: FormData) => {
    const response = await publicApiClient.post(`/document-portals/public/${token}/submit/`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const payload = response.data.data || response.data;
    return Array.isArray(payload) ? payload.map(normalizeSubmission) : payload;
  },
};

export const DocumentSubmissionApi = {
  list: async (filters?: { client_id?: string; portal_id?: string }) => {
    const response = await apiClient.get('/document-submissions/', { params: filters });
    const payload = response.data;
    const data = payload.data || payload.results || payload || [];
    return Array.isArray(data) ? data.map(normalizeSubmission) : [];
  },
};
