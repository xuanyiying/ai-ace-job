/**
 * Model Selection Strategy Interface
 * Defines the interface for different model selection strategies
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { ModelInfo } from '../interfaces';
import { DEFAULT_STRATEGY_CONFIG } from './strategy-config';

/**
 * Selection context for model selection
 */
export interface SelectionContext {
  scenario: string; // Scenario name
  inputTokens?: number;
  maxLatency?: number;
  maxCost?: number;
}

/**
 * Model Selection Strategy Interface
 * Implementations define how to select the best model for a given context
 */
export interface ModelSelectionStrategy {
  /**
   * Select the best model from available models
   * @param availableModels - Array of available models
   * @param context - Selection context
   * @returns The selected model
   */
  selectModel(
    availableModels: ModelInfo[],
    context: SelectionContext
  ): ModelInfo;
}

/**
 * Cost Optimized Strategy
 * Selects the model with the lowest total cost (input + output tokens)
 * while maintaining a minimum quality threshold
 * Used for scenarios like resume parsing where cost is the primary concern
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export class CostOptimizedStrategy implements ModelSelectionStrategy {
  /**
   * Minimum quality score threshold (1-10 scale)
   * Models below this threshold will not be selected unless no other options exist
   * Requirements: 4.3
   */
  private minQualityThreshold: number;

  /**
   * Low-cost open source models recommended for cost optimization
   * Requirements: 4.4
   */
  private lowCostModels: string[];

  constructor(config?: {
    minQualityThreshold?: number;
    lowCostModels?: string[];
  }) {
    // Load from config or use defaults
    this.minQualityThreshold =
      config?.minQualityThreshold ??
      DEFAULT_STRATEGY_CONFIG.cost.minQualityThreshold;
    this.lowCostModels =
      config?.lowCostModels ?? DEFAULT_STRATEGY_CONFIG.cost.lowCostModels;
  }

  /**
   * Set the minimum quality threshold
   * Requirements: 4.3
   *
   * @param threshold - Minimum quality score (1-10)
   */
  setMinQualityThreshold(threshold: number): void {
    this.minQualityThreshold = Math.max(1, Math.min(10, threshold));
  }

  /**
   * Get the current minimum quality threshold
   *
   * @returns Current minimum quality threshold
   */
  getMinQualityThreshold(): number {
    return this.minQualityThreshold;
  }

  /**
   * Set the list of low-cost models
   * Requirements: 4.4
   *
   * @param models - Array of low-cost model names
   */
  setLowCostModels(models: string[]): void {
    this.lowCostModels = models;
  }

  /**
   * Get the list of low-cost models
   *
   * @returns Array of low-cost model names
   */
  getLowCostModels(): string[] {
    return [...this.lowCostModels];
  }

  /**
   * Calculate the total cost for a model
   * Requirements: 4.2
   *
   * @param model - The model to calculate cost for
   * @param estimatedInputTokens - Estimated number of input tokens (default: 1000)
   * @param estimatedOutputTokens - Estimated number of output tokens (default: 500)
   * @returns Total cost
   */
  calculateTotalCost(
    model: ModelInfo,
    estimatedInputTokens: number = 1000,
    estimatedOutputTokens: number = 500
  ): number {
    const inputCost = model.costPerInputToken * estimatedInputTokens;
    const outputCost = model.costPerOutputToken * estimatedOutputTokens;
    return inputCost + outputCost;
  }

  /**
   * Check if a model meets the quality threshold
   *
   * @param model - The model to check
   * @returns true if model meets quality threshold, false otherwise
   */
  private meetsQualityThreshold(model: ModelInfo): boolean {
    // Check if model has qualityRating property (for OpenSourceModelInfo)
    const qualityRating = (model as ModelInfo & { qualityRating?: number })
      .qualityRating;
    if (qualityRating !== undefined) {
      return qualityRating >= this.minQualityThreshold;
    }
    // If no quality rating, assume it meets threshold
    return true;
  }

  /**
   * Check if a model is a low-cost model
   *
   * @param model - The model to check
   * @returns true if model is in low-cost list, false otherwise
   */
  private isLowCostModel(model: ModelInfo): boolean {
    const modelNameLower = model.name.toLowerCase();
    return this.lowCostModels.some((lowCostModel) => {
      const lowCostModelLower = lowCostModel.toLowerCase();
      return (
        modelNameLower === lowCostModelLower ||
        modelNameLower.startsWith(lowCostModelLower + '-') ||
        modelNameLower.endsWith('-' + lowCostModelLower)
      );
    });
  }

  /**
   * Select the lowest cost model that meets quality requirements
   * Requirements: 4.1, 4.2, 4.3
   *
   * @param availableModels - Array of available models
   * @param context - Selection context
   * @returns The selected model
   */
  selectModel(
    availableModels: ModelInfo[],
    context: SelectionContext
  ): ModelInfo {
    if (availableModels.length === 0) {
      throw new Error('No available models for selection');
    }

    // First, try to find models that meet quality threshold
    let candidates = availableModels.filter((m) =>
      this.meetsQualityThreshold(m)
    );

    // If no models meet quality threshold, use all available models
    // Requirements: 4.3 - Fallback when no models meet threshold
    if (candidates.length === 0) {
      candidates = availableModels;
    }

    // Filter models that meet cost constraints if specified
    if (context.maxCost !== undefined) {
      const costFilteredCandidates = candidates.filter(
        (m) => m.costPerInputToken + m.costPerOutputToken <= context.maxCost!
      );
      if (costFilteredCandidates.length > 0) {
        candidates = costFilteredCandidates;
      }
    }

    // Select the model with the lowest total cost
    // Requirements: 4.1, 4.2
    return candidates.reduce((min, current) => {
      const currentCost =
        current.costPerInputToken + current.costPerOutputToken;
      const minCost = min.costPerInputToken + min.costPerOutputToken;
      return currentCost < minCost ? current : min;
    });
  }
}

