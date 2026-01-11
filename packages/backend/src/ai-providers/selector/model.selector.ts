/**
 * Model Selector
 * Selects the best model for a given scenario based on configured strategies
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.1, 8.2, 8.3
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { ModelInfo } from '../interfaces';
import {
  ModelSelectionStrategy,
  SelectionContext,
  CostOptimizedStrategy,
  QualityOptimizedStrategy,
  LatencyOptimizedStrategy,
  BalancedStrategy,
} from './model-selection.strategy';
import { ScenarioModelMappingService } from './scenario-model-mapping.service';
import { ScenarioType as MappingScenarioType } from '../interfaces/model.interface';
import { StrategyConfig, DEFAULT_STRATEGY_CONFIG } from './strategy-config';

/**
 * Scenario types for model selection
 */
export enum ScenarioType {
  RESUME_PARSING = 'resume-parsing',
  JOB_DESCRIPTION_PARSING = 'job-description-parsing',
  RESUME_OPTIMIZATION = 'resume-optimization',
  INTERVIEW_QUESTION_GENERATION = 'interview-question-generation',
  MATCH_SCORE_CALCULATION = 'match-score-calculation',
  GENERAL = 'general',
  // Agent scenarios
  AGENT_STAR_EXTRACTION = 'agent-star-extraction',
  AGENT_KEYWORD_MATCHING = 'agent-keyword-matching',
  AGENT_INTRODUCTION_GENERATION = 'agent-introduction-generation',
  AGENT_CONTEXT_ANALYSIS = 'agent-context-analysis',
  AGENT_CUSTOM_QUESTION_GENERATION = 'agent-custom-question-generation',
  AGENT_QUESTION_PRIORITIZATION = 'agent-question-prioritization',
  AGENT_INTERVIEW_INITIALIZATION = 'agent-interview-initialization',
  AGENT_RESPONSE_PROCESSING = 'agent-response-processing',
  AGENT_RESPONSE_ANALYSIS = 'agent-response-analysis',
  AGENT_INTERVIEW_CONCLUSION = 'agent-interview-conclusion',
  AGENT_CONTEXT_COMPRESSION = 'agent-context-compression',
  AGENT_RAG_RETRIEVAL = 'agent-rag-retrieval',
}

/**
 * Model Selector Service
 * Manages model selection strategies and selects the best model for each scenario
 */
@Injectable()
export class ModelSelector {
  private readonly logger = new Logger(ModelSelector.name);
  private strategies: Map<string, ModelSelectionStrategy>;
  private selectionLog: SelectionDecision[] = [];
  private strategyConfig: StrategyConfig;

  constructor(
    private scenarioMappingService: ScenarioModelMappingService,
    @Optional() strategyConfig?: StrategyConfig
  ) {
    this.strategies = new Map();
    this.strategyConfig = strategyConfig || DEFAULT_STRATEGY_CONFIG;
    this.initializeDefaultStrategies();
  }

