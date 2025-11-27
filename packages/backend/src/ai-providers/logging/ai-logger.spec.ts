import { Test, TestingModule } from '@nestjs/testing';
import { AILogger } from './ai-logger';
import { PrismaService } from '../../prisma/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('AILogger', () => {
  let service: AILogger;
  let prismaService: PrismaService;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AILogger,
        {
          provide: PrismaService,
          useValue: {
            aICallLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
              count: jest.fn(),
            },
            aIRetryLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            aIDegradationLog: {
              create: jest.fn(),
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AILogger>(AILogger);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('logAICall', () => {
    it('should log a successful AI call', async () => {
      const log = {
        model: 'gpt-4',
        provider: 'openai',
        scenario: 'resume-parsing',
        latency: 1500,
        success: true,
        inputTokens: 100,
        outputTokens: 50,
      };

      await service.logAICall(log);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'AI call successful',
        expect.objectContaining({
          model: 'gpt-4',
          provider: 'openai',
          scenario: 'resume-parsing',
          latency: 1500,
        })
      );

      expect(prismaService.aICallLog.create).toHaveBeenCalled();
    });

    it('should log a failed AI call', async () => {
      const log = {
        model: 'gpt-4',
        provider: 'openai',
        scenario: 'resume-parsing',
        latency: 5000,
        success: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        errorMessage: 'Rate limit exceeded',
      };

      await service.logAICall(log);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'AI call failed',
        expect.objectContaining({
          model: 'gpt-4',
          provider: 'openai',
          errorCode: 'RATE_LIMIT_EXCEEDED',
        })
      );

      expect(prismaService.aICallLog.create).toHaveBeenCalled();
    });

    it('should sanitize sensitive data from logs', async () => {
      const log = {
        model: 'gpt-4',
        provider: 'openai',
        latency: 1500,
        success: true,
        requestContent: 'API key: sk-1234567890abcdefghij',
        responseContent: 'Bearer token: abc123def456',
      };

      await service.logAICall(log);

      const callArgs = (prismaService.aICallLog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.requestContent).toContain('[REDACTED_API_KEY]');
      expect(callArgs.data.responseContent).toContain('[REDACTED_TOKEN]');
    });
  });

  describe('logError', () => {
    it('should log an error with detailed information', async () => {
      await service.logError(
        'gpt-4',
        'openai',
        'PROVIDER_UNAVAILABLE',
        'Service temporarily unavailable',
        'Error stack trace',
        'resume-parsing',
        'user-123'
      );

      expect(prismaService.aICallLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            model: 'gpt-4',
            provider: 'openai',
            errorCode: 'PROVIDER_UNAVAILABLE',
            errorMessage: 'Service temporarily unavailable',
            success: false,
          }),
        })
      );
    });
  });

  describe('logRetry', () => {
    it('should log a retry event', async () => {
      const log = {
        model: 'gpt-4',
        provider: 'openai',
        attempt: 2,
        maxAttempts: 3,
        errorCode: 'TIMEOUT',
        errorMessage: 'Request timeout',
      };

      await service.logRetry(log);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'AI call retry',
        expect.objectContaining({
          model: 'gpt-4',
          provider: 'openai',
          attempt: 2,
          maxAttempts: 3,
        })
      );

      expect(prismaService.aIRetryLog.create).toHaveBeenCalled();
    });
  });

  describe('logDegradation', () => {
    it('should log a degradation event', async () => {
      const log = {
        model: 'gpt-4',
        provider: 'openai',
        reason: 'Provider unavailable',
        fallbackModel: 'gpt-3.5-turbo',
        fallbackProvider: 'openai',
      };

      await service.logDegradation(log);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'AI call degradation',
        expect.objectContaining({
          model: 'gpt-4',
          provider: 'openai',
          reason: 'Provider unavailable',
          fallbackModel: 'gpt-3.5-turbo',
        })
      );

      expect(prismaService.aIDegradationLog.create).toHaveBeenCalled();
    });
  });

  describe('queryLogs', () => {
    it('should query logs by model', async () => {
      const mockLogs = [
        {
          id: '1',
          model: 'gpt-4',
          provider: 'openai',
          latency: 1500,
          success: true,
          timestamp: new Date(),
        },
      ];

      (prismaService.aICallLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs
      );

      const result = await service.queryLogs({ model: 'gpt-4' });

      expect(prismaService.aICallLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { model: 'gpt-4' },
        })
      );

      expect(result).toEqual(mockLogs);
    });

    it('should query logs by time range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockLogs = [];

      (prismaService.aICallLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs
      );

      await service.queryLogs({ startDate, endDate });

      expect(prismaService.aICallLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it('should support pagination', async () => {
      const mockLogs = [];

      (prismaService.aICallLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs
      );

      await service.queryLogs({ limit: 50, offset: 100 });

      expect(prismaService.aICallLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 100,
        })
      );
    });
  });

  describe('queryRetryLogs', () => {
    it('should query retry logs', async () => {
      const mockLogs = [
        {
          id: '1',
          model: 'gpt-4',
          provider: 'openai',
          attempt: 2,
          maxAttempts: 3,
          timestamp: new Date(),
        },
      ];

      (prismaService.aIRetryLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs
      );

      const result = await service.queryRetryLogs({ model: 'gpt-4' });

      expect(prismaService.aIRetryLog.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockLogs);
    });
  });

  describe('queryDegradationLogs', () => {
    it('should query degradation logs', async () => {
      const mockLogs = [
        {
          id: '1',
          model: 'gpt-4',
          provider: 'openai',
          reason: 'Provider unavailable',
          fallbackModel: 'gpt-3.5-turbo',
          timestamp: new Date(),
        },
      ];

      (prismaService.aIDegradationLog.findMany as jest.Mock).mockResolvedValue(
        mockLogs
      );

      const result = await service.queryDegradationLogs({ model: 'gpt-4' });

      expect(prismaService.aIDegradationLog.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockLogs);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      (prismaService.aICallLog.deleteMany as jest.Mock).mockResolvedValue({
        count: 100,
      });
      (prismaService.aIRetryLog.deleteMany as jest.Mock).mockResolvedValue({
        count: 50,
      });
      (
        prismaService.aIDegradationLog.deleteMany as jest.Mock
      ).mockResolvedValue({ count: 25 });

      await service.cleanupOldLogs();

      expect(prismaService.aICallLog.deleteMany).toHaveBeenCalled();
      expect(prismaService.aIRetryLog.deleteMany).toHaveBeenCalled();
      expect(prismaService.aIDegradationLog.deleteMany).toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cleaned up old logs',
        expect.any(Object)
      );
    });
  });

  describe('getLogStatistics', () => {
    it('should calculate log statistics', async () => {
      (prismaService.aICallLog.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95); // successful

      const stats = await service.getLogStatistics({ model: 'gpt-4' });

      expect(stats.totalCalls).toBe(100);
      expect(stats.successfulCalls).toBe(95);
      expect(stats.failedCalls).toBe(5);
      expect(stats.successRate).toBe(95);
    });

    it('should handle zero calls', async () => {
      (prismaService.aICallLog.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const stats = await service.getLogStatistics({ model: 'gpt-4' });

      expect(stats.totalCalls).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('sanitizeSensitiveData', () => {
    it('should remove API keys from logs', async () => {
      const log = {
        model: 'gpt-4',
        provider: 'openai',
        latency: 1500,
        success: true,
        requestContent: 'Use API key: sk-abcdefghijklmnopqrst',
      };

      await service.logAICall(log);

      const callArgs = (prismaService.aICallLog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.requestContent).not.toContain('sk-');
      expect(callArgs.data.requestContent).toContain('[REDACTED_API_KEY]');
    });

    it('should remove email addresses from logs', async () => {
      const log = {
        model: 'gpt-4',
        provider: 'openai',
        latency: 1500,
        success: true,
        requestContent: 'Contact: user@example.com',
      };

      await service.logAICall(log);

      const callArgs = (prismaService.aICallLog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.requestContent).not.toContain('@');
      expect(callArgs.data.requestContent).toContain('[REDACTED_EMAIL]');
    });

    it('should remove phone numbers from logs', async () => {
      const log = {
        model: 'gpt-4',
        provider: 'openai',
        latency: 1500,
        success: true,
        requestContent: 'Phone: 555-123-4567',
      };

      await service.logAICall(log);

      const callArgs = (prismaService.aICallLog.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.requestContent).not.toContain('555');
      expect(callArgs.data.requestContent).toContain('[REDACTED_PHONE]');
    });
  });
});
