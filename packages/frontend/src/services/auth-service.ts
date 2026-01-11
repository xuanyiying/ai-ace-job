import axios from '../config/axios';
import { User } from '@/types';

/**
 * Data required for user registration
 */
export interface RegisterData {
  email: string;
  password: string;
  username?: string;
}

/**
 * Data required for user login
 */
export interface LoginData {
  email: string;
  password: string;
  remember?: boolean;
}

/**
 * Authentication response containing user info and token
 */
export interface AuthResponse {
  user: User;
  token?: string;
  accessToken?: string;
}

/**
 * Service for handling authentication-related operations
 */
export const authService = {
  /**
   * Register a new user
   * @param data - Registration details
   * @returns Authentication response with user and token
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>('/auth/register', data);
    const result = response.data;
    // Map accessToken to token if needed
    if (result.accessToken && !result.token) {
      result.token = result.accessToken;
    }
    return result;
  },

  /**
   * Login an existing user
   * @param data - Login credentials
   * @returns Authentication response with user and token
   */
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

  /**
   * Logout the current user
   */
  logout: async (): Promise<void> => {
    await axios.post('/auth/logout');
  },

  /**
   * Get the current authenticated user's profile
   * @returns Current user details
   */
  getCurrentUser: async () => {
    const response = await axios.get('/auth/me');
    console.info('Current user info', response.data);
    return response.data;
  },

  /**
   * Verify a user's email with a token
   * @param token - Email verification token
   */
  verifyEmail: async (token: string): Promise<void> => {
    await axios.post('/auth/verify-email', { token });
  },

  /**
   * Request a password reset email
   * @param email - User's email address
   */
  forgotPassword: async (email: string): Promise<void> => {
    await axios.post('/auth/forgot-password', { email });
  },

  /**
   * Reset password using a reset token
   * @param token - Password reset token
   * @param newPassword - New password to set
   */
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await axios.post('/auth/reset-password', { token, newPassword });
  },

  /**
   * Verify a JWT token by fetching the user profile
   * @param token - JWT token to verify
   * @returns User profile if token is valid
   */
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
