import { Test, TestingModule } from '@nestjs/testing';
import { SecurityService } from './security.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ForbiddenException } from '@nestjs/common';

/**
 * Security Service Tests
 * Tests for API key encryption, key rotation, access control, and audit logging
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 * Properties: 64, 65, 66, 67, 68, 69
 */

describe('SecurityService', () => {
  let service: SecurityService;
  let prismaService: PrismaService;
  let mockLogger: any;

  beforeEach(async () => {
    // Set encryption key for testing
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-testing-purposes';

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityService,
        {
          provide: PrismaService,
          useValue: {
            modelConfig: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('API Key Encryption', () => {
    it('should encrypt and decrypt API keys correctly', () => {
      // Property 64: API keys should be encrypted
      const apiKey = 'sk-test-api-key-12345';
      const encrypted = service.encryptAPIKey(apiKey);

      expect(encrypted).not.toBe(apiKey);
      expect(encrypted).toContain(':');

      const decrypted = service.decryptAPIKey(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it('should produce different encrypted values for the same key', () => {
      // Property 64: Each encryption should use a unique IV
      const apiKey = 'sk-test-api-key-12345';
      const encrypted1 = service.encryptAPIKey(apiKey);
      const encrypted2 = service.encryptAPIKey(apiKey);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = service.decryptAPIKey(encrypted1);
      const decrypted2 = service.decryptAPIKey(encrypted2);

      expect(decrypted1).toBe(apiKey);
      expect(decrypted2).toBe(apiKey);
    });

    it('should hash API keys consistently', () => {
      const apiKey = 'sk-test-api-key-12345';
      const hash1 = service.hashAPIKey(apiKey);
      const hash2 = service.hashAPIKey(apiKey);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });
  });

  describe('API Key Rotation', () => {
    it('should rotate API key successfully', async () => {
      // Property 66: API keys should support rotation
      const modelId = 'model-123';
      const oldKey = 'sk-old-key-12345';
      const newKey = 'sk-new-key-67890';
      const rotatedBy = 'admin-user';
      const reason = 'Scheduled rotation';

      const mockModelConfig = {
        id: modelId,
        name: 'test-model',
        provider: 'openai',
        apiKey: oldKey,
      };

      (prismaService.modelConfig.findUnique as jest.Mock).mockResolvedValue(
        mockModelConfig
      );
      (prismaService.modelConfig.update as jest.Mock).mockResolvedValue({
        ...mockModelConfig,
        apiKey: service.encryptAPIKey(newKey),
      });
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

      await service.rotateAPIKey(modelId, newKey, rotatedBy, reason);

      expect(prismaService.modelConfig.findUnique).toHaveBeenCalledWith({
        where: { id: modelId },
      });

      expect(prismaService.modelConfig.update).toHaveBeenCalled();
      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should throw error if model config not found', async () => {
      const modelId = 'non-existent-model';
      const newKey = 'sk-new-key-67890';

      (prismaService.modelConfig.findUnique as jest.Mock).mockResolvedValue(
        null
      );

      await expect(
        service.rotateAPIKey(modelId, newKey, 'admin', 'test')
      ).rejects.toThrow();
    });
  });

  describe('User Access Control', () => {
    it('should grant user access to model', async () => {
      // Property 67: User access control should be enforced
      const userId = 'user-123';
      const modelId = 'model-456';
      const grantedBy = 'admin-user';

      const mockModelConfig = {
        id: modelId,
        name: 'test-model',
        provider: 'openai',
      };

      (prismaService.modelConfig.findUnique as jest.Mock).mockResolvedValue(
        mockModelConfig
      );
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

      await service.grantUserAccess(userId, modelId, grantedBy);

      expect(prismaService.modelConfig.findUnique).toHaveBeenCalledWith({
        where: { id: modelId },
      });
      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should revoke user access to model', async () => {
      // Property 67: User access control should be enforced
      const userId = 'user-123';
      const modelId = 'model-456';
      const revokedBy = 'admin-user';

      const mockModelConfig = {
        id: modelId,
        name: 'test-model',
        provider: 'openai',
      };

      (prismaService.modelConfig.findUnique as jest.Mock).mockResolvedValue(
        mockModelConfig
      );
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

      // First grant access
      await service.grantUserAccess(userId, modelId, 'admin');

      // Then revoke it
      await service.revokeUserAccess(userId, modelId, revokedBy);

      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should check user access correctly', async () => {
      // Property 67: User access control should be enforced
      const userId = 'user-123';
      const modelId = 'model-456';

      const mockModelConfig = {
        id: modelId,
        name: 'test-model',
        provider: 'openai',
      };

      (prismaService.modelConfig.findUnique as jest.Mock).mockResolvedValue(
        mockModelConfig
      );
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

      // Initially no access
      let hasAccess = await service.checkUserAccess(userId, modelId);
      expect(hasAccess).toBe(false);

      // Grant access
      await service.grantUserAccess(userId, modelId, 'admin');

      // Now should have access
      hasAccess = await service.checkUserAccess(userId, modelId);
      expect(hasAccess).toBe(true);
    });

    it('should enforce access control and throw on unauthorized access', async () => {
      // Property 68: Unauthorized access should be denied
      const userId = 'user-123';
      const modelId = 'model-456';

      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

      await expect(service.enforceAccess(userId, modelId)).rejects.toThrow(
        ForbiddenException
      );

      expect(prismaService.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('Audit Logging', () => {
    it('should log audit events', async () => {
      // Property 69: Audit logs should record all API key operations
      const event = {
        action: 'API_KEY_ROTATED',
        resource: 'ModelConfig:model-123',
        userId: 'admin-user',
        details: {
          reason: 'Scheduled rotation',
        },
      };

      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({});

      await service.logAuditEvent(event);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: event.action,
          resource: event.resource,
          userId: event.userId,
          details: event.details,
        }),
      });
    });

    it('should query audit logs', async () => {
      // Property 69: Audit logs should be queryable
      const mockLogs = [
        {
          id: 'log-1',
          action: 'API_KEY_ROTATED',
          resource: 'ModelConfig:model-123',
          userId: 'admin-user',
          details: {},
          timestamp: new Date(),
        },
      ];

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs
      );

      const logs = await service.queryAuditLogs('API_KEY_ROTATED');

      expect(prismaService.auditLog.findMany).toHaveBeenCalled();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('API_KEY_ROTATED');
    });

    it('should get audit log statistics', async () => {
      // Property 69: Audit logs should provide statistics
      const mockLogs = [
        {
          id: 'log-1',
          action: 'API_KEY_ROTATED',
          resource: 'ModelConfig:model-123',
          userId: 'admin-user',
          details: {},
          timestamp: new Date(),
        },
        {
          id: 'log-2',
          action: 'USER_ACCESS_GRANTED',
          resource: 'User:user-123',
          userId: 'admin-user',
          details: {},
          timestamp: new Date(),
        },
      ];

      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs
      );

      const stats = await service.getAuditLogStatistics();

      expect(stats.totalEvents).toBe(2);
      expect(stats.eventsByAction['API_KEY_ROTATED']).toBe(1);
      expect(stats.eventsByAction['USER_ACCESS_GRANTED']).toBe(1);
    });
  });

  describe('Sensitive Data Sanitization', () => {
    it('should sanitize sensitive fields', () => {
      // Property 65: Sensitive information should not be logged
      const data = {
        apiKey: 'sk-secret-key',
        password: 'secret-password',
        token: 'secret-token',
        normalField: 'normal-value',
      };

      const sanitized = service.sanitizeSensitiveData(data);

      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.normalField).toBe('normal-value');
    });

    it('should recursively sanitize nested objects', () => {
      // Property 65: Sensitive information should not be logged
      const data = {
        user: {
          apiKey: 'sk-secret-key',
          profile: {
            password: 'secret-password',
          },
        },
      };

      const sanitized = service.sanitizeSensitiveData(data);

      expect(sanitized.user.apiKey).toBe('[REDACTED]');
      expect(sanitized.user.profile.password).toBe('[REDACTED]');
    });
  });
});
