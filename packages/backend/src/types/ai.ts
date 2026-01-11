/**
 * AI and Optimization related types
 */

/**
 * Types of optimization suggestions
 */
export enum SuggestionType {
  CONTENT = 'CONTENT',
  KEYWORD = 'KEYWORD',
  STRUCTURE = 'STRUCTURE',
  QUANTIFICATION = 'QUANTIFICATION',
}

/**
 * Status of an optimization suggestion
 */
export enum SuggestionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

/**
 * Individual optimization suggestion
 */
export interface Suggestion {
  id?: string;
  type: SuggestionType;
  section: string;
  itemIndex?: number;
  original: string;
  optimized: string;
  reason: string;
  status?: SuggestionStatus;
}

/**
 * Alias for Suggestion to support legacy AI engine
 */
export type OptimizationSuggestion = Suggestion;

/**
 * Options for the optimization process
 */
export interface OptimizationOptions {
  language?: string;
  mode?: 'streaming' | 'batch';
  includeAnalysis?: boolean;
  generateSuggestions?: boolean;
}

/**
 * Prompt template structure
 */
export interface PromptTemplate {
  name: string;
  template: string;
  variables: string[];
}

/**
 * Configuration for API retries
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Chunk of data in a streaming response
 */
export interface StreamChunk {
  type: 'chunk' | 'done' | 'error' | 'cancelled';
  content?: string;
  timestamp?: number;
  complete?: boolean;
  message?: string;
}
