import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

// Create axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// For cases where we need the absolute base URL for direct non-axios uploads (like AntD Upload)
export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || '/api/v1';
};

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => {
    // 🔍 DEBUG LOG: 检查 axios 响应拦截器接收到的数据
    console.log('🔍 [AXIOS INTERCEPTOR] Login response:', {
      url: response.config.url,
      data: response.data,
      status: response.status,
    });

    return response;
  },
  (error) => {
    if (error.response) {
      // Handle specific error codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and auth state
          // Let React Router handle the redirect via ProtectedRoute
          localStorage.removeItem('auth_token');
          useAuthStore.setState({
            user: null,
            token: null,
            isAuthenticated: false,
          });
          break;
        // TODO: TEMPORARY - 403 error handling disabled for testing
        // This should be re-enabled in production
        case 403:
          // Forbidden - quota exceeded or insufficient permissions
          console.error('Access forbidden:', error.response.data);
          break;
        case 429:
          // Rate limit exceeded
          console.error('Rate limit exceeded:', error.response.data);
          break;
        default:
          console.error('API Error:', error.response.data);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
