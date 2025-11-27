import { Test, TestingModule } from '@nestjs/testing';
import { AILogger } from './ai-logger';
import { PrismaService } from '../../prisma/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for AILogger
 * Feature: multi-llm-provider-integration
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

describe('AILogger - Property-Based Tests', () => {
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
              create: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue([]),
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
              count: jest.fn().mockResolvedValue(0),
            },
            aIRetryLog: {
              create: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue([]),
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            aIDegradationLog: {
              create: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue([]),
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 58: Error log recording
   * **Feature: multi-llm-provider-integration, Property 58: Error log recording**
   * **Validates: Requirements 11.1**
   *
   * For any error, the system should record detailed error information including
   * error code, message, and stack trace.
   */
  it('Property 58: Error log recording - should record all error details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.option(fc.string({ minLength: 1, maxLength: 500 })),
        async (model, provider, errorCode, errorMessage, stackTrace) => {
          (prismaService.aICallLog.create as jest.Mock).mockClear();

          await service.logError(
            model,
            provider,
            errorCode,
            errorMessage,
            stackTrace || undefined
          );

          expect(prismaService.aICallLog.create).toHaveBeenCalled();
          const callArgs = (prismaService.aICallLog.create as jest.Mock).mock
            .calls[0][0];
          expect(callArgs.data.errorCode).toBe(errorCode);
          expect(callArgs.data.errorMessage).toBe(errorMessage);
          expect(callArgs.data.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 59: Error code definition
   * **Feature: multi-llm-provider-integration, Property 59: Error code definition**
   * **Validates: Requirements 11.2**
   *
   * For any error type, the system should define specific error codes.
   */
  it('Property 59: Error code definition - should support various error codes', async () => {
    const errorCodes = [
      'PROVIDER_UNAVAILABLE',
      'RATE_LIMIT_EXCEEDED',
      'AUTHENTICATION_FAILED',
      'INVALID_REQUEST',
      'TIMEOUT',
      'UNKNOWN_ERROR',
    ];

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...errorCodes), async (errorCode) => {
        (prismaService.aICallLog.create as jest.Mock).mockClear();

        await service.logError(
          'test-model',
          'test-provider',
          errorCode,
          'Test error'
        );

        expect(prismaService.aICallLog.create).toHaveBeenCalled();
        const callArgs = (prismaService.aICallLog.create as jest.Mock).mock
          .calls[0][0];
        expect(callArgs.data.errorCode).toBe(errorCode);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 60: Detailed call log
   * **Feature: multi-llm-provider-integration, Property 60: Detailed call log**
   * **Validates: Requirements 11.3**
   *
   * For any AI call, the system should record request parameters, response content,
   * and latency.
   */
  it('Property 60: Detailed call log - should record all call details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        fc.integer({ min: 100, max: 30000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        async (
          model,
          provider,
          scenario,
          latency,
          inputTokens,
          outputTokens
        ) => {
          (prismaService.aICallLog.create as jest.Mock).mockClear();

          const log = {
            model,
            provider,
            scenario: scenario || undefined,
            latency,
            success: true,
            inputTokens,
            outputTokens,
          };

          await service.logAICall(log);

          expect(prismaService.aICallLog.create).toHaveBeenCalled();
          const callArgs = (prismaService.aICallLog.create as jest.Mock).mock
            .calls[0][0];
          expect(callArgs.data.model).toBe(model);
          expect(callArgs.data.provider).toBe(provider);
          expect(callArgs.data.latency).toBe(latency);
          expect(callArgs.data.inputTokens).toBe(inputTokens);
          expect(callArgs.data.outputTokens).toBe(outputTokens);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 61: Debug level logging
   * **Feature: multi-llm-provider-integration, Property 61: Debug level logging**
   * **Validates: Requirements 11.4**
   *
   * For any AI call with request and response content, the system should record
   * complete request and response content.
   */
  it('Property 61: Debug level logging - should record complete request/response', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (requestContent, responseContent) => {
          const log = {
            model: 'test-model',
            provider: 'test-provider',
            latency: 1000,
            success: true,
            requestContent,
            responseContent,
          };

          await service.logAICall(log);

          expect(prismaService.aICallLog.create).toHaveBeenCalled();
          const callArgs = (prismaService.aICallLog.create as jest.Mock).mock
            .calls[0][0];
          // Content should be sanitized but present
          expect(callArgs.data.requestContent).toBeDefined();
          expect(callArgs.data.responseContent).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 62: Log query
   * **Feature: multi-llm-provider-integration, Property 62: Log query**
   * **Validates: Requirements 11.5**
   *
   * For any log query with model, scenario, or time range filters, the system
   * should support querying logs by these criteria.
   */
  it('Property 62: Log query - should support filtering by model, scenario, and time range', async () => {
    const mockLogs = [
      {
        id: '1',
        model: 'gpt-4',
        provider: 'openai',
        scenario: 'resume-parsing',
        latency: 1500,
        success: true,
        timestamp: new Date(),
      },
    ];

    (prismaService.aICallLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        fc.option(fc.date()),
        fc.option(fc.date()),
        async (model, scenario, startDate, endDate) => {
          const result = await service.queryLogs({
            model: model || undefined,
            scenario: scenario || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          });

          expect(prismaService.aICallLog.findMany).toHaveBeenCalled();
          expect(Array.isArray(result)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 63: Log cleanup
   * **Feature: multi-llm-provider-integration, Property 63: Log cleanup**
   * **Validates: Requirements 11.6**
   *
   * For any cleanup operation, the system should delete logs older than the
   * retention period.
   */
  it('Property 63: Log cleanup - should delete old logs', async () => {
    (prismaService.aICallLog.deleteMany as jest.Mock).mockResolvedValue({
      count: 100,
    });
    (prismaService.aIRetryLog.deleteMany as jest.Mock).mockResolvedValue({
      count: 50,
    });
    (prismaService.aIDegradationLog.deleteMany as jest.Mock).mockResolvedValue({
      count: 25,
    });

    await service.cleanupOldLogs();

    expect(prismaService.aICallLog.deleteMany).toHaveBeenCalled();
    expect(prismaService.aIRetryLog.deleteMany).toHaveBeenCalled();
    expect(prismaService.aIDegradationLog.deleteMany).toHaveBeenCalled();

    // Verify that the where clause includes a timestamp filter
    const callArgs = (prismaService.aICallLog.deleteMany as jest.Mock).mock
      .calls[0][0];
    expect(callArgs.where.timestamp).toBeDefined();
    expect(callArgs.where.timestamp.lt).toBeDefined();
  });

  /**
   * Property: Sensitive data sanitization
   * **Feature: multi-llm-provider-integration, Property: Sensitive data sanitization**
   * **Validates: Requirements 12.2**
   *
   * For any log containing sensitive patterns (API keys, emails, phone numbers),
   * the system should sanitize them before storage.
   */
  it('Property: Sensitive data sanitization - should remove sensitive patterns', async () => {
    const sensitivePatterns = [
      'sk-1234567890abcdefghij',
      'user@example.com',
      '555-123-4567',
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...sensitivePatterns),
        async (pattern) => {
          const log = {
            model: 'test-model',
            provider: 'test-provider',
            latency: 1000,
            success: true,
            requestContent: `Sensitive data: ${pattern}`,
          };

          await service.logAICall(log);

          expect(prismaService.aICallLog.create).toHaveBeenCalled();
          const callArgs = (prismaService.aICallLog.create as jest.Mock).mock
            .calls[0][0];
          // Verify that the pattern is not in the stored content
          expect(callArgs.data.requestContent).not.toContain(pattern);
          expect(callArgs.data.requestContent).toContain('[REDACTED_');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Log statistics calculation
   * **Feature: multi-llm-provider-integration, Property: Log statistics calculation**
   * **Validates: Requirements 11.5**
   *
   * For any set of logs, the system should correctly calculate success rate,
   * total calls, and failure count.
   */
  it('Property: Log statistics - should correctly calculate statistics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        async (totalCalls, successfulCalls) => {
          const adjustedSuccessful = Math.min(successfulCalls, totalCalls);

          (prismaService.aICallLog.count as jest.Mock)
            .mockResolvedValueOnce(totalCalls)
            .mockResolvedValueOnce(adjustedSuccessful);

          const stats = await service.getLogStatistics({ model: 'test' });

          expect(stats.totalCalls).toBe(totalCalls);
          expect(stats.successfulCalls).toBe(adjustedSuccessful);
          expect(stats.failedCalls).toBe(totalCalls - adjustedSuccessful);

          if (totalCalls > 0) {
            const expectedRate = (adjustedSuccessful / totalCalls) * 100;
            expect(stats.successRate).toBe(expectedRate);
          } else {
            expect(stats.successRate).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Retry log recording
   * **Feature: multi-llm-provider-integration, Property: Retry log recording**
   * **Validates: Requirements 6.5**
   *
   * For any retry event, the system should record the attempt number and
   * error information.
   */
  it('Property: Retry log recording - should record retry attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 1, max: 3 })
        ),
        async ([attempt, maxAttempts]) => {
          (prismaService.aIRetryLog.create as jest.Mock).mockClear();

          const log = {
            model: 'test-model',
            provider: 'test-provider',
            attempt,
            maxAttempts,
            errorCode: 'TIMEOUT',
            errorMessage: 'Request timeout',
          };

          await service.logRetry(log);

          expect(prismaService.aIRetryLog.create).toHaveBeenCalled();
          const callArgs = (prismaService.aIRetryLog.create as jest.Mock).mock
            .calls[0][0];
          expect(callArgs.data.attempt).toBe(attempt);
          expect(callArgs.data.maxAttempts).toBe(maxAttempts);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Degradation log recording
   * **Feature: multi-llm-provider-integration, Property: Degradation log recording**
   * **Validates: Requirements 6.5, 6.6**
   *
   * For any degradation event, the system should record the reason and
   * fallback model information.
   */
  it('Property: Degradation log recording - should record degradation events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        async (reason, fallbackModel) => {
          (prismaService.aIDegradationLog.create as jest.Mock).mockClear();

          const log = {
            model: 'test-model',
            provider: 'test-provider',
            reason,
            fallbackModel: fallbackModel || undefined,
            fallbackProvider: fallbackModel ? 'test-provider' : undefined,
          };

          await service.logDegradation(log);

          expect(prismaService.aIDegradationLog.create).toHaveBeenCalled();
          const callArgs = (prismaService.aIDegradationLog.create as jest.Mock)
            .mock.calls[0][0];
          expect(callArgs.data.reason).toBe(reason);
          if (fallbackModel) {
            expect(callArgs.data.fallbackModel).toBe(fallbackModel);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
