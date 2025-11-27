/**
 * Model Configuration Interfaces
 * Defines configuration structures for AI models and providers
 * Requirements: 2.1, 2.3, 2.4
 */

/**
 * Base configuration for all AI providers
 */
export interface BaseProviderConfig {
  apiKey: string;
  endpoint?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
  isActive?: boolean;
}

/**
 * OpenAI Provider Configuration
 */
export interface OpenAIConfig extends BaseProviderConfig {
  organization?: string;
}

/**
 * Qwen (Alibaba) Provider Configuration
 */
export interface QwenConfig extends BaseProviderConfig {
  // Qwen-specific configuration
}

/**
 * DeepSeek Provider Configuration
 */
export interface DeepSeekConfig extends BaseProviderConfig {
  // DeepSeek-specific configuration (compatible with OpenAI interface)
}

/**
 * Google Gemini Provider Configuration
 */
export interface GeminiConfig extends BaseProviderConfig {
  // Gemini-specific configuration
}

/**
 * Ollama Provider Configuration
 */
export interface OllamaConfig extends BaseProviderConfig {
  baseUrl?: string; // Default: http://localhost:11434
}

/**
 * Model Configuration
 * Stored configuration for each model
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string; // Encrypted in storage
  endpoint?: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Provider Configuration Map
 * Maps provider names to their configurations
 */
export interface ProviderConfigMap {
  openai?: OpenAIConfig;
  qwen?: QwenConfig;
  deepseek?: DeepSeekConfig;
  gemini?: GeminiConfig;
  ollama?: OllamaConfig;
}
