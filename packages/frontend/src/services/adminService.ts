import axios from '../config/axios';

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
  count?: number; // For batch generation
  validDays?: number; // Validity period in days
}

export interface InviteCodeListResponse {
  data: InviteCode[];
  total: number;
  page: number;
  limit: number;
}

export const adminService = {
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
  generateInviteCodes: async (data: CreateInviteCodeDto): Promise<InviteCode[]> => {
    const response = await axios.post('/admin/invite-codes/generate', data);
    return response.data;
  },

  /**
   * Revoke/Delete an invitation code
   */
  deleteInviteCode: async (id: string): Promise<void> => {
    await axios.delete(`/admin/invite-codes/${id}`);
  },
};
