import axios from '../config/axios';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  phone?: string;
}

export interface UpdateProfileDto {
  username?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UserActivity {
  id: string;
  action: string;
  description: string;
  ipAddress?: string;
  createdAt: string;
}

export interface UserNotification {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  createdAt: string;
}

export const userService = {
  updateProfile: async (data: UpdateProfileDto): Promise<UserProfile> => {
    const response = await axios.put('/user/profile', data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordDto): Promise<void> => {
    await axios.post('/user/change-password', data);
  },

  getHistory: async (params?: {
    page: number;
    limit: number;
  }): Promise<{ data: UserActivity[]; total: number }> => {
    const response = await axios.get('/user/history', { params });
    return response.data;
  },

  getNotifications: async (params?: {
    page: number;
    limit: number;
  }): Promise<{ data: UserNotification[]; total: number }> => {
    const response = await axios.get('/user/notifications', { params });
    return response.data;
  },

  markNotificationAsRead: async (id: string): Promise<void> => {
    await axios.put(`/user/notifications/${id}/read`);
  },

  markAllNotificationsAsRead: async (): Promise<void> => {
    await axios.put(`/user/notifications/read-all`);
  },

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
