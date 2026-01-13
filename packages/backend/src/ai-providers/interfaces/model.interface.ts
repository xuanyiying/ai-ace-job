/**
 * Open Source Model Interfaces
 * Defines types and interfaces for open source AI models
 * Requirements: 2.1, 2.2
 */

import { ModelInfo } from './ai-provider.interface';

/**
 * Model family enumeration
 * Represents different families of open source models
 * Requirements: 2.1
 */
export enum ModelFamily {
  QWEN = 'qwen',
  LLAMA = 'llama',
  DEEPSEEK = 'deepseek',
  MISTRAL = 'mistral',
  OTHER = 'other',
  ZHIPU = 'zhipu',
  META = 'meta',
  OPENAI = 'openai',
  GOOGLE = 'google',
  BAI = 'bai',
}

/**
 * Extended model information for open source models
 * Extends the base ModelInfo with open source specific properties
 * Requirements: 2.1, 2.2
 */
export interface LLMModelInfo extends ModelInfo {
  /**
   * Model family (Qwen, Llama, DeepSeek, Mistral, etc.)
   */
  family: ModelFamily;

  /**
   * Parameter size (e.g., '7B', '32B', '72B')
   */
  parameterSize: string;

  /**
   * Context window size in tokens
   */
  contextWindow: number;

  /**
   * Quality rating (1-10 scale)
   */
  qualityRating: number;

  /**
   * Average latency in milliseconds
   */
  avgLatencyMs: number;

  /**
   * Supported features (e.g., 'chat', 'function-calling', 'reasoning', 'code')
   */
  supportedFeatures: string[];

  /**
   * Whether the model is currently available
   */
  isAvailable: boolean;

  /**
   * Model status (active, inactive, deprecated)
   */
  status?: 'active' | 'inactive' | 'deprecated';

  /**
   * Last health check timestamp
   */
  lastHealthCheckAt?: Date;

  /**
   * Health check status
   */
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * Scenario type enumeration
 * Represents different application scenarios
 * Requirements: 1.1
 */
export enum ScenarioType {
  // Core scenarios
  RESUME_PARSING = 'resume-parsing',
  JOB_DESCRIPTION_PARSING = 'job-description-parsing',
  RESUME_OPTIMIZATION = 'resume-optimization',
  RESUME_CONTENT_OPTIMIZATION = 'resume-content-optimization',
  INTERVIEW_QUESTION_GENERATION = 'interview-question-generation',
  MATCH_SCORE_CALCULATION = 'match-score-calculation',

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
  AGENT_EMBEDDING_GENERATION = 'agent-embedding-generation',

  // General scenario
  GENERAL = 'general',
}

/**
 * Selection strategy type
 * Represents different model selection strategies
 * Requirements: 1.3
 */
export enum SelectionStrategyType {
  QUALITY = 'quality',
  COST = 'cost',
  LATENCY = 'latency',
  BALANCED = 'balanced',
}

/**
 * Scenario configuration
 * Defines how to select models for a specific scenario
 * Requirements: 1.1, 1.2, 1.3
 */
export interface ScenarioConfig {
  /**
   * Scenario identifier
   */
  scenario: ScenarioType;

  /**
   * Primary selection strategy
   */
  strategy: SelectionStrategyType;

  /**
   * Primary recommended models (in order of preference)
   */
  primaryModels: string[];

  /**
   * Fallback models (used when primary models are unavailable)
   */
  fallbackModels: string[];

  /**
   * Selection weights for multi-criteria optimization
   */
  weights: {
    /**
     * Quality weight (0-1)
     */
    quality: number;

    /**
     * Cost weight (0-1)
     */
    cost: number;

    /**
     * Latency weight (0-1)
     */
    latency: number;
  };

  /**
   * Minimum quality score threshold (1-10)
   * Optional: used by cost optimization strategy
   */
  minQualityScore?: number;

  /**
   * Maximum acceptable latency in milliseconds
   * Optional: used by latency optimization strategy
   */
  maxLatencyMs?: number;

  /**
   * Maximum acceptable cost per token
   * Optional: used by cost optimization strategy
   */
  maxCostPerToken?: number;
}

/**
 * Model metrics for tracking performance
 * Requirements: 2.3
 */
export interface ModelMetrics {
  /**
   * Average latency in milliseconds
   */
  avgLatencyMs: number;

  /**
   * Success rate (0-1)
   */
  successRate: number;

  /**
   * Total number of calls
   */
  totalCalls: number;

  /**
   * Number of successful calls
   */
  successfulCalls: number;

  /**
   * Number of failed calls
   */
  failedCalls: number;

  /**
   * Last updated timestamp
   */
  lastUpdatedAt: Date;
}

/**
 * Model registration data
 * Used when registering a new model
 * Requirements: 2.1, 2.2
 */
export interface ModelRegistrationData {
  /**
   * Model name (e.g., 'Qwen2.5-7B-Instruct')
   */
  name: string;

  /**
   * Provider name (e.g., 'qwen', 'meta', 'deepseek')
   */
  provider: string;

  /**
   * Model family
   */
  family: ModelFamily;

  /**
   * Parameter size (e.g., '7B', '72B')
   */
  parameterSize: string;

  /**
   * Context window size in tokens
   */
  contextWindow: number;

  /**
   * Cost per input token
   */
  costPerInputToken: number;

  /**
   * Cost per output token
   */
  costPerOutputToken: number;

  /**
   * Average latency in milliseconds
   */
  avgLatencyMs: number;

  /**
   * Quality rating (1-10)
   */
  qualityRating: number;

  /**
   * Supported features
   */
  supportedFeatures: string[];

  /**
   * Whether the model is available
   */
  isAvailable?: boolean;

  /**
   * Model status
   */
  status?: 'active' | 'inactive' | 'deprecated';
}

/**
 * Model selection context
 * Provides context for model selection decisions
 * Requirements: 1.4
 */
export interface ModelSelectionContext {
  /**
   * Scenario type
   */
  scenario: ScenarioType;

  /**
   * Estimated input tokens
   */
  estimatedInputTokens?: number;

  /**
   * Estimated output tokens
   */
  estimatedOutputTokens?: number;

  /**
   * Maximum acceptable latency
   */
  maxLatency?: number;

  /**
   * Maximum acceptable cost
   */
  maxCost?: number;

  /**
   * Minimum quality score
   */
  minQualityScore?: number;

  /**
   * User ID for tracking
   */
  userId?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Model selection result
 * Result of a model selection operation
 * Requirements: 1.4
 */
export interface ModelSelectionResult {
  /**
   * Selected model
   */
  model: LLMModelInfo;

  /**
   * Strategy used for selection
   */
  strategy: SelectionStrategyType;

  /**
   * Number of available models considered
   */
  availableModelsCount: number;

  /**
   * Whether this was a fallback selection
   */
  isFallback: boolean;

  /**
   * Reason for selection
   */
  reason: string;

  /**
   * Timestamp of selection
   */
  selectedAt: Date;
}

/**
 * Model health status
 * Represents the health status of a model
 * Requirements: 2.3
 */
export interface ModelHealthStatus {
  /**
   * Model name
   */
  modelName: string;

  /**
   * Health status
   */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /**
   * Last health check timestamp
   */
  lastCheckAt: Date;

  /**
   * Error message if unhealthy
   */
  errorMessage?: string;

  /**
   * Response time in milliseconds
   */
  responseTimeMs?: number;
}