  /**
   * Initialize default strategies for each scenario
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  private initializeDefaultStrategies(): void {
    // Resume parsing: cost optimized (high volume, low complexity)
    this.strategies.set(
      ScenarioType.RESUME_PARSING,
      new CostOptimizedStrategy({
        minQualityThreshold: this.strategyConfig.cost.minQualityThreshold,
        lowCostModels: this.strategyConfig.cost.lowCostModels,
      })
    );

    // Job description parsing: cost optimized (high volume, low complexity)
    this.strategies.set(
      ScenarioType.JOB_DESCRIPTION_PARSING,
      new CostOptimizedStrategy({
        minQualityThreshold: this.strategyConfig.cost.minQualityThreshold,
        lowCostModels: this.strategyConfig.cost.lowCostModels,
      })
    );

    // Resume optimization: quality optimized (important output, user-facing)
    this.strategies.set(
      ScenarioType.RESUME_OPTIMIZATION,
      new QualityOptimizedStrategy({
        qualityRanking: this.strategyConfig.quality.qualityRanking,
      })
    );

    // Interview question generation: latency optimized (real-time interaction)
    this.strategies.set(
      ScenarioType.INTERVIEW_QUESTION_GENERATION,
      new LatencyOptimizedStrategy({
        maxLatencyThreshold: this.strategyConfig.latency.maxLatencyThreshold,
      })
    );

    // Match score calculation: balanced (important but not critical)
    this.strategies.set(
      ScenarioType.MATCH_SCORE_CALCULATION,
      new BalancedStrategy()
    );

    // General: balanced (default for unknown scenarios)
    this.strategies.set(ScenarioType.GENERAL, new BalancedStrategy());

    // Agent scenarios - Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
    // STAR extraction: cost optimized (information extraction, high volume)
    this.strategies.set(
      ScenarioType.AGENT_STAR_EXTRACTION,
      new CostOptimizedStrategy({
        minQualityThreshold: this.strategyConfig.cost.minQualityThreshold,
        lowCostModels: this.strategyConfig.cost.lowCostModels,
      })
    );

    // Keyword matching: cost optimized (simple comparison, no LLM needed ideally)
    this.strategies.set(
      ScenarioType.AGENT_KEYWORD_MATCHING,
      new CostOptimizedStrategy({
        minQualityThreshold: this.strategyConfig.cost.minQualityThreshold,
        lowCostModels: this.strategyConfig.cost.lowCostModels,
      })
    );

    // Introduction generation: quality optimized (user-facing, important output)
    this.strategies.set(
      ScenarioType.AGENT_INTRODUCTION_GENERATION,
      new QualityOptimizedStrategy({
        qualityRanking: this.strategyConfig.quality.qualityRanking,
      })
    );

    // Context analysis: cost optimized (information extraction)
    this.strategies.set(
      ScenarioType.AGENT_CONTEXT_ANALYSIS,
      new CostOptimizedStrategy({
        minQualityThreshold: this.strategyConfig.cost.minQualityThreshold,
        lowCostModels: this.strategyConfig.cost.lowCostModels,
      })
    );

    // Custom question generation: quality optimized (user-facing, important)
    this.strategies.set(
      ScenarioType.AGENT_CUSTOM_QUESTION_GENERATION,
      new QualityOptimizedStrategy({
        qualityRanking: this.strategyConfig.quality.qualityRanking,
      })
    );

    // Question prioritization: balanced (important but not critical)
    this.strategies.set(
      ScenarioType.AGENT_QUESTION_PRIORITIZATION,
      new BalancedStrategy()
    );

    // Interview initialization: quality optimized (sets tone for interview)
    this.strategies.set(
      ScenarioType.AGENT_INTERVIEW_INITIALIZATION,
      new QualityOptimizedStrategy({
        qualityRanking: this.strategyConfig.quality.qualityRanking,
      })
    );

    // Response processing: latency optimized (real-time interaction)
    this.strategies.set(
      ScenarioType.AGENT_RESPONSE_PROCESSING,
      new LatencyOptimizedStrategy({
        maxLatencyThreshold: this.strategyConfig.latency.maxLatencyThreshold,
      })
    );

    // Response analysis: balanced (important but not critical)
    this.strategies.set(
      ScenarioType.AGENT_RESPONSE_ANALYSIS,
      new BalancedStrategy()
    );

    // Interview conclusion: quality optimized (important feedback)
    this.strategies.set(
      ScenarioType.AGENT_INTERVIEW_CONCLUSION,
      new QualityOptimizedStrategy({
        qualityRanking: this.strategyConfig.quality.qualityRanking,
      })
    );

    // Context compression: cost optimized (token reduction, high volume)
    this.strategies.set(
      ScenarioType.AGENT_CONTEXT_COMPRESSION,
      new CostOptimizedStrategy({
        minQualityThreshold: this.strategyConfig.cost.minQualityThreshold,
        lowCostModels: this.strategyConfig.cost.lowCostModels,
      })
    );

    // RAG retrieval: cost optimized (information retrieval, no generation)
    this.strategies.set(
      ScenarioType.AGENT_RAG_RETRIEVAL,
      new CostOptimizedStrategy({
        minQualityThreshold: this.strategyConfig.cost.minQualityThreshold,
        lowCostModels: this.strategyConfig.cost.lowCostModels,
      })
    );

    this.logger.log('Default model selection strategies initialized');
  }

  /**
   * Select the best model for a given scenario
   * Requirements: 5.1, 5.5, 5.6
   *
   * @param availableModels - Array of available models
   * @param scenario - Scenario name
   * @param context - Optional selection context
   * @param agentContext - Optional Agent-specific context for logging
   * @returns The selected model
   * @throws Error if no strategy is defined for the scenario or no models are available
   */
  selectModel(
    availableModels: ModelInfo[],
    scenario: string,
    context?: Partial<SelectionContext>,
    agentContext?: AgentSelectionContext
  ): ModelInfo {
    // Filter available models
    const activeModels = availableModels.filter((m) => m.isAvailable);

    if (activeModels.length === 0) {
      this.logger.warn(
        `No available models for scenario: ${scenario}. Attempting fallback to all models.`
      );
      if (availableModels.length === 0) {
        throw new Error(
          `No models available for scenario: ${scenario}. Cannot select a model.`
        );
      }
      // Use first unavailable model as fallback (degraded mode)
      return availableModels[0];
    }

    // Get strategy for scenario
    const strategy = this.strategies.get(scenario);
    if (!strategy) {
      this.logger.warn(
        `No strategy defined for scenario: ${scenario}. Using general strategy.`
      );
      return this.strategies
        .get(ScenarioType.GENERAL)!
        .selectModel(activeModels, {
          scenario,
          ...context,
        });
    }

    // Select model using strategy
    const selectedModel = strategy.selectModel(activeModels, {
      scenario,
      ...context,
    });

    // Log selection decision with Agent context
    this.logSelectionDecision(
      scenario,
      selectedModel,
      activeModels.length,
      strategy.constructor.name,
      agentContext
    );

    return selectedModel;
  }

