import axios from '../config/axios';

// Invite Code Types
export interface InviteCode {
  id: string;
  code: string;
  type: 'SINGLE' | 'BATCH';
  status: 'UNUSED' | 'USED' | 'EXPIRED';
  validUntil?: string;
  createdAt: string;
  usedBy?: string;
  usedAt?: string;
}

export interface CreateInviteCodeDto {
  type: 'SINGLE' | 'BATCH';
  count?: number;
  validDays?: number;
}

export interface InviteCodeListResponse {
  data: InviteCode[];
  total: number;
  page: number;
  limit: number;
}

// User Management Types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'DISABLED';
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  role?: 'ADMIN' | 'USER';
  status?: 'ACTIVE' | 'DISABLED';
}

// System Settings Types
export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  requireInviteCode: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword?: string;
  fromEmail: string;
  fromName: string;
}

export const adminService = {
  // ==================== Invite Codes ====================

  /**
   * List all invitation codes
   */
  listInviteCodes: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<InviteCodeListResponse> => {
    const response = await axios.get('/admin/invite-codes', { params });
    return response.data;
  },

  /**
   * Generate invitation codes
   */
  generateInviteCodes: async (
    data: CreateInviteCodeDto
  ): Promise<InviteCode[]> => {
    const response = await axios.post('/admin/invite-codes/generate', data);
    return response.data;
  },

  /**
   * Revoke/Delete an invitation code
   */
  deleteInviteCode: async (id: string): Promise<void> => {
    await axios.delete(`/admin/invite-codes/${id}`);
  },

  // ==================== User Management ====================

  /**
   * Get all users with pagination
   */
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<UserListResponse> => {
    const response = await axios.get('/admin/users', { params });
    return response.data;
  },

  /**
   * Get a single user by ID
   */
  getUser: async (id: string): Promise<User> => {
    const response = await axios.get(`/admin/users/${id}`);
    return response.data;
  },

  /**
   * Update a user
   */
  updateUser: async (id: string, data: UpdateUserDto): Promise<User> => {
    const response = await axios.patch(`/admin/users/${id}`, data);
    return response.data;
  },

  /**
   * Delete a user
   */
  deleteUser: async (id: string): Promise<void> => {
    await axios.delete(`/admin/users/${id}`);
  },

  /**
   * Enable a user
   */
  enableUser: async (id: string): Promise<User> => {
    const response = await axios.patch(`/admin/users/${id}`, {
      status: 'ACTIVE',
    });
    return response.data;
  },

  /**
   * Disable a user
   */
  disableUser: async (id: string): Promise<User> => {
    const response = await axios.patch(`/admin/users/${id}`, {
      status: 'DISABLED',
    });
    return response.data;
  },

  // ==================== System Settings ====================

  /**
   * Get system settings
   */
  getSystemSettings: async (): Promise<SystemSettings> => {
    const response = await axios.get('/admin/settings');
    return response.data;
  },

  /**
   * Update system settings
   */
  updateSystemSettings: async (
    data: Partial<SystemSettings>
  ): Promise<SystemSettings> => {
    const response = await axios.patch('/admin/settings', data);
    return response.data;
  },
};
