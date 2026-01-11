import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from './user-service';
import axios from '../config/axios';

// Mock axios
vi.mock('../config/axios', () => ({
  default: {
    put: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadAvatar', () => {
    it('should upload avatar and return url', async () => {
      const mockFile = new File(['avatar content'], 'avatar.png', {
        type: 'image/png',
      });
      const mockUrl = 'https://example.com/avatar.png';

      (axios.post as any).mockResolvedValueOnce({ data: { url: mockUrl } });

      const result = await userService.uploadAvatar(mockFile);

      expect(axios.post).toHaveBeenCalledWith(
        '/upload/avatar',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result).toBe(mockUrl);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should call api to mark notification as read', async () => {
      const notificationId = '123';
      (axios.put as any).mockResolvedValueOnce({});

      await userService.markNotificationAsRead(notificationId);

      expect(axios.put).toHaveBeenCalledWith(
        `/user/notifications/${notificationId}/read`
      );
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should call api to mark all notifications as read', async () => {
      (axios.put as any).mockResolvedValueOnce({});

      await userService.markAllNotificationsAsRead();

      expect(axios.put).toHaveBeenCalledWith('/user/notifications/read-all');
    });
  });
});