/**
 * Quality Optimized Strategy
 * Selects the model with the highest quality (usually the latest/most capable model)
 * Used for scenarios like optimization suggestions where quality is the primary concern
 * Requirements: 3.1, 3.2, 3.3
 */
export class QualityOptimizedStrategy implements ModelSelectionStrategy {
  // Configurable quality ranking of models (higher index = higher quality)
  // Default ranking includes both proprietary and open source models
  private qualityRanking: string[];

  constructor(config?: { qualityRanking?: string[] }) {
    // Load from config or use defaults
    this.qualityRanking =
      config?.qualityRanking ?? DEFAULT_STRATEGY_CONFIG.quality.qualityRanking;
  }

  /**
   * Update the quality ranking list
   * Requirements: 3.1
   *
   * @param ranking - New quality ranking list
   */
  updateQualityRanking(ranking: string[]): void {
    this.qualityRanking = ranking;
  }

  /**
   * Get the current quality ranking
   *
   * @returns Current quality ranking list
   */
  getQualityRanking(): string[] {
    return [...this.qualityRanking];
  }

  /**
   * Select the highest quality model from available models
   * Requirements: 3.2, 3.3
   *
   * @param availableModels - Array of available models
   * @param _context - Selection context
   * @returns The highest quality available model
   */
  selectModel(
    availableModels: ModelInfo[],
    _context: SelectionContext
  ): ModelInfo {
    if (availableModels.length === 0) {
      throw new Error('No available models for selection');
    }

    // Try to find the highest quality model in the ranking
    // Iterate from highest quality (end) to lowest quality (start)
    for (let i = this.qualityRanking.length - 1; i >= 0; i--) {
      const rankingModel = this.qualityRanking[i];
      const found = availableModels.find((m) => {
        const modelNameLower = m.name.toLowerCase();
        const rankingModelLower = rankingModel.toLowerCase();
        // Exact match or match at word boundary
        return (
          modelNameLower === rankingModelLower ||
          modelNameLower.startsWith(rankingModelLower + '-') ||
          modelNameLower.endsWith('-' + rankingModelLower)
        );
      });
      if (found) {
        return found;
      }
    }

    // If no ranked model found, return the first available model (fallback)
    // Requirements: 3.4 - Quality degradation logic
    return availableModels[0];
  }

  /**
   * Get the quality rank of a model
   * Higher rank = higher quality
   *
   * @param modelName - Name of the model
   * @returns Quality rank (0-based index), or -1 if not in ranking
   */
  getModelQualityRank(modelName: string): number {
    const modelNameLower = modelName.toLowerCase();
    for (let i = 0; i < this.qualityRanking.length; i++) {
      const rankingModel = this.qualityRanking[i].toLowerCase();
      if (
        modelNameLower === rankingModel ||
        modelNameLower.startsWith(rankingModel + '-') ||
        modelNameLower.endsWith('-' + rankingModel)
      ) {
        return i;
      }
    }
    return -1;
  }
}

