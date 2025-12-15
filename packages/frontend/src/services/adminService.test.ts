import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from './adminService';
import axios from '../config/axios';

// Mock axios
vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listInviteCodes', () => {
    it('should list invite codes with pagination', async () => {
      const mockResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      };
      (axios.get as any).mockResolvedValueOnce({ data: mockResponse });

      const result = await adminService.listInviteCodes({ page: 1, limit: 10 });

      expect(axios.get).toHaveBeenCalledWith('/admin/invite-codes', {
        params: { page: 1, limit: 10 },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('generateInviteCodes', () => {
    it('should generate invite codes', async () => {
      const mockDto = { type: 'SINGLE' as const, validDays: 7 };
      const mockResponse = [{ code: '123' }];
      (axios.post as any).mockResolvedValueOnce({ data: mockResponse });

      const result = await adminService.generateInviteCodes(mockDto);

      expect(axios.post).toHaveBeenCalledWith('/admin/invite-codes/generate', mockDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteInviteCode', () => {
    it('should delete invite code', async () => {
      const id = '123';
      (axios.delete as any).mockResolvedValueOnce({});

      await adminService.deleteInviteCode(id);

      expect(axios.delete).toHaveBeenCalledWith(`/admin/invite-codes/${id}`);
    });
  });
});
