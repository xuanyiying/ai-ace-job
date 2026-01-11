/**
 * Strategy Configuration
 * Defines configurable parameters for model selection strategies
 * Requirements: 3.1, 4.4, 5.3
 */

/**
 * Configuration for selection strategies
 */
export abstract class StrategyConfig {
  quality: QualityStrategyConfig;
  cost: CostStrategyConfig;
  latency: LatencyStrategyConfig;
}

/**
 * Quality Optimized Strategy Configuration
 * Requirements: 3.1, 3.3
 */
export interface QualityStrategyConfig {
  // Quality ranking of models (higher index = higher quality)
  // Default ranking includes both proprietary and open source models
  qualityRanking: string[];
}

/**
 * Cost Optimized Strategy Configuration
 * Requirements: 4.3, 4.4
 */
export interface CostStrategyConfig {
  // Minimum quality score threshold (1-10 scale)
  minQualityThreshold: number;

  // Low-cost open source models recommended for cost optimization
  lowCostModels: string[];
}

/**
 * Latency Optimized Strategy Configuration
 * Requirements: 5.3
 */
export interface LatencyStrategyConfig {
  // Maximum acceptable latency in milliseconds
  maxLatencyThreshold: number;
}

/**
 * Default strategy configuration
 * These values can be overridden via environment variables or configuration files
 * Requirements: 3.1, 4.4, 5.3
 */
export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  quality: {
    // Quality ranking with open source models
    // Higher index = higher quality
    qualityRanking: [
      'deepseek-r1:1.5b',
      'llama3.2:latest',
      'llama3.2:7b',
      'Qwen2.5-7B-Instruct',
      'Qwen2.5-32B-Instruct',
      'Qwen2.5-72B-Instruct',
    ],
  },
  cost: {
    // Minimum quality score threshold (1-10 scale)
    minQualityThreshold: 6,

    // Low-cost open source models recommended for cost optimization
    lowCostModels: [
      'deepseek-r1:1.5b',
      'llama3.2:latest',
      'Qwen2.5-7B-Instruct',
    ],
  },
  latency: {
    // Maximum acceptable latency in milliseconds
    maxLatencyThreshold: 5000,
  },
};
