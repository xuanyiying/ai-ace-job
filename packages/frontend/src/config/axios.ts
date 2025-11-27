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
