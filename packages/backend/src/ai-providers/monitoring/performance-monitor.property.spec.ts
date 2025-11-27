/**
 * Performance Monitor Property-Based Tests
 * Tests correctness properties for performance monitoring
 * Feature: multi-llm-provider-integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMonitorService } from './performance-monitor.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as fc from 'fast-check';

describe('PerformanceMonitorService - Property Tests', () => {
  let service: PerformanceMonitorService;

  const mockPrismaService = {
    performanceMetrics: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    usageRecord: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceMonitorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PerformanceMonitorService>(PerformanceMonitorService);
    jest.clearAllMocks();
  });

  /**
   * Property 41: 响应时间记录
   * For any model call with latency, the system should record the latency value
   * Validates: Requirements 8.1
   */
  it('should record latency for any model call', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 0, max: 100000 }),
        fc.boolean(),
        async (model, provider, latency, success) => {
          mockPrismaService.performanceMetrics.findUnique.mockResolvedValue(
            null
          );
          mockPrismaService.performanceMetrics.create.mockResolvedValue({
            id: '1',
            model,
            provider,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageLatency: 0,
            maxLatency: 0,
            minLatency: 0,
            successRate: 0,
            failureRate: 0,
            lastUpdated: new Date(),
          });

          mockPrismaService.performanceMetrics.update.mockResolvedValue({
            id: '1',
            model,
            provider,
            totalCalls: 1,
            successfulCalls: success ? 1 : 0,
            failedCalls: success ? 0 : 1,
            averageLatency: latency,
            maxLatency: latency,
            minLatency: latency,
            successRate: success ? 1 : 0,
            failureRate: success ? 0 : 1,
            lastUpdated: new Date(),
          });

          const result = await service.recordMetrics(
            model,
            provider,
            latency,
            success
          );

          // The recorded latency should match the input latency
          expect(result.averageLatency).toBe(latency);
          expect(result.maxLatency).toBe(latency);
          expect(result.minLatency).toBe(latency);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 42: 性能指标计算
   * For any sequence of calls, the average latency should be the mean of all latencies
   * Validates: Requirements 8.2
   */
  it('should calculate average latency correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.array(fc.integer({ min: 0, max: 100000 }), {
          minLength: 1,
          maxLength: 10,
        }),
        async (model, provider, latencies) => {
          let currentMetrics = {
            id: '1',
            model,
            provider,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageLatency: 0,
            maxLatency: 0,
            minLatency: 0,
            successRate: 0,
            failureRate: 0,
            lastUpdated: new Date(),
          };

          mockPrismaService.performanceMetrics.findUnique.mockImplementation(
            async () =>
              currentMetrics.totalCalls === 0 ? null : currentMetrics
          );

          mockPrismaService.performanceMetrics.create.mockResolvedValue(
            currentMetrics
          );

          mockPrismaService.performanceMetrics.update.mockImplementation(
            async (args: any) => {
              currentMetrics = args.data;
              return currentMetrics;
            }
          );

          // Record all latencies
          for (const latency of latencies) {
            await service.recordMetrics(model, provider, latency, true);
          }

          // Calculate expected average
          const expectedAverage =
            latencies.reduce((a, b) => a + b, 0) / latencies.length;

          // The average latency should be close to the expected average
          expect(
            Math.abs(currentMetrics.averageLatency - expectedAverage)
          ).toBeLessThan(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 43: 成功率计算
   * For any sequence of calls, success rate should be (successful calls / total calls)
   * Validates: Requirements 8.3
   */
  it('should calculate success rate correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        async (model, provider, results) => {
          let currentMetrics = {
            id: '1',
            model,
            provider,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageLatency: 0,
            maxLatency: 0,
            minLatency: 0,
            successRate: 0,
            failureRate: 0,
            lastUpdated: new Date(),
          };

          mockPrismaService.performanceMetrics.findUnique.mockImplementation(
            async () =>
              currentMetrics.totalCalls === 0 ? null : currentMetrics
          );

          mockPrismaService.performanceMetrics.create.mockResolvedValue(
            currentMetrics
          );

          mockPrismaService.performanceMetrics.update.mockImplementation(
            async (args: any) => {
              currentMetrics = args.data;
              return currentMetrics;
            }
          );

          // Record all results
          for (const success of results) {
            await service.recordMetrics(model, provider, 1000, success);
          }

          // Calculate expected success rate
          const successCount = results.filter((r) => r).length;
          const expectedSuccessRate = successCount / results.length;
          const expectedFailureRate =
            (results.length - successCount) / results.length;

          // The success rate should match the expected value
          expect(
            Math.abs(currentMetrics.successRate - expectedSuccessRate)
          ).toBeLessThan(0.01);
          expect(
            Math.abs(currentMetrics.failureRate - expectedFailureRate)
          ).toBeLessThan(0.01);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 44: 失败率告警
   * For any metrics with failure rate > 10%, an alert should be generated
   * Validates: Requirements 8.4
   */
  it('should generate alert when failure rate exceeds threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 11, max: 100 }), // Failure rate percentage > 10%
        async (model, provider, failureRatePercent) => {
          const failureRate = failureRatePercent / 100;

          mockPrismaService.performanceMetrics.findMany.mockResolvedValue([
            {
              id: '1',
              model,
              provider,
              totalCalls: 100,
              successfulCalls: Math.floor(100 * (1 - failureRate)),
              failedCalls: Math.ceil(100 * failureRate),
              averageLatency: 1000,
              maxLatency: 2000,
              minLatency: 500,
              successRate: 1 - failureRate,
              failureRate,
              lastUpdated: new Date(),
            },
          ]);

          const alerts = await service.checkAlerts();

          // Should have at least one alert for high failure rate
          expect(alerts.some((a) => a.alertType === 'HIGH_FAILURE_RATE')).toBe(
            true
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 45: 响应时间告警
   * For any metrics with average latency > 30s, an alert should be generated
   * Validates: Requirements 8.5
   */
  it('should generate alert when latency exceeds threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 30001, max: 100000 }), // Latency > 30s
        async (model, provider, latency) => {
          mockPrismaService.performanceMetrics.findMany.mockResolvedValue([
            {
              id: '1',
              model,
              provider,
              totalCalls: 10,
              successfulCalls: 9,
              failedCalls: 1,
              averageLatency: latency,
              maxLatency: latency + 1000,
              minLatency: latency - 1000,
              successRate: 0.9,
              failureRate: 0.1,
              lastUpdated: new Date(),
            },
          ]);

          const alerts = await service.checkAlerts();

          // Should have at least one alert for high latency
          expect(alerts.some((a) => a.alertType === 'HIGH_LATENCY')).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 46: 性能指标查询
   * For any date range, querying metrics should return consistent results
   * Validates: Requirements 8.7
   */
  it('should return consistent metrics for date range queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 0, max: 100000 }),
        async (model, latency) => {
          const mockMetrics = {
            id: '1',
            model,
            provider: 'test',
            totalCalls: 10,
            successfulCalls: 9,
            failedCalls: 1,
            averageLatency: latency,
            maxLatency: latency + 1000,
            minLatency: Math.max(0, latency - 1000),
            successRate: 0.9,
            failureRate: 0.1,
            lastUpdated: new Date(),
          };

          mockPrismaService.performanceMetrics.findUnique.mockResolvedValue(
            mockMetrics
          );
          mockPrismaService.usageRecord.findMany.mockResolvedValue([
            {
              id: '1',
              userId: 'user1',
              model,
              provider: 'test',
              scenario: 'test',
              inputTokens: 100,
              outputTokens: 50,
              cost: 0.01,
              latency,
              success: true,
              errorCode: null,
              timestamp: new Date('2024-01-15'),
            },
          ]);

          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-31');

          const result = await service.getMetrics(model, startDate, endDate);

          // Should return metrics
          expect(result).toBeDefined();
          expect(result?.model).toBe(model);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Invariant: Max latency should always be >= min latency
   */
  it('should maintain invariant: maxLatency >= minLatency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.array(fc.integer({ min: 0, max: 100000 }), {
          minLength: 1,
          maxLength: 10,
        }),
        async (model, provider, latencies) => {
          let currentMetrics = {
            id: '1',
            model,
            provider,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageLatency: 0,
            maxLatency: 0,
            minLatency: 0,
            successRate: 0,
            failureRate: 0,
            lastUpdated: new Date(),
          };

          mockPrismaService.performanceMetrics.findUnique.mockImplementation(
            async () =>
              currentMetrics.totalCalls === 0 ? null : currentMetrics
          );

          mockPrismaService.performanceMetrics.create.mockResolvedValue(
            currentMetrics
          );

          mockPrismaService.performanceMetrics.update.mockImplementation(
            async (args: any) => {
              currentMetrics = args.data;
              return currentMetrics;
            }
          );

          // Record all latencies
          for (const latency of latencies) {
            await service.recordMetrics(model, provider, latency, true);
          }

          // Invariant: maxLatency >= minLatency
          expect(currentMetrics.maxLatency).toBeGreaterThanOrEqual(
            currentMetrics.minLatency
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Invariant: Success rate + failure rate should equal 1
   */
  it('should maintain invariant: successRate + failureRate = 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        async (model, provider, results) => {
          let currentMetrics = {
            id: '1',
            model,
            provider,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageLatency: 0,
            maxLatency: 0,
            minLatency: 0,
            successRate: 0,
            failureRate: 0,
            lastUpdated: new Date(),
          };

          mockPrismaService.performanceMetrics.findUnique.mockImplementation(
            async () =>
              currentMetrics.totalCalls === 0 ? null : currentMetrics
          );

          mockPrismaService.performanceMetrics.create.mockResolvedValue(
            currentMetrics
          );

          mockPrismaService.performanceMetrics.update.mockImplementation(
            async (args: any) => {
              currentMetrics = args.data;
              return currentMetrics;
            }
          );

          // Record all results
          for (const success of results) {
            await service.recordMetrics(model, provider, 1000, success);
          }

          // Invariant: successRate + failureRate = 1
          const sum = currentMetrics.successRate + currentMetrics.failureRate;
          expect(Math.abs(sum - 1)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 50 }
    );
  });
});
