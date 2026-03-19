import axios from 'axios';
import { getEffectiveTenantId, getStoredAuthData } from '../auth/tenantSelection';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token and tenant ID
apiClient.interceptors.request.use((config) => {
  const auth = getStoredAuthData();
  console.log("AUTH:", auth);
  if (auth) {
    const accessToken = auth?.access || auth?.token || (auth?.user && auth.user.access);
    console.log("ACCESS TOKEN:", accessToken);
    const tenantId = getEffectiveTenantId(auth);

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    if (tenantId) {
      config.headers['Tenant-ID'] = tenantId;
    }
  }
  return config;
});

// Response interceptor: handle 401 (token expired)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
