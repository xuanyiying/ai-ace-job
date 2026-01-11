/**
 * Open Source Model Interface Tests
 * Validates that open source model types and interfaces are correctly defined
 * Requirements: 2.1, 2.2
 */

import {
  ModelFamily,
  LLMModelInfo,
  ScenarioType,
  SelectionStrategyType,
  ScenarioConfig,
  ModelMetrics,
  ModelRegistrationData,
  ModelSelectionContext,
  ModelSelectionResult,
  ModelHealthStatus,
} from './model.interface';

describe('Open Source Model Interfaces', () => {
  describe('ModelFamily Enumeration', () => {
    it('should have all required model families', () => {
      expect(ModelFamily.QWEN).toBe('qwen');
      expect(ModelFamily.LLAMA).toBe('llama');
      expect(ModelFamily.DEEPSEEK).toBe('deepseek');
      expect(ModelFamily.MISTRAL).toBe('mistral');
      expect(ModelFamily.OTHER).toBe('other');
    });
  });

  describe('ScenarioType Enumeration', () => {
    it('should have all core scenarios', () => {
      expect(ScenarioType.RESUME_PARSING).toBe('resume-parsing');
      expect(ScenarioType.JOB_DESCRIPTION_PARSING).toBe(
        'job-description-parsing'
      );
      expect(ScenarioType.RESUME_OPTIMIZATION).toBe('resume-optimization');
      expect(ScenarioType.INTERVIEW_QUESTION_GENERATION).toBe(
        'interview-question-generation'
      );
      expect(ScenarioType.MATCH_SCORE_CALCULATION).toBe(
        'match-score-calculation'
      );
    });

    it('should have all agent scenarios', () => {
      expect(ScenarioType.AGENT_STAR_EXTRACTION).toBe('agent-star-extraction');
      expect(ScenarioType.AGENT_KEYWORD_MATCHING).toBe(
        'agent-keyword-matching'
      );
      expect(ScenarioType.AGENT_INTRODUCTION_GENERATION).toBe(
        'agent-introduction-generation'
      );
      expect(ScenarioType.AGENT_CONTEXT_ANALYSIS).toBe(
        'agent-context-analysis'
      );
      expect(ScenarioType.AGENT_CUSTOM_QUESTION_GENERATION).toBe(
        'agent-custom-question-generation'
      );
      expect(ScenarioType.AGENT_QUESTION_PRIORITIZATION).toBe(
        'agent-question-prioritization'
      );
      expect(ScenarioType.AGENT_INTERVIEW_INITIALIZATION).toBe(
        'agent-interview-initialization'
      );
      expect(ScenarioType.AGENT_RESPONSE_PROCESSING).toBe(
        'agent-response-processing'
      );
      expect(ScenarioType.AGENT_RESPONSE_ANALYSIS).toBe(
        'agent-response-analysis'
      );
      expect(ScenarioType.AGENT_INTERVIEW_CONCLUSION).toBe(
        'agent-interview-conclusion'
      );
      expect(ScenarioType.AGENT_CONTEXT_COMPRESSION).toBe(
        'agent-context-compression'
      );
      expect(ScenarioType.AGENT_RAG_RETRIEVAL).toBe('agent-rag-retrieval');
    });

    it('should have general scenario', () => {
      expect(ScenarioType.GENERAL).toBe('general');
    });
  });

  describe('SelectionStrategyType Enumeration', () => {
    it('should have all selection strategies', () => {
      expect(SelectionStrategyType.QUALITY).toBe('quality');
      expect(SelectionStrategyType.COST).toBe('cost');
      expect(SelectionStrategyType.LATENCY).toBe('latency');
      expect(SelectionStrategyType.BALANCED).toBe('balanced');
    });
  });

  describe('LLMModelInfo Interface', () => {
    it('should allow creating a valid Qwen model', () => {
      const model: LLMModelInfo = {
        name: 'Qwen2.5-7B-Instruct',
        provider: 'qwen',
        family: ModelFamily.QWEN,
        parameterSize: '7B',
        contextWindow: 32768,
        costPerInputToken: 0.0001,
        costPerOutputToken: 0.0002,
        latency: 800,
        successRate: 0.98,
        isAvailable: true,
        qualityRating: 7,
        avgLatencyMs: 800,
        supportedFeatures: ['chat', 'function-calling'],
      };

      expect(model.name).toBe('Qwen2.5-7B-Instruct');
      expect(model.family).toBe(ModelFamily.QWEN);
      expect(model.parameterSize).toBe('7B');
      expect(model.qualityRating).toBe(7);
    });

    it('should allow creating a valid Llama model', () => {
      const model: LLMModelInfo = {
        name: 'Llama-3.1-70B-Instruct',
        provider: 'meta',
        family: ModelFamily.LLAMA,
        parameterSize: '70B',
        contextWindow: 131072,
        costPerInputToken: 0.0005,
        costPerOutputToken: 0.001,
        latency: 2800,
        successRate: 0.95,
        isAvailable: true,
        qualityRating: 9,
        avgLatencyMs: 2800,
        supportedFeatures: ['chat', 'function-calling', 'reasoning', 'code'],
      };

      expect(model.name).toBe('Llama-3.1-70B-Instruct');
      expect(model.family).toBe(ModelFamily.LLAMA);
      expect(model.parameterSize).toBe('70B');
      expect(model.qualityRating).toBe(9);
    });

    it('should allow creating a valid DeepSeek model', () => {
      const model: LLMModelInfo = {
        name: 'DeepSeek-V3',
        provider: 'deepseek',
        family: ModelFamily.DEEPSEEK,
        parameterSize: '671B',
        contextWindow: 65536,
        costPerInputToken: 0.0004,
        costPerOutputToken: 0.0008,
        latency: 2500,
        successRate: 0.96,
        isAvailable: true,
        qualityRating: 9,
        avgLatencyMs: 2500,
        supportedFeatures: ['chat', 'function-calling', 'reasoning', 'code'],
      };

      expect(model.name).toBe('DeepSeek-V3');
      expect(model.family).toBe(ModelFamily.DEEPSEEK);
      expect(model.qualityRating).toBe(9);
    });

    it('should allow creating a valid Mistral model', () => {
      const model: LLMModelInfo = {
        name: 'Mistral-7B-Instruct',
        provider: 'mistral',
        family: ModelFamily.MISTRAL,
        parameterSize: '7B',
        contextWindow: 32768,
        costPerInputToken: 0.0001,
        costPerOutputToken: 0.0002,
        latency: 750,
        successRate: 0.98,
        isAvailable: true,
        qualityRating: 7,
        avgLatencyMs: 750,
        supportedFeatures: ['chat', 'function-calling'],
      };

      expect(model.name).toBe('Mistral-7B-Instruct');
      expect(model.family).toBe(ModelFamily.MISTRAL);
      expect(model.qualityRating).toBe(7);
    });

    it('should support optional health status fields', () => {
      const model: LLMModelInfo = {
        name: 'Qwen2.5-7B-Instruct',
        provider: 'qwen',
        family: ModelFamily.QWEN,
        parameterSize: '7B',
        contextWindow: 32768,
        costPerInputToken: 0.0001,
        costPerOutputToken: 0.0002,
        latency: 800,
        successRate: 0.98,
        isAvailable: true,
        qualityRating: 7,
        avgLatencyMs: 800,
        supportedFeatures: ['chat'],
        status: 'active',
        lastHealthCheckAt: new Date(),
        healthStatus: 'healthy',
      };

      expect(model.status).toBe('active');
      expect(model.healthStatus).toBe('healthy');
      expect(model.lastHealthCheckAt).toBeInstanceOf(Date);
    });
  });

  describe('ScenarioConfig Interface', () => {
    it('should allow creating a valid scenario config for resume parsing', () => {
      const config: ScenarioConfig = {
        scenario: ScenarioType.RESUME_PARSING,
        strategy: SelectionStrategyType.COST,
        primaryModels: ['Qwen2.5-7B-Instruct', 'Llama-3.2-3B-Instruct'],
        fallbackModels: ['DeepSeek-V2-Lite', 'Mistral-7B-Instruct'],
        weights: {
          quality: 0.3,
          cost: 0.5,
          latency: 0.2,
        },
        minQualityScore: 6,
      };

      expect(config.scenario).toBe(ScenarioType.RESUME_PARSING);
      expect(config.strategy).toBe(SelectionStrategyType.COST);
      expect(config.primaryModels).toHaveLength(2);
      expect(
        config.weights.quality + config.weights.cost + config.weights.latency
      ).toBeCloseTo(1.0);
    });

    it('should allow creating a valid scenario config for resume optimization', () => {
      const config: ScenarioConfig = {
        scenario: ScenarioType.RESUME_OPTIMIZATION,
        strategy: SelectionStrategyType.QUALITY,
        primaryModels: [
          'Qwen2.5-72B-Instruct',
          'DeepSeek-V3',
          'Llama-3.1-70B-Instruct',
        ],
        fallbackModels: ['Qwen2.5-32B-Instruct', 'Llama-3.1-8B-Instruct'],
        weights: {
          quality: 0.6,
          cost: 0.2,
          latency: 0.2,
        },
        minQualityScore: 8,
      };

      expect(config.scenario).toBe(ScenarioType.RESUME_OPTIMIZATION);
      expect(config.strategy).toBe(SelectionStrategyType.QUALITY);
      expect(config.minQualityScore).toBe(8);
    });

    it('should allow creating a valid scenario config for interview question generation', () => {
      const config: ScenarioConfig = {
        scenario: ScenarioType.INTERVIEW_QUESTION_GENERATION,
        strategy: SelectionStrategyType.BALANCED,
        primaryModels: ['Qwen2.5-32B-Instruct', 'Llama-3.1-8B-Instruct'],
        fallbackModels: ['Mistral-7B-Instruct', 'Qwen2.5-7B-Instruct'],
        weights: {
          quality: 0.4,
          cost: 0.3,
          latency: 0.3,
        },
      };

      expect(config.scenario).toBe(ScenarioType.INTERVIEW_QUESTION_GENERATION);
      expect(config.strategy).toBe(SelectionStrategyType.BALANCED);
    });

    it('should allow creating a valid scenario config for agent response processing', () => {
      const config: ScenarioConfig = {
        scenario: ScenarioType.AGENT_RESPONSE_PROCESSING,
        strategy: SelectionStrategyType.LATENCY,
        primaryModels: ['Qwen2.5-7B-Instruct', 'Mistral-7B-Instruct'],
        fallbackModels: ['Llama-3.2-3B-Instruct'],
        weights: {
          quality: 0.2,
          cost: 0.2,
          latency: 0.6,
        },
        maxLatencyMs: 2000,
      };

      expect(config.scenario).toBe(ScenarioType.AGENT_RESPONSE_PROCESSING);
      expect(config.strategy).toBe(SelectionStrategyType.LATENCY);
      expect(config.maxLatencyMs).toBe(2000);
    });
  });

  describe('ModelMetrics Interface', () => {
    it('should allow creating valid model metrics', () => {
      const metrics: ModelMetrics = {
        avgLatencyMs: 850,
        successRate: 0.98,
        totalCalls: 1000,
        successfulCalls: 980,
        failedCalls: 20,
        lastUpdatedAt: new Date(),
      };

      expect(metrics.avgLatencyMs).toBe(850);
      expect(metrics.successRate).toBe(0.98);
      expect(metrics.totalCalls).toBe(1000);
      expect(metrics.successfulCalls).toBe(980);
      expect(metrics.failedCalls).toBe(20);
    });
  });

  describe('ModelRegistrationData Interface', () => {
    it('should allow creating valid model registration data', () => {
      const registrationData: ModelRegistrationData = {
        name: 'Qwen2.5-7B-Instruct',
        provider: 'qwen',
        family: ModelFamily.QWEN,
        parameterSize: '7B',
        contextWindow: 32768,
        costPerInputToken: 0.0001,
        costPerOutputToken: 0.0002,
        avgLatencyMs: 800,
        qualityRating: 7,
        supportedFeatures: ['chat', 'function-calling'],
        isAvailable: true,
        status: 'active',
      };

      expect(registrationData.name).toBe('Qwen2.5-7B-Instruct');
      expect(registrationData.family).toBe(ModelFamily.QWEN);
      expect(registrationData.status).toBe('active');
    });
  });

  describe('ModelSelectionContext Interface', () => {
    it('should allow creating valid model selection context', () => {
      const context: ModelSelectionContext = {
        scenario: ScenarioType.RESUME_PARSING,
        estimatedInputTokens: 1000,
        estimatedOutputTokens: 500,
        maxLatency: 2000,
        maxCost: 0.01,
        minQualityScore: 6,
        userId: 'user-123',
        metadata: {
          source: 'api',
          version: '1.0',
        },
      };

      expect(context.scenario).toBe(ScenarioType.RESUME_PARSING);
      expect(context.estimatedInputTokens).toBe(1000);
      expect(context.maxLatency).toBe(2000);
    });
  });

  describe('ModelSelectionResult Interface', () => {
    it('should allow creating valid model selection result', () => {
      const model: LLMModelInfo = {
        name: 'Qwen2.5-7B-Instruct',
        provider: 'qwen',
        family: ModelFamily.QWEN,
        parameterSize: '7B',
        contextWindow: 32768,
        costPerInputToken: 0.0001,
        costPerOutputToken: 0.0002,
        latency: 800,
        successRate: 0.98,
        isAvailable: true,
        qualityRating: 7,
        avgLatencyMs: 800,
        supportedFeatures: ['chat'],
      };

      const result: ModelSelectionResult = {
        model,
        strategy: SelectionStrategyType.COST,
        availableModelsCount: 5,
        isFallback: false,
        reason: 'Selected lowest cost model',
        selectedAt: new Date(),
      };

      expect(result.model.name).toBe('Qwen2.5-7B-Instruct');
      expect(result.strategy).toBe(SelectionStrategyType.COST);
      expect(result.isFallback).toBe(false);
    });
  });

  describe('ModelHealthStatus Interface', () => {
    it('should allow creating valid model health status', () => {
      const healthStatus: ModelHealthStatus = {
        modelName: 'Qwen2.5-7B-Instruct',
        status: 'healthy',
        lastCheckAt: new Date(),
        responseTimeMs: 850,
      };

      expect(healthStatus.modelName).toBe('Qwen2.5-7B-Instruct');
      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.responseTimeMs).toBe(850);
    });

    it('should allow creating unhealthy model health status with error message', () => {
      const healthStatus: ModelHealthStatus = {
        modelName: 'Qwen2.5-7B-Instruct',
        status: 'unhealthy',
        lastCheckAt: new Date(),
        errorMessage: 'Connection timeout',
      };

      expect(healthStatus.status).toBe('unhealthy');
      expect(healthStatus.errorMessage).toBe('Connection timeout');
    });
  });

  describe('Type Validation', () => {
    it('should validate scenario config weights sum to 1', () => {
      const config: ScenarioConfig = {
        scenario: ScenarioType.RESUME_PARSING,
        strategy: SelectionStrategyType.COST,
        primaryModels: ['Qwen2.5-7B-Instruct'],
        fallbackModels: [],
        weights: {
          quality: 0.3,
          cost: 0.5,
          latency: 0.2,
        },
      };

      const weightSum =
        config.weights.quality + config.weights.cost + config.weights.latency;
      expect(weightSum).toBeCloseTo(1.0, 5);
    });

    it('should support all model families', () => {
      const families = [
        ModelFamily.QWEN,
        ModelFamily.LLAMA,
        ModelFamily.DEEPSEEK,
        ModelFamily.MISTRAL,
        ModelFamily.OTHER,
      ];

      expect(families).toHaveLength(5);
      families.forEach((family) => {
        expect(typeof family).toBe('string');
      });
    });

    it('should support all scenario types', () => {
      const scenarios = Object.values(ScenarioType);
      expect(scenarios.length).toBeGreaterThan(0);
      scenarios.forEach((scenario) => {
        expect(typeof scenario).toBe('string');
      });
    });

    it('should support all selection strategies', () => {
      const strategies = [
        SelectionStrategyType.QUALITY,
        SelectionStrategyType.COST,
        SelectionStrategyType.LATENCY,
        SelectionStrategyType.BALANCED,
      ];

      expect(strategies).toHaveLength(4);
      strategies.forEach((strategy) => {
        expect(typeof strategy).toBe('string');
      });
    });
  });
});