  /**
   * Select model for a specific scenario using scenario configuration
   * Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   *
   * @param scenario - Scenario type from ScenarioType enum
   * @param availableModels - Array of available models
   * @param agentContext - Optional Agent-specific context for logging
   * @returns The selected model
   * @throws Error if scenario configuration not found or no models available
   */
  selectModelForScenario(
    scenario: MappingScenarioType,
    availableModels: ModelInfo[],
    agentContext?: AgentSelectionContext
  ): ModelInfo {
    try {
      // Get scenario configuration
      const scenarioConfig =
        this.scenarioMappingService.getScenarioConfig(scenario);

      // Filter available models that match recommended names
      const recommendedModels = availableModels.filter((m) => {
        const fullKey = `${m.provider}:${m.name}`;
        const recommendedModelNames =
          this.scenarioMappingService.getRecommendedModels(scenario);

        // Try exact match first
        if (
          recommendedModelNames.includes(m.name) ||
          recommendedModelNames.includes(fullKey)
        ) {
          return true;
        }

        // Try base name match (without tags like :latest or :1.5b)
        const mBaseName = m.name.split(':')[0].toLowerCase();
        const mProvider = m.provider.toLowerCase();

        return recommendedModelNames.some((rec) => {
          const recLower = rec.toLowerCase();
          const recParts = recLower.split(':');

          // If recommendation has provider (e.g. "ollama:deepseek-r1:1.5b")
          if (recParts.length >= 2 && recParts[0] === mProvider) {
            const recBaseName = recParts[1];
            return (
              mBaseName === recBaseName ||
              m.name.toLowerCase() === recParts.slice(1).join(':')
            );
          }

          // If recommendation is just model name (e.g. "deepseek-r1")
          return mBaseName === recLower || m.name.toLowerCase() === recLower;
        });
      });

      // If no recommended models available, use all available models
      const modelsToUse =
        recommendedModels.length > 0 ? recommendedModels : availableModels;

      // Get strategy based on scenario configuration
      const strategy = this.strategies.get(scenarioConfig.strategy);
      if (!strategy) {
        this.logger.warn(
          `No strategy found for: ${scenarioConfig.strategy}. Using general strategy.`
        );
        return this.selectModel(modelsToUse, scenario, undefined, agentContext);
      }

      // Filter available models
      const activeModels = modelsToUse.filter((m) => m.isAvailable);

      if (activeModels.length === 0) {
        this.logger.warn(
          `No available models for scenario: ${scenario}. Attempting fallback.`
        );
        if (modelsToUse.length === 0) {
          throw new Error(
            `No models available for scenario: ${scenario}. Cannot select a model.`
          );
        }
        return modelsToUse[0];
      }

      // Create selection context from scenario config
      const context: SelectionContext = {
        scenario,
        maxLatency: scenarioConfig.maxLatencyMs,
        maxCost: scenarioConfig.minQualityScore ? 1000 : undefined, // Use a high value if quality threshold exists
      };

      // Select model using strategy
      const selectedModel = strategy.selectModel(activeModels, context);

      // Log selection decision
      this.logSelectionDecision(
        scenario,
        selectedModel,
        activeModels.length,
        strategy.constructor.name,
        agentContext
      );

      return selectedModel;
    } catch (error) {
      this.logger.error(
        `Error selecting model for scenario ${scenario}: ${error instanceof Error ? error.message : String(error)}`
      );
      // Fallback to default selection
      return this.selectModel(
        availableModels,
        scenario,
        undefined,
        agentContext
      );
    }
  }

