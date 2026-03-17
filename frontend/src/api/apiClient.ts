import axios from 'axios';

const API_BASE_URL = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token and tenant ID
apiClient.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const auth = JSON.parse(userStr);
    const accessToken = auth?.access || auth?.token || (auth?.user && auth.user.access);
    const tenantId = auth?.tenant_id || auth?.user?.tenant_id || auth?.user?.tenant;

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
