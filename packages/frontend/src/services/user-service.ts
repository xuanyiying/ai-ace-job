import axios from '../config/axios';
import { User } from '@/types';

/**
 * User profile details
 */
export interface UserProfile extends User {}

/**
 * Data required to update a user profile
 */
export interface UpdateProfileDto {
  username?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
}

/**
 * Data required to change a user password
 */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/**
 * User activity log entry
 */
export interface UserActivity {
  id: string;
  action: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
}

/**
 * User notification entry
 */
export interface UserNotification {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  createdAt: string;
}

/**
 * Service for managing user-specific data and account settings
 */
export const userService = {
  /**
   * Update the current user's profile information
   * @param data - The update data
   * @returns Updated user profile
   */
  updateProfile: async (data: UpdateProfileDto): Promise<UserProfile> => {
    const response = await axios.put<UserProfile>('/user/profile', data);
    return response.data;
  },

  /**
   * Change the current user's password
   * @param data - Current and new passwords
   */
  changePassword: async (data: ChangePasswordDto): Promise<void> => {
    await axios.post('/user/change-password', data);
  },

  /**
   * Get the current user's activity history with pagination
   * @param params - Pagination parameters
   * @returns Paginated activity list
   */
  getHistory: async (params?: {
    page: number;
    limit: number;
  }): Promise<{ data: UserActivity[]; total: number }> => {
    const response = await axios.get('/user/history', { params });
    return response.data;
  },

  /**
   * Get notifications for the current user with pagination
   * @param params - Pagination parameters
   * @returns Paginated notification list
   */
  getNotifications: async (params?: {
    page: number;
    limit: number;
  }): Promise<{ data: UserNotification[]; total: number }> => {
    const response = await axios.get('/user/notifications', { params });
    return response.data;
  },

  /**
   * Mark a specific notification as read
   * @param id - The ID of the notification
   */
  markNotificationAsRead: async (id: string): Promise<void> => {
    await axios.put(`/user/notifications/${id}/read`);
  },

  /**
   * Mark all notifications as read for the current user
   */
  markAllNotificationsAsRead: async (): Promise<void> => {
    await axios.put(`/user/notifications/read-all`);
  },

  /**
   * Upload a new avatar image for the user
   * @param file - The image file
   * @returns The URL of the uploaded avatar
   */
  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', 'IMAGE');
    formData.append('category', 'avatar');

    const response = await axios.post<{ url: string }>(
      '/storage/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.url;
  },
};
