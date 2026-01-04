import axios from '../config/axios';
import { User } from '@/types';

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  accessToken?: string;
}

export const authService = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>('/auth/register', data);
    const result = response.data;
    // Map accessToken to token if needed
    if (result.accessToken && !result.token) {
      result.token = result.accessToken;
    }
    return result;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>('/auth/login', data);
    const result = response.data;

    // 🔍 DEBUG LOG: 检查从后端接收到的原始数据
    console.log('🔍 [FRONTEND] Raw response from backend:', {
      user: result.user,
    });

    // Map accessToken to token if needed
    if (result.accessToken && !result.token) {
      result.token = result.accessToken;
    }
    console.info('Login successful', result);
    return result;
  },

  logout: async (): Promise<void> => {
    await axios.post('/auth/logout');
  },

  getCurrentUser: async () => {
    const response = await axios.get('/auth/me');
    console.info('Current user info', response.data);
    return response.data;
  },

  verifyEmail: async (token: string): Promise<void> => {
    await axios.post('/auth/verify-email', { token });
  },

  forgotPassword: async (email: string): Promise<void> => {
    await axios.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await axios.post('/auth/reset-password', { token, newPassword });
  },

  verifyToken: async (token: string) => {
    // Set the token in the authorization header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      // Get current user info to verify the token
      const response = await axios.get('/auth/me');
      console.info('Token verified successfully', response.data);
      return response.data;
    } finally {
      // Clean up the authorization header
      delete axios.defaults.headers.common['Authorization'];
    }
  },
};
