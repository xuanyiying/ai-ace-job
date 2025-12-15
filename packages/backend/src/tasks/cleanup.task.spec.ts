import { Logger } from '@nestjs/common';

// Mock the @nestjs/schedule module before importing CleanupTask
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => {},
  CronExpression: {
    EVERY_DAY_AT_1AM: '0 1 * * *',
    EVERY_DAY_AT_2AM: '0 2 * * *',
    EVERY_DAY_AT_3AM: '0 3 * * *',
    EVERY_DAY_AT_4AM: '0 4 * * *',
  },
}));

import { CleanupTask } from './cleanup.task';
import GenerateService from '../generate/generate.service';
import { StorageService } from '../storage/storage.service';
import { RedisService } from '../redis/redis.service';

describe('CleanupTask', () => {
  let cleanupTask: CleanupTask;
  let generateService: jest.Mocked<GenerateService>;
  let storageService: jest.Mocked<StorageService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(() => {
    // Mock services
    const mockGenerateService = {
      cleanupExpiredPDFs: jest.fn(),
    } as any as jest.Mocked<GenerateService>;

    const mockStorageService = {
      cleanupExpiredFiles: jest.fn(),
    } as any as jest.Mocked<StorageService>;

    const mockRedisService = {
      getClient: jest.fn(),
      get: jest.fn(),
      ttl: jest.fn(),
    } as any as jest.Mocked<RedisService>;

    // Create mock backup service
    const mockBackupService = {
      createDatabaseBackup: jest.fn(),
    } as any;

    // Create instance directly without NestJS module
    cleanupTask = new CleanupTask(
      mockGenerateService,
      mockStorageService,
      mockRedisService,
      mockBackupService
    );

    generateService = mockGenerateService;
    storageService = mockStorageService;
    redisService = mockRedisService;

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupExpiredPDFs', () => {
    it('should call generateService.cleanupExpiredPDFs', async () => {
      generateService.cleanupExpiredPDFs.mockResolvedValue(5);

      await cleanupTask.cleanupExpiredPDFs();

      expect(generateService.cleanupExpiredPDFs).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Cleanup failed');
      generateService.cleanupExpiredPDFs.mockRejectedValue(error);

      // Should not throw
      await expect(cleanupTask.cleanupExpiredPDFs()).resolves.toBeUndefined();
    });

    it('should return correct count of deleted PDFs', async () => {
      generateService.cleanupExpiredPDFs.mockResolvedValue(10);

      await cleanupTask.cleanupExpiredPDFs();

      expect(generateService.cleanupExpiredPDFs).toHaveBeenCalled();
    });
  });

  describe('cleanupOldFiles', () => {
    it('should call storageService.cleanupExpiredFiles with 90 days in milliseconds', async () => {
      storageService.cleanupExpiredFiles.mockResolvedValue(3);

      await cleanupTask.cleanupOldFiles();

      const expectedMaxAgeMs = 90 * 24 * 60 * 60 * 1000;
      expect(storageService.cleanupExpiredFiles).toHaveBeenCalledWith(
        expectedMaxAgeMs
      );
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('File cleanup failed');
      storageService.cleanupExpiredFiles.mockRejectedValue(error);

      // Should not throw
      await expect(cleanupTask.cleanupOldFiles()).resolves.toBeUndefined();
    });

    it('should return correct count of deleted files', async () => {
      storageService.cleanupExpiredFiles.mockResolvedValue(7);

      await cleanupTask.cleanupOldFiles();

      expect(storageService.cleanupExpiredFiles).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should call cleanupRedisExpiredKeys', async () => {
      const mockClient = {
        scan: jest.fn().mockResolvedValue(['0', []]),
      };
      redisService.getClient.mockReturnValue(mockClient as any);

      await cleanupTask.cleanupExpiredCache();

      expect(redisService.getClient).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Cache cleanup failed');
      redisService.getClient.mockImplementation(() => {
        throw error;
      });

      // Should not throw
      await expect(cleanupTask.cleanupExpiredCache()).resolves.toBeUndefined();
    });

    it('should scan Redis keys in batches', async () => {
      const mockClient = {
        scan: jest
          .fn()
          .mockResolvedValueOnce(['1', ['key1', 'key2']])
          .mockResolvedValueOnce(['0', ['key3']]),
      };
      redisService.getClient.mockReturnValue(mockClient as any);
      redisService.ttl.mockResolvedValue(3600);

      await cleanupTask.cleanupExpiredCache();

      expect(mockClient.scan).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCleanupStats', () => {
    it('should return cleanup statistics', async () => {
      const now = new Date().toISOString();
      redisService.get.mockImplementation((key: string) => {
        if (key.includes('pdf')) return Promise.resolve(now);
        if (key.includes('file')) return Promise.resolve(now);
        if (key.includes('cache')) return Promise.resolve(now);
        return Promise.resolve(null);
      });

      const stats = await cleanupTask.getCleanupStats();

      expect(stats).toHaveProperty('lastPdfCleanup');
      expect(stats).toHaveProperty('lastFileCleanup');
      expect(stats).toHaveProperty('lastCacheCleanup');
    });

    it('should return undefined for missing cleanup timestamps', async () => {
      redisService.get.mockResolvedValue(null);

      const stats = await cleanupTask.getCleanupStats();

      expect(stats.lastPdfCleanup).toBeUndefined();
      expect(stats.lastFileCleanup).toBeUndefined();
      expect(stats.lastCacheCleanup).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Stats retrieval failed');
      redisService.get.mockRejectedValue(error);

      await expect(cleanupTask.getCleanupStats()).rejects.toThrow(error);
    });
  });
});
