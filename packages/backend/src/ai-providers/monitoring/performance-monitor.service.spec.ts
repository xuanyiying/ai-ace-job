/**
 * Performance Monitor Service Tests
 * Tests for performance metrics recording and alert checking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceMonitorService } from '@/ai-providers';
import { PrismaService } from '@/prisma/prisma.service';

describe('PerformanceMonitorService', () => {
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

  describe('recordMetrics', () => {
    it('should create new metrics if they do not exist', async () => {
      const model = 'gpt-4';
      const provider = 'openai';
      const latency = 1000;
      const success = true;

      mockPrismaService.performanceMetrics.findUnique.mockResolvedValue(null);
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
        successfulCalls: 1,
        failedCalls: 0,
        averageLatency: 1000,
        maxLatency: 1000,
        minLatency: 1000,
        successRate: 1,
        failureRate: 0,
        lastUpdated: new Date(),
      });

      const result = await service.recordMetrics(
        model,
        provider,
        latency,
        success
      );

      expect(result.totalCalls).toBe(1);
      expect(result.successfulCalls).toBe(1);
      expect(result.failedCalls).toBe(0);
      expect(result.averageLatency).toBe(1000);
      expect(result.successRate).toBe(1);
      expect(result.failureRate).toBe(0);
    });

    it('should update existing metrics', async () => {
      const model = 'gpt-4';
      const provider = 'openai';
      const latency = 1500;
      const success = false;

      mockPrismaService.performanceMetrics.findUnique.mockResolvedValue({
        id: '1',
        model,
        provider,
        totalCalls: 1,
        successfulCalls: 1,
        failedCalls: 0,
        averageLatency: 1000,
        maxLatency: 1000,
        minLatency: 1000,
        successRate: 1,
        failureRate: 0,
        lastUpdated: new Date(),
      });

      mockPrismaService.performanceMetrics.update.mockResolvedValue({
        id: '1',
        model,
        provider,
        totalCalls: 2,
        successfulCalls: 1,
        failedCalls: 1,
        averageLatency: 1250,
        maxLatency: 1500,
        minLatency: 1000,
        successRate: 0.5,
        failureRate: 0.5,
        lastUpdated: new Date(),
      });

      const result = await service.recordMetrics(
        model,
        provider,
        latency,
        success
      );

      expect(result.totalCalls).toBe(2);
      expect(result.successfulCalls).toBe(1);
      expect(result.failedCalls).toBe(1);
      expect(result.averageLatency).toBe(1250);
      expect(result.successRate).toBe(0.5);
      expect(result.failureRate).toBe(0.5);
    });

    it('should throw error for invalid model', async () => {
      await expect(
        service.recordMetrics('', 'openai', 1000, true)
      ).rejects.toThrow('Model is required');
    });

    it('should throw error for invalid provider', async () => {
      await expect(
        service.recordMetrics('gpt-4', '', 1000, true)
      ).rejects.toThrow('Provider is required');
    });

    it('should throw error for negative latency', async () => {
      await expect(
        service.recordMetrics('gpt-4', 'openai', -100, true)
      ).rejects.toThrow('Latency must be non-negative');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for a model', async () => {
      const model = 'gpt-4';
      const mockMetrics = {
        id: '1',
        model,
        provider: 'openai',
        totalCalls: 10,
        successfulCalls: 9,
        failedCalls: 1,
        averageLatency: 1200,
        maxLatency: 2000,
        minLatency: 800,
        successRate: 0.9,
        failureRate: 0.1,
        lastUpdated: new Date(),
      };

      mockPrismaService.performanceMetrics.findUnique.mockResolvedValue(
        mockMetrics
      );

      const result = await service.getMetrics(model);

      expect(result).toEqual(mockMetrics);
    });

    it('should return null if metrics do not exist', async () => {
      mockPrismaService.performanceMetrics.findUnique.mockResolvedValue(null);

      const result = await service.getMetrics('unknown-model');

      expect(result).toBeNull();
    });

    it('should throw error for invalid model', async () => {
      await expect(service.getMetrics('')).rejects.toThrow('Model is required');
    });
  });

  describe('getAllMetrics', () => {
    it('should return all metrics', async () => {
      const mockMetrics = [
        {
          id: '1',
          model: 'gpt-4',
          provider: 'openai',
          totalCalls: 10,
          successfulCalls: 9,
          failedCalls: 1,
          averageLatency: 1200,
          maxLatency: 2000,
          minLatency: 800,
          successRate: 0.9,
          failureRate: 0.1,
          lastUpdated: new Date(),
        },
        {
          id: '2',
          model: 'gpt-3.5-turbo',
          provider: 'openai',
          totalCalls: 20,
          successfulCalls: 19,
          failedCalls: 1,
          averageLatency: 800,
          maxLatency: 1500,
          minLatency: 500,
          successRate: 0.95,
          failureRate: 0.05,
          lastUpdated: new Date(),
        },
      ];

      mockPrismaService.performanceMetrics.findMany.mockResolvedValue(
        mockMetrics
      );

      const result = await service.getAllMetrics();

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('getMetricsByProvider', () => {
    it('should return metrics for a provider', async () => {
      const provider = 'openai';
      const mockMetrics = [
        {
          id: '1',
          model: 'gpt-4',
          provider,
          totalCalls: 10,
          successfulCalls: 9,
          failedCalls: 1,
          averageLatency: 1200,
          maxLatency: 2000,
          minLatency: 800,
          successRate: 0.9,
          failureRate: 0.1,
          lastUpdated: new Date(),
        },
      ];

      mockPrismaService.performanceMetrics.findMany.mockResolvedValue(
        mockMetrics
      );

      const result = await service.getMetricsByProvider(provider);

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe(provider);
    });

    it('should throw error for invalid provider', async () => {
      await expect(service.getMetricsByProvider('')).rejects.toThrow(
        'Provider is required'
      );
    });
  });

  describe('checkAlerts', () => {
    it('should detect high failure rate alert', async () => {
      const mockMetrics = [
        {
          id: '1',
          model: 'gpt-4',
          provider: 'openai',
          totalCalls: 10,
          successfulCalls: 8,
          failedCalls: 2,
          averageLatency: 1200,
          maxLatency: 2000,
          minLatency: 800,
          successRate: 0.8,
          failureRate: 0.2, // 20% > 10% threshold
          lastUpdated: new Date(),
        },
      ];

      mockPrismaService.performanceMetrics.findMany.mockResolvedValue(
        mockMetrics
      );

      const alerts = await service.checkAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('HIGH_FAILURE_RATE');
      expect(alerts[0].severity).toBe('WARNING');
    });

    it('should detect high latency alert', async () => {
      const mockMetrics = [
        {
          id: '1',
          model: 'gpt-4',
          provider: 'openai',
          totalCalls: 10,
          successfulCalls: 9,
          failedCalls: 1,
          averageLatency: 35000, // 35s > 30s threshold
          maxLatency: 50000,
          minLatency: 20000,
          successRate: 0.9,
          failureRate: 0.1,
          lastUpdated: new Date(),
        },
      ];

      mockPrismaService.performanceMetrics.findMany.mockResolvedValue(
        mockMetrics
      );

      const alerts = await service.checkAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('HIGH_LATENCY');
      expect(alerts[0].severity).toBe('WARNING');
    });

    it('should detect multiple alerts', async () => {
      const mockMetrics = [
        {
          id: '1',
          model: 'gpt-4',
          provider: 'openai',
          totalCalls: 10,
          successfulCalls: 8,
          failedCalls: 2,
          averageLatency: 35000,
          maxLatency: 50000,
          minLatency: 20000,
          successRate: 0.8,
          failureRate: 0.2,
          lastUpdated: new Date(),
        },
      ];

      mockPrismaService.performanceMetrics.findMany.mockResolvedValue(
        mockMetrics
      );

      const alerts = await service.checkAlerts();

      expect(alerts).toHaveLength(2);
      expect(alerts.some((a) => a.alertType === 'HIGH_FAILURE_RATE')).toBe(
        true
      );
      expect(alerts.some((a) => a.alertType === 'HIGH_LATENCY')).toBe(true);
    });

    it('should not generate alerts when metrics are healthy', async () => {
      const mockMetrics = [
        {
          id: '1',
          model: 'gpt-4',
          provider: 'openai',
          totalCalls: 10,
          successfulCalls: 9,
          failedCalls: 1,
          averageLatency: 1200,
          maxLatency: 2000,
          minLatency: 800,
          successRate: 0.9,
          failureRate: 0.1,
          lastUpdated: new Date(),
        },
      ];

      mockPrismaService.performanceMetrics.findMany.mockResolvedValue(
        mockMetrics
      );

      const alerts = await service.checkAlerts();

      expect(alerts).toHaveLength(0);
    });
  });

  describe('getAlertsForModel', () => {
    it('should return alerts for a specific model', async () => {
      const model = 'gpt-4';
      mockPrismaService.performanceMetrics.findUnique.mockResolvedValue({
        id: '1',
        model,
        provider: 'openai',
        totalCalls: 10,
        successfulCalls: 8,
        failedCalls: 2,
        averageLatency: 35000,
        maxLatency: 50000,
        minLatency: 20000,
        successRate: 0.8,
        failureRate: 0.2,
        lastUpdated: new Date(),
      });

      const alerts = await service.getAlertsForModel(model);

      expect(alerts).toHaveLength(2);
    });

    it('should throw error for invalid model', async () => {
      await expect(service.getAlertsForModel('')).rejects.toThrow(
        'Model is required'
      );
    });
  });

  describe('resetMetrics', () => {
    it('should reset metrics for a model', async () => {
      const model = 'gpt-4';

      mockPrismaService.performanceMetrics.findUnique.mockResolvedValue({
        id: '1',
        model,
        provider: 'openai',
        totalCalls: 10,
        successfulCalls: 9,
        failedCalls: 1,
        averageLatency: 1200,
        maxLatency: 2000,
        minLatency: 800,
        successRate: 0.9,
        failureRate: 0.1,
        lastUpdated: new Date(),
      });

      mockPrismaService.performanceMetrics.update.mockResolvedValue({
        id: '1',
        model,
        provider: 'openai',
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

      const result = await service.resetMetrics(model);

      expect(result.totalCalls).toBe(0);
      expect(result.successfulCalls).toBe(0);
      expect(result.failedCalls).toBe(0);
    });

    it('should throw error if metrics do not exist', async () => {
      mockPrismaService.performanceMetrics.findUnique.mockResolvedValue(null);

      await expect(service.resetMetrics('unknown-model')).rejects.toThrow(
        'Metrics not found for model unknown-model'
      );
    });
  });
});
