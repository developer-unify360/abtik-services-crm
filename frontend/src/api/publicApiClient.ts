import axios from 'axios';

const API_BASE_URL = '/api/v1'; // Use relative path for proxy

// Public API client without auth redirect on 401
const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token if available
publicApiClient.interceptors.request.use((config) => {
  const stored = JSON.parse(localStorage.getItem('user') || 'null');
  if (stored) {
    const accessToken = stored?.access || stored?.token || stored?.user?.access;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});

// Response interceptor: don't redirect to login for public endpoints
publicApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // For public endpoints, just reject the error without redirecting
    return Promise.reject(error);
  }
);

export default publicApiClient;