/**
 * Latency Optimized Strategy
 * Selects the model with the lowest latency (fastest response time)
 * Used for scenarios like interview question generation where speed is important
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export class LatencyOptimizedStrategy implements ModelSelectionStrategy {
  /**
   * Maximum acceptable latency in milliseconds
   * Requirements: 5.3
   */
  private maxLatencyThreshold: number;

  /**
   * Logger for warning messages when threshold is exceeded
   * Requirements: 5.4
   */
  private logger: { warn: (message: string) => void } = {
    warn: (message: string) => console.warn(message),
  };

  constructor(config?: { maxLatencyThreshold?: number }) {
    // Load from config or use defaults
    this.maxLatencyThreshold =
      config?.maxLatencyThreshold ??
      DEFAULT_STRATEGY_CONFIG.latency.maxLatencyThreshold;
  }

  /**
   * Set the maximum latency threshold
   * Requirements: 5.3
   *
   * @param threshold - Maximum acceptable latency in milliseconds
   */
  setMaxLatencyThreshold(threshold: number): void {
    this.maxLatencyThreshold = Math.max(0, threshold);
  }

  /**
   * Get the current maximum latency threshold
   *
   * @returns Current maximum latency threshold
   */
  getMaxLatencyThreshold(): number {
    return this.maxLatencyThreshold;
  }

  /**
   * Set a custom logger for warning messages
   * Requirements: 5.4
   *
   * @param logger - Logger object with warn method
   */
  setLogger(logger: { warn: (message: string) => void }): void {
    this.logger = logger;
  }

  /**
   * Select the model with the lowest latency
   * Requirements: 5.1, 5.2, 5.3, 5.4
   *
   * @param availableModels - Array of available models
   * @param context - Selection context
   * @returns The selected model with lowest latency
   */
  selectModel(
    availableModels: ModelInfo[],
    context: SelectionContext
  ): ModelInfo {
    if (availableModels.length === 0) {
      throw new Error('No available models for selection');
    }

    // Determine the effective max latency threshold
    // Use context maxLatency if provided, otherwise use configured threshold
    // Requirements: 5.2, 5.3
    const effectiveMaxLatency =
      context.maxLatency !== undefined
        ? context.maxLatency
        : this.maxLatencyThreshold;

    // Filter models that meet latency constraints if specified
    // Requirements: 5.2
    let candidates = availableModels;
    const modelsWithinThreshold = availableModels.filter(
      (m) => m.latency <= effectiveMaxLatency
    );

    if (modelsWithinThreshold.length > 0) {
      candidates = modelsWithinThreshold;
    } else {
      // If no models meet threshold, log warning and use all models
      // Requirements: 5.4
      const minLatency = Math.min(...availableModels.map((m) => m.latency));
      this.logger.warn(
        `All models exceed latency threshold of ${effectiveMaxLatency}ms. ` +
          `Minimum available latency is ${minLatency}ms. ` +
          `Selecting model with lowest latency.`
      );
    }

    // Select the model with the lowest latency
    // Requirements: 5.1, 5.2
    return candidates.reduce((min, current) =>
      current.latency < min.latency ? current : min
    );
  }
}

/**
 * Balanced Strategy
 * Selects a model that balances cost, quality, and latency
 * Used for general-purpose scenarios
 */
export class BalancedStrategy implements ModelSelectionStrategy {
  selectModel(
    availableModels: ModelInfo[],
    _context: SelectionContext
  ): ModelInfo {
    if (availableModels.length === 0) {
      throw new Error('No available models for selection');
    }

    // Normalize metrics to 0-1 range for scoring
    const maxCost = Math.max(
      ...availableModels.map((m) => m.costPerInputToken + m.costPerOutputToken)
    );
    const maxLatency = Math.max(...availableModels.map((m) => m.latency));

    // Calculate balanced score for each model
    // Lower cost and latency are better, higher success rate is better
    const scores = availableModels.map((model) => {
      const costScore =
        (model.costPerInputToken + model.costPerOutputToken) / (maxCost || 1);
      const latencyScore = model.latency / (maxLatency || 1);
      const qualityScore = model.successRate;

      // Weighted average: 40% cost, 30% latency, 30% quality
      return 0.4 * costScore + 0.3 * latencyScore + 0.3 * (1 - qualityScore);
    });

    // Return model with lowest score (best balance)
    let bestIndex = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] < scores[bestIndex]) {
        bestIndex = i;
      }
    }

    return availableModels[bestIndex];
  }
}
