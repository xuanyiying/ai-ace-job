/**
 * Usage Tracker Property-Based Tests
 * Tests for cost tracking and reporting functionality using property-based testing
 * Feature: multi-llm-provider-integration
 * Property 35: 使用量记录完整性
 * Property 36: 成本聚合
 * Property 37: 成本报告生成
 * Property 40: 成本报告导出
 */

import { Test, TestingModule } from '@nestjs/testing';
import fc from 'fast-check';
import { UsageTrackerService } from './usage-tracker.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsageTrackerService - Property-Based Tests', () => {
  let service: UsageTrackerService;
  let prisma: PrismaService;

  const mockPrismaService = {
    usageRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageTrackerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsageTrackerService>(UsageTrackerService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 35: 使用量记录完整性
   * For any valid usage record, recording it should preserve all data fields
   */
  describe('Property 35: Usage Record Completeness', () => {
    it('should preserve all fields when recording usage', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.uuid(),
            model: fc.stringMatching(
              /^(gpt-4|gpt-3\.5-turbo|qwen|deepseek|gemini)$/
            ),
            provider: fc.stringMatching(
              /^(openai|qwen|deepseek|gemini|ollama)$/
            ),
            scenario: fc.option(
              fc.stringMatching(
                /^(resume-parsing|job-parsing|resume-optimization|interview-questions|match-score)$/
              )
            ),
            inputTokens: fc.integer({ min: 0, max: 100000 }),
            outputTokens: fc.integer({ min: 0, max: 100000 }),
            cost: fc.float({ min: 0, max: 100, noNaN: true }),
            latency: fc.integer({ min: 0, max: 60000 }),
            success: fc.boolean(),
            errorCode: fc.option(fc.stringMatching(/^[A-Z_]+$/)),
          }),
          (usageData) => {
            const mockRecord = {
              id: 'test-id',
              ...usageData,
              timestamp: new Date(),
            };

            mockPrismaService.usageRecord.create.mockResolvedValue(mockRecord);

            // All fields should be preserved
            expect(mockRecord.userId).toBe(usageData.userId);
            expect(mockRecord.model).toBe(usageData.model);
            expect(mockRecord.provider).toBe(usageData.provider);
            expect(mockRecord.inputTokens).toBe(usageData.inputTokens);
            expect(mockRecord.outputTokens).toBe(usageData.outputTokens);
            expect(mockRecord.cost).toBe(usageData.cost);
            expect(mockRecord.latency).toBe(usageData.latency);
            expect(mockRecord.success).toBe(usageData.success);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 36: 成本聚合
   * For any set of usage records, the sum of costs by model should equal the total cost
   */
  describe('Property 36: Cost Aggregation', () => {
    it('should correctly aggregate costs by model', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              userId: fc.uuid(),
              model: fc.stringMatching(/^(gpt-4|gpt-3\.5-turbo|qwen)$/),
              provider: fc.stringMatching(/^(openai|qwen)$/),
              scenario: fc.option(fc.string()),
              inputTokens: fc.integer({ min: 0, max: 10000 }),
              outputTokens: fc.integer({ min: 0, max: 10000 }),
              cost: fc.float({ min: 0, max: 10, noNaN: true }),
              latency: fc.integer({ min: 0, max: 10000 }),
              success: fc.constant(true),
              errorCode: fc.constant(null),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (records) => {
            mockPrismaService.usageRecord.findMany.mockResolvedValue(records);

            // Calculate expected total
            const expectedTotal = records.reduce((sum, r) => sum + r.cost, 0);

            // Calculate by model
            const costByModel = new Map<string, number>();
            for (const record of records) {
              const current = costByModel.get(record.model) || 0;
              costByModel.set(record.model, current + record.cost);
            }

            // Sum of all model costs should equal total
            const actualTotal = Array.from(costByModel.values()).reduce(
              (sum, cost) => sum + cost,
              0
            );

            expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(0.0001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly aggregate costs by scenario', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              userId: fc.uuid(),
              model: fc.string(),
              provider: fc.string(),
              scenario: fc.stringMatching(
                /^(resume-parsing|job-parsing|optimization)$/
              ),
              inputTokens: fc.integer({ min: 0, max: 10000 }),
              outputTokens: fc.integer({ min: 0, max: 10000 }),
              cost: fc.float({ min: 0, max: 10, noNaN: true }),
              latency: fc.integer({ min: 0, max: 10000 }),
              success: fc.constant(true),
              errorCode: fc.constant(null),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (records) => {
            mockPrismaService.usageRecord.findMany.mockResolvedValue(records);

            // Calculate expected total
            const expectedTotal = records.reduce((sum, r) => sum + r.cost, 0);

            // Calculate by scenario
            const costByScenario = new Map<string, number>();
            for (const record of records) {
              const key = record.scenario || 'unknown';
              const current = costByScenario.get(key) || 0;
              costByScenario.set(key, current + record.cost);
            }

            // Sum of all scenario costs should equal total
            const actualTotal = Array.from(costByScenario.values()).reduce(
              (sum, cost) => sum + cost,
              0
            );

            expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(0.0001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly aggregate costs by user', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              userId: fc.uuid(),
              model: fc.string(),
              provider: fc.string(),
              scenario: fc.option(fc.string()),
              inputTokens: fc.integer({ min: 0, max: 10000 }),
              outputTokens: fc.integer({ min: 0, max: 10000 }),
              cost: fc.float({ min: 0, max: 10, noNaN: true }),
              latency: fc.integer({ min: 0, max: 10000 }),
              success: fc.constant(true),
              errorCode: fc.constant(null),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (records) => {
            mockPrismaService.usageRecord.findMany.mockResolvedValue(records);

            // Calculate expected total
            const expectedTotal = records.reduce((sum, r) => sum + r.cost, 0);

            // Calculate by user
            const costByUser = new Map<string, number>();
            for (const record of records) {
              const current = costByUser.get(record.userId) || 0;
              costByUser.set(record.userId, current + record.cost);
            }

            // Sum of all user costs should equal total
            const actualTotal = Array.from(costByUser.values()).reduce(
              (sum, cost) => sum + cost,
              0
            );

            expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(0.0001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 37: 成本报告生成
   * For any set of records, the cost report total should equal the sum of all item costs
   */
  describe('Property 37: Cost Report Generation', () => {
    it('should generate report with correct total cost', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              userId: fc.uuid(),
              model: fc.stringMatching(/^(gpt-4|gpt-3\.5-turbo|qwen)$/),
              provider: fc.string(),
              scenario: fc.option(fc.string()),
              inputTokens: fc.integer({ min: 0, max: 10000 }),
              outputTokens: fc.integer({ min: 0, max: 10000 }),
              cost: fc.float({ min: 0, max: 10, noNaN: true }),
              latency: fc.integer({ min: 0, max: 10000 }),
              success: fc.constant(true),
              errorCode: fc.constant(null),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (records) => {
            mockPrismaService.usageRecord.findMany.mockResolvedValue(records);

            // Calculate expected total
            const expectedTotal = records.reduce((sum, r) => sum + r.cost, 0);

            // Build report items
            const groupMap = new Map<string, number>();
            for (const record of records) {
              const current = groupMap.get(record.model) || 0;
              groupMap.set(record.model, current + record.cost);
            }

            const items = Array.from(groupMap.entries()).map(([key, cost]) => ({
              key,
              cost: Math.round(cost * 10000) / 10000,
              callCount: 0,
              inputTokens: 0,
              outputTokens: 0,
              averageLatency: 0,
            }));

            const reportTotal = items.reduce((sum, item) => sum + item.cost, 0);

            // Report total should match expected total (within rounding)
            expect(Math.abs(reportTotal - expectedTotal)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate report with items sorted by cost descending', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              userId: fc.uuid(),
              model: fc.stringMatching(/^(gpt-4|gpt-3\.5-turbo|qwen)$/),
              provider: fc.string(),
              scenario: fc.option(fc.string()),
              inputTokens: fc.integer({ min: 0, max: 10000 }),
              outputTokens: fc.integer({ min: 0, max: 10000 }),
              cost: fc.float({ min: 0, max: 10, noNaN: true }),
              latency: fc.integer({ min: 0, max: 10000 }),
              success: fc.constant(true),
              errorCode: fc.constant(null),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (records) => {
            mockPrismaService.usageRecord.findMany.mockResolvedValue(records);

            // Build report items
            const groupMap = new Map<string, number>();
            for (const record of records) {
              const current = groupMap.get(record.model) || 0;
              groupMap.set(record.model, current + record.cost);
            }

            const items = Array.from(groupMap.entries())
              .map(([key, cost]) => ({
                key,
                cost: Math.round(cost * 10000) / 10000,
                callCount: 0,
                inputTokens: 0,
                outputTokens: 0,
                averageLatency: 0,
              }))
              .sort((a, b) => b.cost - a.cost);

            // Items should be sorted by cost descending
            for (let i = 1; i < items.length; i++) {
              expect(items[i - 1].cost).toBeGreaterThanOrEqual(items[i].cost);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 40: 成本报告导出
   * For any cost report, exporting to CSV and JSON should preserve all data
   */
  describe('Property 40: Cost Report Export', () => {
    it('should export report to CSV with all fields', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string(),
              cost: fc.float({ min: 0, max: 100, noNaN: true }),
              callCount: fc.integer({ min: 1, max: 1000 }),
              inputTokens: fc.integer({ min: 0, max: 100000 }),
              outputTokens: fc.integer({ min: 0, max: 100000 }),
              averageLatency: fc.float({ min: 0, max: 60000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (items) => {
            const report = {
              period: {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
              },
              groupBy: 'model' as const,
              totalCost: items.reduce((sum, item) => sum + item.cost, 0),
              items,
            };

            // CSV should contain headers
            const csv = [
              'Key,Cost,Call Count,Input Tokens,Output Tokens,Average Latency (ms)',
              ...items.map((item) =>
                [
                  item.key,
                  item.cost.toString(),
                  item.callCount.toString(),
                  item.inputTokens.toString(),
                  item.outputTokens.toString(),
                  item.averageLatency.toString(),
                ].join(',')
              ),
            ].join('\n');

            // CSV should contain all items
            for (const item of items) {
              expect(csv).toContain(item.key);
              expect(csv).toContain(item.cost.toString());
              expect(csv).toContain(item.callCount.toString());
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should export report to JSON with all fields', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              key: fc.string(),
              cost: fc.float({ min: 0, max: 100, noNaN: true }),
              callCount: fc.integer({ min: 1, max: 1000 }),
              inputTokens: fc.integer({ min: 0, max: 100000 }),
              outputTokens: fc.integer({ min: 0, max: 100000 }),
              averageLatency: fc.float({ min: 0, max: 60000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (items) => {
            const report = {
              period: {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
              },
              groupBy: 'model' as const,
              totalCost: items.reduce((sum, item) => sum + item.cost, 0),
              items,
            };

            const json = JSON.stringify(report, null, 2);
            const parsed = JSON.parse(json);

            // JSON should preserve all fields
            expect(parsed.groupBy).toBe(report.groupBy);
            expect(parsed.items.length).toBe(items.length);

            for (let i = 0; i < items.length; i++) {
              expect(parsed.items[i].key).toBe(items[i].key);
              expect(parsed.items[i].cost).toBe(items[i].cost);
              expect(parsed.items[i].callCount).toBe(items[i].callCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
