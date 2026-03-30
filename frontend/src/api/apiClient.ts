import axios from 'axios';
import { toastError } from '../services/toastNotify';

const API_BASE_URL = '/api/v1'; // Use relative path for proxy

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use((config) => {
  const stored = JSON.parse(localStorage.getItem('user') || 'null');
  if (stored) {
    const accessToken = stored?.access || stored?.token || stored?.user?.access;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});

// Response interceptor: handle 401 (token expired) and global error toasts
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401: Unauthorized - Redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 403: Forbidden - Show forbidden message
    if (error.response?.status === 403) {
      toastError('You do not have permission to perform this action.');
      return Promise.reject(error);
    }

    // 400, 404, 500, etc. - Show beautiful toast if it's not a background fetch
    // We only toast for non-GET requests or if explicitly needed? 
    // Usually, we want to toast for any error that isn't handled by the page.
    // If a page handles it (e.g. in a catch block), it might still toast.
    // Let's only toast for mutations (POST, PUT, DELETE, PATCH) or if it's a 400.
    const method = error.config?.method?.toUpperCase();
    if (method !== 'GET' || error.response?.status === 400) {
      toastError(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
