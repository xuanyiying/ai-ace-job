/**
 * Scenario Model Mapping Service
 * Manages the mapping between application scenarios and recommended models
 * Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ScenarioConfig,
  ScenarioType,
  SelectionStrategyType,
  LLMModelInfo,
} from '../interfaces/model.interface';

/**
 * Default scenario configurations
 * Defines the recommended models and strategies for each scenario
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
const DEFAULT_SCENARIO_CONFIGS: Record<ScenarioType, ScenarioConfig> = {
  // Resume parsing - cost optimized (high volume, low complexity)
  [ScenarioType.RESUME_PARSING]: {
    scenario: ScenarioType.RESUME_PARSING,
    strategy: SelectionStrategyType.COST,
    primaryModels: [
      'ollama:deepseek-r1:1.5b',
      'qwen:qwen-turbo',
      'qwen:qwen3-coder-flash',
    ],
    fallbackModels: ['qwen:glm-4.7', 'qwen:qwen3-max-preview'],
    weights: { quality: 0.3, cost: 0.5, latency: 0.2 },
    minQualityScore: 6,
  },

  // Resume optimization - quality focused
  [ScenarioType.RESUME_OPTIMIZATION]: {
    scenario: ScenarioType.RESUME_OPTIMIZATION,
    strategy: SelectionStrategyType.QUALITY,
    primaryModels: [
      'qwen:qwen3-max-preview',
      'qwen:kimi-k2-thinking',
      'siliconcloud:deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
    ],
    fallbackModels: ['qwen:deepseek-v3.2', 'qwen:glm-4.7'],
    weights: { quality: 0.6, cost: 0.2, latency: 0.2 },
    minQualityScore: 8,
  },

  // Resume analysis - quality focused
  [ScenarioType.RESUME_ANALYSIS]: {
    scenario: ScenarioType.RESUME_ANALYSIS,
    strategy: SelectionStrategyType.QUALITY,
    primaryModels: [
      'qwen:qwen3-max-preview',
      'qwen:kimi-k2-thinking',
      'siliconcloud:deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
    ],
    fallbackModels: ['qwen:deepseek-v3.2', 'qwen:glm-4.7'],
    weights: { quality: 0.6, cost: 0.2, latency: 0.2 },
    minQualityScore: 8,
  },

  // Resume content optimization - quality focused
  [ScenarioType.RESUME_CONTENT_OPTIMIZATION]: {
    scenario: ScenarioType.RESUME_CONTENT_OPTIMIZATION,
    strategy: SelectionStrategyType.QUALITY,
    primaryModels: [
      'qwen:qwen3-max-preview',
      'qwen:kimi-k2-thinking',
      'siliconcloud:deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
    ],
    fallbackModels: ['qwen:deepseek-v3.2', 'qwen:glm-4.7'],
    weights: { quality: 0.6, cost: 0.2, latency: 0.2 },
    minQualityScore: 8,
  },

  // Interview preparation - balanced
  [ScenarioType.INTERVIEW_QUESTION_GENERATION]: {
    scenario: ScenarioType.INTERVIEW_QUESTION_GENERATION,
    strategy: SelectionStrategyType.BALANCED,
    primaryModels: [
      'qwen:qwen3-max-preview',
      'qwen:deepseek-v3.2',
      'qwen:Moonshot-Kimi-K2-Instruct',
    ],
    fallbackModels: ['qwen:glm-4.7', 'qwen:qwen-turbo'],
    weights: { quality: 0.4, cost: 0.3, latency: 0.3 },
  },

  // Job description parsing - cost optimized
  [ScenarioType.JOB_DESCRIPTION_PARSING]: {
    scenario: ScenarioType.JOB_DESCRIPTION_PARSING,
    strategy: SelectionStrategyType.COST,
    primaryModels: ['ollama:deepseek-r1:1.5b', 'qwen:qwen-turbo'],
    fallbackModels: ['qwen:glm-4.7', 'qwen:qwen3-coder-flash'],
    weights: { quality: 0.3, cost: 0.5, latency: 0.2 },
    minQualityScore: 6,
  },

  // Match score calculation - balanced strategy
  [ScenarioType.MATCH_SCORE_CALCULATION]: {
    scenario: ScenarioType.MATCH_SCORE_CALCULATION,
    strategy: SelectionStrategyType.BALANCED,
    primaryModels: [
      'qwen:qwen3-max-preview',
      'qwen:deepseek-v3.2',
      'qwen:glm-4.7',
    ],
    fallbackModels: ['qwen:qwen-turbo', 'qwen:Moonshot-Kimi-K2-Instruct'],
    weights: { quality: 0.4, cost: 0.3, latency: 0.3 },
  },

  // Agent scenarios
  // STAR extraction - cost optimized (information extraction, high volume)
  [ScenarioType.AGENT_STAR_EXTRACTION]: {
    scenario: ScenarioType.AGENT_STAR_EXTRACTION,
    strategy: SelectionStrategyType.COST,
    primaryModels: ['qwen:qwen-turbo', 'qwen:qwen3-coder-flash'],
    fallbackModels: ['qwen:glm-4.7', 'ollama:deepseek-r1:1.5b'],
    weights: { quality: 0.3, cost: 0.5, latency: 0.2 },
    minQualityScore: 6,
  },

  // Keyword matching - cost optimized
  [ScenarioType.AGENT_KEYWORD_MATCHING]: {
    scenario: ScenarioType.AGENT_KEYWORD_MATCHING,
    strategy: SelectionStrategyType.COST,
    primaryModels: ['qwen:qwen-turbo', 'qwen:qwen3-coder-flash'],
    fallbackModels: ['qwen:glm-4.7', 'ollama:deepseek-r1:1.5b'],
    weights: { quality: 0.3, cost: 0.5, latency: 0.2 },
    minQualityScore: 6,
  },

  // Introduction generation - quality optimized (user-facing)
  [ScenarioType.AGENT_INTRODUCTION_GENERATION]: {
    scenario: ScenarioType.AGENT_INTRODUCTION_GENERATION,
    strategy: SelectionStrategyType.QUALITY,
    primaryModels: [
      'qwen:qwen3-max-preview',
      'qwen:kimi-k2-thinking',
      'siliconcloud:deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
    ],
    fallbackModels: ['qwen:deepseek-v3.2', 'qwen:Moonshot-Kimi-K2-Instruct'],
    weights: { quality: 0.6, cost: 0.2, latency: 0.2 },
    minQualityScore: 8,
  },

  // Context analysis - cost optimized (information extraction)
  [ScenarioType.AGENT_CONTEXT_ANALYSIS]: {
    scenario: ScenarioType.AGENT_CONTEXT_ANALYSIS,
    strategy: SelectionStrategyType.COST,
    primaryModels: ['qwen:qwen-turbo', 'ollama:deepseek-r1:1.5b'],
    fallbackModels: ['qwen:glm-4.7', 'qwen:qwen3-coder-flash'],
    weights: { quality: 0.3, cost: 0.5, latency: 0.2 },
    minQualityScore: 6,
  },

  // Custom question generation - quality optimized (user-facing)
  [ScenarioType.AGENT_CUSTOM_QUESTION_GENERATION]: {
    scenario: ScenarioType.AGENT_CUSTOM_QUESTION_GENERATION,
    strategy: SelectionStrategyType.QUALITY,
    primaryModels: [
      'qwen:qwen3-max-preview',
      'qwen:kimi-k2-thinking',
      'siliconcloud:deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
    ],
    fallbackModels: ['qwen:deepseek-v3.2', 'qwen:glm-4.7'],
    weights: { quality: 0.6, cost: 0.2, latency: 0.2 },
    minQualityScore: 8,
  },

  // Question prioritization - balanced
  [ScenarioType.AGENT_QUESTION_PRIORITIZATION]: {
    scenario: ScenarioType.AGENT_QUESTION_PRIORITIZATION,
    strategy: SelectionStrategyType.BALANCED,
    primaryModels: ['qwen:glm-4.7', 'qwen:deepseek-v3.2'],
    fallbackModels: ['qwen:qwen-turbo', 'qwen:Moonshot-Kimi-K2-Instruct'],
    weights: { quality: 0.4, cost: 0.3, latency: 0.3 },
  },

  // Interview initialization - quality optimized (sets tone)
  [ScenarioType.AGENT_INTERVIEW_INITIALIZATION]: {
    scenario: ScenarioType.AGENT_INTERVIEW_INITIALIZATION,
    strategy: SelectionStrategyType.QUALITY,
    primaryModels: [
      'qwen:qwen3-max-preview',
      'qwen:kimi-k2-thinking',
      'siliconcloud:deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
    ],
    fallbackModels: ['qwen:deepseek-v3.2', 'qwen:glm-4.7'],
    weights: { quality: 0.6, cost: 0.2, latency: 0.2 },
    minQualityScore: 8,
  },

  // Response processing - latency optimized (real-time interaction)
  [ScenarioType.AGENT_RESPONSE_PROCESSING]: {
    scenario: ScenarioType.AGENT_RESPONSE_PROCESSING,
    strategy: SelectionStrategyType.LATENCY,
    primaryModels: ['qwen:qwen-turbo', 'qwen:glm-4.7'],
    fallbackModels: ['ollama:deepseek-r1:1.5b', 'qwen:qwen3-coder-flash'],
    weights: { quality: 0.2, cost: 0.2, latency: 0.6 },
    maxLatencyMs: 2000,
  },

  // Response analysis - balanced
  [ScenarioType.AGENT_RESPONSE_ANALYSIS]: {
    scenario: ScenarioType.AGENT_RESPONSE_ANALYSIS,
    strategy: SelectionStrategyType.BALANCED,
    primaryModels: ['qwen:deepseek-v3.2', 'qwen:glm-4.7'],
    fallbackModels: ['qwen:qwen-turbo', 'qwen:Moonshot-Kimi-K2-Instruct'],
    weights: { quality: 0.4, cost: 0.3, latency: 0.3 },
  },

  // Interview conclusion - quality optimized (important feedback)
  [ScenarioType.AGENT_INTERVIEW_CONCLUSION]: {
    scenario: ScenarioType.AGENT_INTERVIEW_CONCLUSION,
    strategy: SelectionStrategyType.QUALITY,
    primaryModels: [
      'qwen:qwen3-max-preview',
      'qwen:kimi-k2-thinking',
      'siliconcloud:deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
    ],
    fallbackModels: ['qwen:deepseek-v3.2', 'qwen:glm-4.7'],
    weights: { quality: 0.6, cost: 0.2, latency: 0.2 },
    minQualityScore: 8,
  },

  // Context compression - cost optimized (token reduction)
  [ScenarioType.AGENT_CONTEXT_COMPRESSION]: {
    scenario: ScenarioType.AGENT_CONTEXT_COMPRESSION,
    strategy: SelectionStrategyType.COST,
    primaryModels: ['qwen:qwen-turbo', 'ollama:deepseek-r1:1.5b'],
    fallbackModels: ['qwen:glm-4.7', 'qwen:qwen3-coder-flash'],
    weights: { quality: 0.3, cost: 0.5, latency: 0.2 },
    minQualityScore: 6,
  },

  // RAG retrieval - cost optimized (information retrieval)
  [ScenarioType.AGENT_RAG_RETRIEVAL]: {
    scenario: ScenarioType.AGENT_RAG_RETRIEVAL,
    strategy: SelectionStrategyType.COST,
    primaryModels: ['qwen:qwen-turbo', 'ollama:deepseek-r1:1.5b'],
    fallbackModels: ['qwen:glm-4.7', 'qwen:qwen3-coder-flash'],
    weights: { quality: 0.3, cost: 0.5, latency: 0.2 },
    minQualityScore: 6,
  },

  // Embedding generation - cost optimized
  [ScenarioType.AGENT_EMBEDDING_GENERATION]: {
    scenario: ScenarioType.AGENT_EMBEDDING_GENERATION,
    strategy: SelectionStrategyType.COST,
    primaryModels: ['qwen:text-embedding-v3', 'ollama:deepseek-r1:1.5b'],
    fallbackModels: ['qwen:text-embedding-v3'],
    weights: { quality: 0.3, cost: 0.5, latency: 0.2 },
    minQualityScore: 6,
  },

  // General scenario - balanced
  [ScenarioType.GENERAL]: {
    scenario: ScenarioType.GENERAL,
    strategy: SelectionStrategyType.BALANCED,
    primaryModels: ['qwen:qwen3-max-preview', 'qwen:deepseek-v3.2'],
    fallbackModels: ['qwen:glm-4.7', 'qwen:qwen-turbo'],
    weights: { quality: 0.4, cost: 0.3, latency: 0.3 },
  },
};

/**
 * Scenario Model Mapping Service
 * Manages scenario-to-model mappings and provides configuration management
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
@Injectable()
export class ScenarioModelMappingService {
  private readonly logger = new Logger(ScenarioModelMappingService.name);
  private scenarioConfigs: Map<ScenarioType, ScenarioConfig>;
  private availableModels: Map<string, LLMModelInfo> = new Map();

  constructor() {
    this.scenarioConfigs = new Map(
      Object.entries(DEFAULT_SCENARIO_CONFIGS) as Array<
        [ScenarioType, ScenarioConfig]
      >
    );
    this.logger.log(
      'ScenarioModelMappingService initialized with default configurations'
    );
  }

  /**
   * Get scenario configuration
   * Requirements: 1.1, 1.2
   *
   * @param scenario - Scenario type
   * @returns Scenario configuration
   * @throws Error if scenario is not found
   */
  getScenarioConfig(scenario: ScenarioType): ScenarioConfig {
    const config = this.scenarioConfigs.get(scenario);
    if (!config) {
      this.logger.warn(`Scenario configuration not found for: ${scenario}`);
      throw new Error(`Scenario configuration not found for: ${scenario}`);
    }
    // Return a deep copy to prevent external modifications
    return {
      ...config,
      primaryModels: [...config.primaryModels],
      fallbackModels: [...config.fallbackModels],
      weights: { ...config.weights },
    };
  }

  /**
   * Update scenario configuration
   * Requirements: 1.3, 1.4
   *
   * @param scenario - Scenario type
   * @param config - Partial configuration to update
   * @throws Error if weights are invalid
   */
  updateScenarioConfig(
    scenario: ScenarioType,
    config: Partial<ScenarioConfig>
  ): void {
    const existingConfig = this.scenarioConfigs.get(scenario);
    if (!existingConfig) {
      this.logger.warn(`Cannot update non-existent scenario: ${scenario}`);
      throw new Error(`Scenario configuration not found for: ${scenario}`);
    }

    // Validate weights if provided
    if (config.weights) {
      this.validateWeights(config.weights);
    }

    // Merge configurations
    const updatedConfig: ScenarioConfig = {
      ...existingConfig,
      ...config,
      scenario, // Ensure scenario is not changed
    };

    this.scenarioConfigs.set(scenario, updatedConfig);
    this.logger.log(`Updated scenario configuration for: ${scenario}`);
  }

  /**
   * Get recommended models for a scenario
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   *
   * @param scenario - Scenario type
   * @returns Array of recommended model names
   */
  getRecommendedModels(scenario: ScenarioType): string[] {
    const config = this.getScenarioConfig(scenario);
    if (!config) return [];

    // Filter available models that match primary or fallback list
    // We check both the simple name (m.name) and the provider-prefixed name (provider:name)
    return Array.from(this.availableModels.values())
      .filter((m) => {
        const fullKey = `${m.provider}:${m.name}`;
        return (
          config.primaryModels.includes(m.name) ||
          config.primaryModels.includes(fullKey) ||
          config.fallbackModels.includes(m.name) ||
          config.fallbackModels.includes(fullKey)
        );
      })
      .map((m) => m.name);
  }

  /**
   * Get primary recommended models for a scenario
   * Requirements: 1.2
   *
   * @param scenario - Scenario type
   * @returns Array of primary recommended models
   */
  getPrimaryModels(scenario: ScenarioType): string[] {
    const config = this.getScenarioConfig(scenario);
    return [...config.primaryModels];
  }

  /**
   * Get fallback models for a scenario
   * Requirements: 1.2
   *
   * @param scenario - Scenario type
   * @returns Array of fallback models
   */
  getFallbackModels(scenario: ScenarioType): string[] {
    const config = this.getScenarioConfig(scenario);
    return [...config.fallbackModels];
  }

  /**
   * Get selection strategy for a scenario
   * Requirements: 1.3
   *
   * @param scenario - Scenario type
   * @returns Selection strategy type
   */
  getSelectionStrategy(scenario: ScenarioType): SelectionStrategyType {
    const config = this.getScenarioConfig(scenario);
    return config.strategy;
  }

  /**
   * Get selection weights for a scenario
   * Requirements: 1.3
   *
   * @param scenario - Scenario type
   * @returns Selection weights
   */
  getSelectionWeights(scenario: ScenarioType): {
    quality: number;
    cost: number;
    latency: number;
  } {
    const config = this.getScenarioConfig(scenario);
    return { ...config.weights };
  }

  /**
   * Get all configured scenarios
   *
   * @returns Array of scenario types
   */
  getAllScenarios(): ScenarioType[] {
    return Array.from(this.scenarioConfigs.keys());
  }

  /**
   * Register available models for filtering
   * Used to filter recommended models by availability
   *
   * @param models - Array of available models
   */
  registerAvailableModels(models: LLMModelInfo[]): void {
    this.availableModels.clear();
    models.forEach((model) => {
      // Register with both full name (provider:name) and short name (name)
      // Full name is preferred for exact matches, short name for generic matches
      const fullKey = `${model.provider}:${model.name}`;
      this.availableModels.set(fullKey, model);

      // Only set short name if not already present to avoid overwriting
      // (e.g. if two providers have a model with the same name)
      if (!this.availableModels.has(model.name)) {
        this.availableModels.set(model.name, model);
      }
    });
    this.logger.debug(`Registered ${models.length} available models`);
  }

  /**
   * Get available recommended models for a scenario
   * Filters recommended models by availability
   *
   * @param scenario - Scenario type
   * @returns Array of available recommended models
   */
  getAvailableRecommendedModels(scenario: ScenarioType): string[] {
    const recommendedModels = this.getRecommendedModels(scenario);
    return recommendedModels.filter((modelName) =>
      this.availableModels.has(modelName)
    );
  }

  /**
   * Validate selection weights
   * Ensures weights sum to 1.0 and are in valid range
   * Requirements: 1.3
   *
   * @param weights - Weights to validate
   * @throws Error if weights are invalid
   */
  private validateWeights(weights: {
    quality: number;
    cost: number;
    latency: number;
  }): void {
    const { quality, cost, latency } = weights;

    // Check individual weights are in valid range
    if (quality < 0 || quality > 1) {
      throw new Error('Quality weight must be between 0 and 1');
    }
    if (cost < 0 || cost > 1) {
      throw new Error('Cost weight must be between 0 and 1');
    }
    if (latency < 0 || latency > 1) {
      throw new Error('Latency weight must be between 0 and 1');
    }

    // Check weights sum to 1.0 (with small tolerance for floating point)
    const sum = quality + cost + latency;
    const tolerance = 0.0001;
    if (Math.abs(sum - 1.0) > tolerance) {
      throw new Error(
        `Weights must sum to 1.0, got ${sum.toFixed(4)} (quality: ${quality}, cost: ${cost}, latency: ${latency})`
      );
    }
  }

  /**
   * Reset all configurations to defaults
   */
  resetToDefaults(): void {
    this.scenarioConfigs = new Map(
      Object.entries(DEFAULT_SCENARIO_CONFIGS) as Array<
        [ScenarioType, ScenarioConfig]
      >
    );
    this.logger.log('Reset all scenario configurations to defaults');
  }
}
