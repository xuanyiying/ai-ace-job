import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from './backup.service';
import { RedisService } from '../redis/redis.service';

/**
 * Unit tests for BackupService
 * Tests backup creation, verification, and restoration
 * Requirement 9.5: Database backup functionality
 */
describe('BackupService', () => {
  let service: BackupService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Backup Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have createDatabaseBackup method', () => {
      expect(service.createDatabaseBackup).toBeDefined();
      expect(typeof service.createDatabaseBackup).toBe('function');
    });

    it('should have verifyBackupIntegrity method', () => {
      expect(service['verifyBackupIntegrity']).toBeDefined();
    });

    it('should have restoreFromBackup method', () => {
      expect(service.restoreFromBackup).toBeDefined();
      expect(typeof service.restoreFromBackup).toBe('function');
    });
  });

  describe('Backup Listing', () => {
    it('should return empty array when no backups exist', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const backups = await service.getBackupList();

      expect(backups).toEqual([]);
      expect(mockRedisService.get).toHaveBeenCalledWith('backup:metadata');
    });

    it('should return sorted backup list', async () => {
      const mockBackups = [
        {
          fileName: 'backup_1.sql',
          size: 1024,
          timestamp: '2024-01-14T01:00:00Z',
          type: 'database',
          verified: true,
        },
        {
          fileName: 'backup_2.sql',
          size: 2048,
          timestamp: '2024-01-15T01:00:00Z',
          type: 'database',
          verified: true,
        },
      ];

      mockRedisService.get.mockResolvedValue(JSON.stringify(mockBackups));

      const backups = await service.getBackupList();

      expect(backups).toHaveLength(2);
      expect(backups[0].fileName).toBe('backup_2.sql'); // Most recent first
      expect(backups[1].fileName).toBe('backup_1.sql');
    });
  });

  describe('Backup Statistics', () => {
    it('should calculate backup statistics correctly', async () => {
      const mockBackups = [
        {
          fileName: 'backup_1.sql',
          size: 1024,
          timestamp: '2024-01-14T01:00:00Z',
          type: 'database',
          verified: true,
        },
        {
          fileName: 'backup_2.sql',
          size: 2048,
          timestamp: '2024-01-15T01:00:00Z',
          type: 'database',
          verified: true,
        },
        {
          fileName: 'backup_3.sql',
          size: 1536,
          timestamp: '2024-01-13T01:00:00Z',
          type: 'database',
          verified: false,
        },
      ];

      mockRedisService.get.mockResolvedValue(JSON.stringify(mockBackups));

      const stats = await service.getBackupStats();

      expect(stats.totalBackups).toBe(3);
      expect(stats.totalSize).toBe(4608); // 1024 + 2048 + 1536
      expect(stats.verifiedBackups).toBe(2);
      expect(stats.newestBackup).toEqual(new Date('2024-01-15T01:00:00Z'));
      expect(stats.oldestBackup).toEqual(new Date('2024-01-13T01:00:00Z'));
    });

    it('should handle empty backup list', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const stats = await service.getBackupStats();

      expect(stats.totalBackups).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.verifiedBackups).toBe(0);
      expect(stats.newestBackup).toBeNull();
      expect(stats.oldestBackup).toBeNull();
    });
  });

  describe('PostgreSQL URL Parsing', () => {
    it('should parse valid PostgreSQL URL', () => {
      const url = 'postgresql://testuser:testpass@localhost:5432/testdb';
      const config = service['parsePostgresUrl'](url);

      expect(config.user).toBe('testuser');
      expect(config.password).toBe('testpass');
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('testdb');
    });

    it('should throw error for invalid URL format', () => {
      const invalidUrl = 'invalid-url';

      expect(() => service['parsePostgresUrl'](invalidUrl)).toThrow(
        'Invalid PostgreSQL connection URL format'
      );
    });
  });

  describe('File Size Formatting', () => {
    it('should format bytes correctly', () => {
      expect(service['formatFileSize'](0)).toBe('0 Bytes');
      expect(service['formatFileSize'](1024)).toBe('1 KB');
      expect(service['formatFileSize'](1048576)).toBe('1 MB');
      expect(service['formatFileSize'](1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(service['formatFileSize'](1536)).toBe('1.5 KB');
      expect(service['formatFileSize'](2621440)).toBe('2.5 MB');
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis errors gracefully when getting backup list', async () => {
      mockRedisService.get.mockRejectedValue(
        new Error('Redis connection failed')
      );

      const backups = await service.getBackupList();

      expect(backups).toEqual([]);
    });

    it('should handle Redis errors gracefully when getting backup stats', async () => {
      mockRedisService.get.mockRejectedValue(
        new Error('Redis connection failed')
      );

      const stats = await service.getBackupStats();

      expect(stats.totalBackups).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.verifiedBackups).toBe(0);
    });
  });

  describe('Backup Metadata', () => {
    it('should store backup metadata in Redis', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');

      const metadata = {
        fileName: 'test_backup.sql',
        filePath: '/backups/test_backup.sql',
        size: 1024,
        timestamp: new Date(),
        type: 'database',
        verified: true,
      };

      await service['storeBackupMetadata'](metadata);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'backup:metadata',
        expect.any(String),
        86400 * 30
      );
    });

    it('should limit stored backups to maxBackups', async () => {
      const existingBackups = Array.from({ length: 35 }, (_, i) => ({
        fileName: `backup_${i}.sql`,
        size: 1024,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
        type: 'database',
        verified: true,
      }));

      mockRedisService.get.mockResolvedValue(JSON.stringify(existingBackups));
      mockRedisService.set.mockResolvedValue('OK');

      const newMetadata = {
        fileName: 'new_backup.sql',
        filePath: '/backups/new_backup.sql',
        size: 2048,
        timestamp: new Date(),
        type: 'database',
        verified: true,
      };

      await service['storeBackupMetadata'](newMetadata);

      const setCall = mockRedisService.set.mock.calls[0];
      const storedBackups = JSON.parse(setCall[1]);

      expect(storedBackups.length).toBeLessThanOrEqual(30);
      expect(storedBackups[0].fileName).toBe('new_backup.sql');
    });
  });
});
