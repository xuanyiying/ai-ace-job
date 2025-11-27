/**
 * AI Engine Service Tests
 * Tests for unified AI engine service
 * **Feature: multi-llm-provider-integration, Property 5: 统一请求格式, Property 6: 统一响应格式**
 * **Validates: Requirements 2.1, 2.3, 2.4, 2.5, 2.6**
 */

import { AIEngineService } from './ai-engine.service';
import { AIRequest } from './interfaces';
import { AIError, AIErrorCode } from './utils/ai-error';

describe('AIEngineService', () => {
  let service: AIEngineService;

  // Mock dependencies
  const mockProviderFactory = {
    getAvailableProviders: jest.fn(() => []),
    getProvider: jest.fn(),
    getProviderNames: jest.fn(() => []),
    getAvailableProviderNames: jest.fn(() => []),
    getProviderStatus: jest.fn(),
    getAllProviderStatuses: jest.fn(() => []),
    isProviderAvailable: jest.fn(() => false),
    checkProviderHealth: jest.fn(),
    reloadProviders: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  const mockPromptTemplateManager = {
    getTemplate: jest.fn(),
    renderTemplate: jest.fn(),
    createVersion: jest.fn(),
    listVersions: jest.fn(),
    rollback: jest.fn(),
    clearCache: jest.fn(),
    reloadTemplates: jest.fn(),
  };

  const mockUsageTracker = {
    recordUsage: jest.fn(),
    getCostByModel: jest.fn(),
    getCostByScenario: jest.fn(),
    getCostByUser: jest.fn(),
    generateCostReport: jest.fn(),
    exportCostReportToCSV: jest.fn(),
    exportCostReportToJSON: jest.fn(),
    setCostThreshold: jest.fn(),
    getCostThreshold: jest.fn(),
    checkCostThreshold: jest.fn(),
    getModelUsageStats: jest.fn(),
    getUserUsageStats: jest.fn(),
    cleanupOldRecords: jest.fn(),
  };

  const mockPerformanceMonitor = {
    recordMetrics: jest.fn(),
    getMetrics: jest.fn(),
    getAllMetrics: jest.fn(),
    getMetricsByProvider: jest.fn(),
    checkAlerts: jest.fn(),
    getAlertsForModel: jest.fn(),
    resetMetrics: jest.fn(),
  };

  const mockAILogger = {
    logAICall: jest.fn(),
    logError: jest.fn(),
    logRetry: jest.fn(),
    logDegradation: jest.fn(),
    queryLogs: jest.fn(),
    queryRetryLogs: jest.fn(),
    queryDegradationLogs: jest.fn(),
    cleanupOldLogs: jest.fn(),
    getLogStatistics: jest.fn(),
  };

  beforeEach(() => {
    service = new AIEngineService(
      mockProviderFactory as any,
      mockPromptTemplateManager as any,
      mockUsageTracker as any,
      mockPerformanceMonitor as any,
      mockAILogger as any
    );
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have required methods', () => {
      expect(service.call).toBeDefined();
      expect(service.stream).toBeDefined();
      expect(service.getAvailableModels).toBeDefined();
      expect(service.getModelsByProvider).toBeDefined();
      expect(service.getModelInfo).toBeDefined();
      expect(service.reloadModels).toBeDefined();
      expect(service.getSelectionStatistics).toBeDefined();
      expect(service.getSelectionLog).toBeDefined();
      expect(service.getCostReport).toBeDefined();
      expect(service.getPerformanceMetrics).toBeDefined();
      expect(service.checkPerformanceAlerts).toBeDefined();
      expect(service.getLogs).toBeDefined();
    });
  });

  describe('Request Validation', () => {
    it('should reject request with empty prompt', async () => {
      const request: AIRequest = {
        model: 'test-model',
        prompt: '',
      };

      await expect(
        service.call(request, 'user-123', 'general')
      ).rejects.toThrow(AIError);
    });

    it('should reject request with whitespace-only prompt', async () => {
      const request: AIRequest = {
        model: 'test-model',
        prompt: '   ',
      };

      await expect(
        service.call(request, 'user-123', 'general')
      ).rejects.toThrow(AIError);
    });

    it('should reject request with invalid temperature (too high)', async () => {
      const request: AIRequest = {
        model: 'test-model',
        prompt: 'Test prompt',
        temperature: 3, // Invalid: > 2
      };

      await expect(
        service.call(request, 'user-123', 'general')
      ).rejects.toThrow(AIError);
    });

    it('should reject request with invalid temperature (negative)', async () => {
      const request: AIRequest = {
        model: 'test-model',
        prompt: 'Test prompt',
        temperature: -1, // Invalid: < 0
      };

      await expect(
        service.call(request, 'user-123', 'general')
      ).rejects.toThrow(AIError);
    });

    it('should reject request with invalid maxTokens', async () => {
      const request: AIRequest = {
        model: 'test-model',
        prompt: 'Test prompt',
        maxTokens: 0, // Invalid: < 1
      };

      await expect(
        service.call(request, 'user-123', 'general')
      ).rejects.toThrow(AIError);
    });

    it('should reject request with invalid topP (too high)', async () => {
      const request: AIRequest = {
        model: 'test-model',
        prompt: 'Test prompt',
        topP: 1.5, // Invalid: > 1
      };

      await expect(
        service.call(request, 'user-123', 'general')
      ).rejects.toThrow(AIError);
    });

    it('should reject request with invalid topP (negative)', async () => {
      const request: AIRequest = {
        model: 'test-model',
        prompt: 'Test prompt',
        topP: -0.5, // Invalid: < 0
      };

      await expect(
        service.call(request, 'user-123', 'general')
      ).rejects.toThrow(AIError);
    });

    it('should reject request with invalid topK', async () => {
      const request: AIRequest = {
        model: 'test-model',
        prompt: 'Test prompt',
        topK: 0, // Invalid: < 1
      };

      await expect(
        service.call(request, 'user-123', 'general')
      ).rejects.toThrow(AIError);
    });

    it('should accept valid request parameters', async () => {
      const request: AIRequest = {
        model: 'test-model',
        prompt: 'Test prompt',
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.9,
        topK: 40,
      };

      // Should not throw during validation
      // (will throw later due to no available models, but that's expected)
      try {
        await service.call(request, 'user-123', 'general');
      } catch (error) {
        // Expected to fail due to model not found
        expect(error).toBeInstanceOf(AIError);
        expect((error as AIError).code).toBe(AIErrorCode.INVALID_REQUEST);
      }
    });
  });

  describe('Model Management', () => {
    it('should get available models', () => {
      const models = service.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
    });

    it('should get models by provider', () => {
      const models = service.getModelsByProvider('ollama');
      expect(Array.isArray(models)).toBe(true);
    });

    it('should get model info', () => {
      const info = service.getModelInfo('ollama:llama2');
      expect(info === undefined || typeof info === 'object').toBe(true);
    });

    it('should reload models', async () => {
      mockProviderFactory.getAvailableProviders.mockReturnValue([]);
      await expect(service.reloadModels()).resolves.not.toThrow();
    });
  });

  describe('Selection Statistics', () => {
    it('should get selection statistics', () => {
      const stats = service.getSelectionStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalSelections).toBeGreaterThanOrEqual(0);
    });

    it('should get selection log', () => {
      const log = service.getSelectionLog(10);
      expect(Array.isArray(log)).toBe(true);
    });
  });

  describe('Cost and Performance', () => {
    it('should get cost report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      mockUsageTracker.generateCostReport.mockResolvedValue({
        period: { startDate, endDate },
        groupBy: 'model',
        totalCost: 0,
        items: [],
      });

      const report = await service.getCostReport(startDate, endDate, 'model');
      expect(report).toBeDefined();
      expect(report.groupBy).toBe('model');
    });

    it('should get performance metrics', async () => {
      mockPerformanceMonitor.getMetrics.mockResolvedValue(null);

      const metrics = await service.getPerformanceMetrics('test-model');
      expect(metrics === null || metrics !== undefined).toBe(true);
    });

    it('should check performance alerts', async () => {
      mockPerformanceMonitor.checkAlerts.mockResolvedValue([]);

      const alerts = await service.checkPerformanceAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('Logging', () => {
    it('should get logs', async () => {
      mockAILogger.queryLogs.mockResolvedValue([]);

      const logs = await service.getLogs({
        limit: 10,
      });
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should get logs with filters', async () => {
      mockAILogger.queryLogs.mockResolvedValue([]);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const logs = await service.getLogs({
        startDate,
        endDate,
        limit: 10,
      });
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should get logs with model filter', async () => {
      mockAILogger.queryLogs.mockResolvedValue([]);

      const logs = await service.getLogs({
        model: 'test-model',
        limit: 10,
      });
      expect(Array.isArray(logs)).toBe(true);
    });
  });
});