  /**
   * Get recommended models for a scenario
   * Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   *
   * @param scenario - Scenario type
   * @param availableModels - Optional array of available models to filter by
   * @returns Array of recommended models
   */
  getRecommendedModels(
    scenario: MappingScenarioType,
    availableModels?: ModelInfo[]
  ): ModelInfo[] {
    try {
      const recommendedModelNames =
        this.scenarioMappingService.getRecommendedModels(scenario);

      if (!availableModels) {
        return [];
      }

      return availableModels.filter((m) => {
        const fullKey = `${m.provider}:${m.name}`;
        return (
          recommendedModelNames.includes(m.name) ||
          recommendedModelNames.includes(fullKey)
        );
      });
    } catch (error) {
      this.logger.error(
        `Error getting recommended models for scenario ${scenario}: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Register a custom strategy for a scenario
   * Requirements: 5.1
   *
   * @param scenario - Scenario name
   * @param strategy - Model selection strategy
   */
  registerStrategy(scenario: string, strategy: ModelSelectionStrategy): void {
    this.strategies.set(scenario, strategy);
    this.logger.log(
      `Registered strategy for scenario: ${scenario} (${strategy.constructor.name})`
    );
  }

  /**
   * Get the strategy for a scenario
   *
   * @param scenario - Scenario name
   * @returns The strategy or undefined if not found
   */
  getStrategy(scenario: string): ModelSelectionStrategy | undefined {
    return this.strategies.get(scenario);
  }

  /**
   * Select model with fallback chain
   * Requirements: 8.1, 8.2, 8.3
   *
   * @param scenario - Scenario type
   * @param availableModels - Array of available models
   * @param excludeModels - Models to exclude from selection
   * @param agentContext - Optional Agent-specific context for logging
   * @returns The selected model
   * @throws Error if no model can be selected
   */
  selectWithFallback(
    scenario: MappingScenarioType,
    availableModels: ModelInfo[],
    excludeModels: string[] = [],
    agentContext?: AgentSelectionContext
  ): ModelInfo {
    try {
      const scenarioConfig =
        this.scenarioMappingService.getScenarioConfig(scenario);

      // Build fallback chain: primary models -> fallback models -> Ollama
      const fallbackChain = [
        ...scenarioConfig.primaryModels,
        ...scenarioConfig.fallbackModels,
        'ollama', // Final fallback
      ];

      // Try each model in the fallback chain
      for (const modelName of fallbackChain) {
        // Skip excluded models
        if (excludeModels.includes(modelName)) {
          continue;
        }

        // Find model in available models
        const model = availableModels.find(
          (m) => m.name === modelName && m.isAvailable
        );

        if (model) {
          // Log fallback event if not the first choice
          if (modelName !== scenarioConfig.primaryModels[0]) {
            this.logFallbackEvent(
              scenario,
              scenarioConfig.primaryModels[0],
              modelName,
              excludeModels,
              agentContext
            );
          }

          // Log selection decision
          this.logSelectionDecision(
            scenario,
            model,
            availableModels.filter((m) => m.isAvailable).length,
            'FallbackStrategy',
            agentContext
          );

          return model;
        }
      }

      // If no model found in fallback chain, try any available model
      const anyAvailable = availableModels.find(
        (m) => m.isAvailable && !excludeModels.includes(m.name)
      );

      if (anyAvailable) {
        this.logFallbackEvent(
          scenario,
          scenarioConfig.primaryModels[0],
          anyAvailable.name,
          excludeModels,
          agentContext
        );

        this.logSelectionDecision(
          scenario,
          anyAvailable,
          availableModels.filter((m) => m.isAvailable).length,
          'FallbackStrategy',
          agentContext
        );

        return anyAvailable;
      }

      // No available model found
      throw new Error(
        `No available model found for scenario: ${scenario}. Fallback chain exhausted.`
      );
    } catch (error) {
      this.logger.error(
        `Error in fallback selection for scenario ${scenario}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get all registered scenarios
   *
   * @returns Array of scenario names
   */
  getRegisteredScenarios(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Log model selection decision
   * Requirements: 5.6
   *
   * @param scenario - Scenario name
   * @param selectedModel - Selected model
   * @param availableCount - Number of available models
   * @param strategyName - Name of the strategy used
   * @param agentContext - Optional Agent-specific context
   */
  private logSelectionDecision(
    scenario: string,
    selectedModel: ModelInfo,
    availableCount: number,
    strategyName: string,
    agentContext?: AgentSelectionContext
  ): void {
    const decision: SelectionDecision = {
      timestamp: new Date(),
      scenario,
      selectedModel: selectedModel.name,
      selectedProvider: selectedModel.provider,
      availableModelsCount: availableCount,
      strategyUsed: strategyName,
      modelCost:
        selectedModel.costPerInputToken + selectedModel.costPerOutputToken,
      modelLatency: selectedModel.latency,
      modelSuccessRate: selectedModel.successRate,
      // Agent-specific context - Requirements: 5.6
      workflowStep: agentContext?.workflowStep,
      agentType: agentContext?.agentType,
      userId: agentContext?.userId,
      optimizationEffectiveness: agentContext?.optimizationEffectiveness,
    };

    this.selectionLog.push(decision);

    const agentInfo = agentContext
      ? ` [Agent: ${agentContext.agentType}, Step: ${agentContext.workflowStep}]`
      : '';

    this.logger.debug(
      `Model selection: scenario=${scenario}, model=${selectedModel.name}, ` +
        `provider=${selectedModel.provider}, strategy=${strategyName}, ` +
        `availableModels=${availableCount}${agentInfo}`
    );
  }

  /**
   * Log fallback event
   * Requirements: 8.4
   *
   * @param scenario - Scenario name
   * @param originalModel - Original model that was unavailable
   * @param fallbackModel - Fallback model selected
   * @param excludedModels - Models that were excluded
   * @param agentContext - Optional Agent-specific context
   */
  private logFallbackEvent(
    scenario: string,
    originalModel: string,
    fallbackModel: string,
    excludedModels: string[],
    agentContext?: AgentSelectionContext
  ): void {
    const fallbackLog: FallbackEvent = {
      timestamp: new Date(),
      scenario,
      originalModel,
      fallbackModel,
      excludedModels,
      agentType: agentContext?.agentType,
      workflowStep: agentContext?.workflowStep,
      userId: agentContext?.userId,
    };

    this.logger.warn(
      `Model fallback: scenario=${scenario}, original=${originalModel}, ` +
        `fallback=${fallbackModel}, excluded=${excludedModels.join(', ')}`
    );

    // Store fallback event in selection log for tracking
    const decision: SelectionDecision = {
      timestamp: new Date(),
      scenario,
      selectedModel: fallbackModel,
      selectedProvider: 'fallback',
      availableModelsCount: 0,
      strategyUsed: 'FallbackStrategy',
      modelCost: 0,
      modelLatency: 0,
      modelSuccessRate: 0,
      workflowStep: agentContext?.workflowStep,
      agentType: agentContext?.agentType,
      userId: agentContext?.userId,
      fallbackEvent: fallbackLog,
    };

    this.selectionLog.push(decision);
  }

  /**
   * Get selection decision log
   * Requirements: 5.7
   *
   * @param limit - Maximum number of recent decisions to return
   * @returns Array of selection decisions
   */
  getSelectionLog(limit: number = 100): SelectionDecision[] {
    return this.selectionLog.slice(-limit);
  }

  /**
   * Clear selection decision log
   */
  clearSelectionLog(): void {
    this.selectionLog = [];
  }

  /**
   * Get statistics about model selections
   * Requirements: 7.2, 7.3, 7.4
   *
   * @param startTime - Optional start time for filtering
   * @param endTime - Optional end time for filtering
   * @returns Statistics object
   */
  getSelectionStatistics(
    startTime?: Date,
    endTime?: Date
  ): SelectionStatistics {
    // Filter log by time range if provided
    let filteredLog = this.selectionLog;

    if (startTime || endTime) {
      filteredLog = this.selectionLog.filter((decision) => {
        const decisionTime = decision.timestamp;
        if (startTime && decisionTime < startTime) {
          return false;
        }
        if (endTime && decisionTime > endTime) {
          return false;
        }
        return true;
      });
    }

    const stats: SelectionStatistics = {
      totalSelections: filteredLog.length,
      scenarioStats: {},
      modelStats: {},
      strategyStats: {},
    };

    for (const decision of filteredLog) {
      // Scenario statistics - Requirements: 7.2
      if (!stats.scenarioStats[decision.scenario]) {
        stats.scenarioStats[decision.scenario] = {
          count: 0,
          models: new Map(),
          totalCost: 0,
          totalLatency: 0,
          successCount: 0,
        };
      }

      const scenarioStat = stats.scenarioStats[decision.scenario];
      scenarioStat.count++;
      scenarioStat.totalCost += decision.modelCost;
      scenarioStat.totalLatency += decision.modelLatency;
      scenarioStat.successCount += decision.modelSuccessRate > 0 ? 1 : 0;

      // Track model distribution per scenario
      if (!scenarioStat.models.has(decision.selectedModel)) {
        scenarioStat.models.set(decision.selectedModel, 0);
      }
      scenarioStat.models.set(
        decision.selectedModel,
        (scenarioStat.models.get(decision.selectedModel) || 0) + 1
      );

      // Model statistics - Requirements: 7.3
      if (!stats.modelStats[decision.selectedModel]) {
        stats.modelStats[decision.selectedModel] = {
          count: 0,
          scenarios: new Set<string>(),
          successCount: 0,
          totalSuccessRate: 0,
          avgCost: 0,
          avgLatency: 0,
        };
      }

      const modelStat = stats.modelStats[decision.selectedModel];
      if (!modelStat.scenarios) {
        modelStat.scenarios = new Set<string>();
      }
      modelStat.count++;
      modelStat.scenarios.add(decision.scenario);
      modelStat.successCount += decision.modelSuccessRate > 0 ? 1 : 0;
      modelStat.totalSuccessRate += decision.modelSuccessRate;
      modelStat.avgCost += decision.modelCost;
      modelStat.avgLatency += decision.modelLatency;

      // Strategy statistics
      if (!stats.strategyStats[decision.strategyUsed]) {
        stats.strategyStats[decision.strategyUsed] = 0;
      }
      stats.strategyStats[decision.strategyUsed]++;
    }

    // Calculate averages for model statistics
    for (const modelName in stats.modelStats) {
      const modelStat = stats.modelStats[modelName];
      if (modelStat.count > 0) {
        modelStat.avgCost = modelStat.avgCost / modelStat.count;
        modelStat.avgLatency = modelStat.avgLatency / modelStat.count;
        modelStat.successRate = modelStat.successCount / modelStat.count;
      } else {
        modelStat.avgCost = 0;
        modelStat.avgLatency = 0;
        modelStat.successRate = 0;
      }
    }

    return stats;
  }
}

/**
 * Selection decision record
 * Requirements: 5.6
 */
export interface SelectionDecision {
  timestamp: Date;
  scenario: string;
  selectedModel: string;
  selectedProvider: string;
  availableModelsCount: number;
  strategyUsed: string;
  modelCost: number;
  modelLatency: number;
  modelSuccessRate: number;
  // Agent-specific context - Requirements: 5.6
  workflowStep?: string;
  agentType?: string;
  userId?: string;
  optimizationEffectiveness?: {
    costSavings?: number;
    latencySavings?: number;
    qualityImprovement?: number;
  };
  fallbackEvent?: FallbackEvent;
}

/**
 * Fallback event record
 * Requirements: 8.4
 */
export interface FallbackEvent {
  timestamp: Date;
  scenario: string;
  originalModel: string;
  fallbackModel: string;
  excludedModels: string[];
  agentType?: string;
  workflowStep?: string;
  userId?: string;
}

/**
 * Selection statistics
 * Requirements: 7.2, 7.3, 7.4
 */
export interface SelectionStatistics {
  totalSelections: number;
  scenarioStats: Record<
    string,
    {
      count: number;
      models: Map<string, number>; // model name -> count
      totalCost: number;
      totalLatency: number;
      successCount: number;
    }
  >;
  modelStats: Record<
    string,
    {
      count: number;
      scenarios: Set<string>;
      successCount: number;
      totalSuccessRate: number;
      avgCost: number;
      avgLatency: number;
      successRate?: number;
    }
  >;
  strategyStats: Record<string, number>;
}

/**
 * Agent-specific selection context for logging
 * Requirements: 5.6
 */
export interface AgentSelectionContext {
  workflowStep?: string;
  agentType?: string;
  userId?: string;
  optimizationEffectiveness?: {
    costSavings?: number;
    latencySavings?: number;
    qualityImprovement?: number;
  };
}
