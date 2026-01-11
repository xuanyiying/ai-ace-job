/**
 * Default Open Source Models Configuration
 * Defines the default set of open source models available in the system
 * Requirements: 2.1
 */

import { ModelFamily, ModelRegistrationData } from '@/ai-providers';

/**
 * Default open source models configuration
 * Includes Qwen, Llama, DeepSeek, and Mistral families
 * Requirements: 2.1
 */
export const DEFAULT_OPEN_SOURCE_MODELS: ModelRegistrationData[] = [
  // ============================================
  // SiliconCloud Series
  // ============================================

  {
    name: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
    provider: 'siliconcloud',
    family: ModelFamily.DEEPSEEK,
    parameterSize: '8B',
    contextWindow: 32768,
    costPerInputToken: 0.00002,
    costPerOutputToken: 0.00004,
    avgLatencyMs: 800,
    qualityRating: 8,
    supportedFeatures: ['chat', 'reasoning'],
    isAvailable: true,
    status: 'active',
  },

  // ============================================
  // Qwen Series (Alibaba DashScope)
  // ============================================

  {
    name: 'qwen3-max-preview',
    provider: 'qwen',
    family: ModelFamily.QWEN,
    parameterSize: 'unknown',
    contextWindow: 32768,
    costPerInputToken: 0.00004,
    costPerOutputToken: 0.0001,
    avgLatencyMs: 1200,
    qualityRating: 9,
    supportedFeatures: ['chat', 'function-calling', 'reasoning', 'code'],
    isAvailable: true,
    status: 'active',
  },

  {
    name: 'qwen-flash',
    provider: 'qwen',
    family: ModelFamily.QWEN,
    parameterSize: 'unknown',
    contextWindow: 32768,
    costPerInputToken: 0.00001,
    costPerOutputToken: 0.00002,
    avgLatencyMs: 500,
    qualityRating: 7,
    supportedFeatures: ['chat', 'function-calling'],
    isAvailable: true,
    status: 'active',
  },

  {
    name: 'qwen3-coder-flash',
    provider: 'qwen',
    family: ModelFamily.QWEN,
    parameterSize: 'unknown',
    contextWindow: 32768,
    costPerInputToken: 0.00001,
    costPerOutputToken: 0.00002,
    avgLatencyMs: 500,
    qualityRating: 7,
    supportedFeatures: ['chat', 'code'],
    isAvailable: true,
    status: 'active',
  },

  {
    name: 'deepseek-v3.2',
    provider: 'qwen',
    family: ModelFamily.QWEN,
    parameterSize: 'unknown',
    contextWindow: 65536,
    costPerInputToken: 0.00002,
    costPerOutputToken: 0.00004,
    avgLatencyMs: 1000,
    qualityRating: 9,
    supportedFeatures: ['chat', 'reasoning', 'code'],
    isAvailable: true,
    status: 'active',
  },

  {
    name: 'kimi-k2-thinking',
    provider: 'qwen',
    family: ModelFamily.QWEN,
    parameterSize: 'unknown',
    contextWindow: 128000,
    costPerInputToken: 0.00004,
    costPerOutputToken: 0.0001,
    avgLatencyMs: 2500,
    qualityRating: 9,
    supportedFeatures: ['chat', 'reasoning'],
    isAvailable: true,
    status: 'active',
  },

  {
    name: 'Moonshot-Kimi-K2-Instruct',
    provider: 'qwen',
    family: ModelFamily.QWEN,
    parameterSize: 'unknown',
    contextWindow: 128000,
    costPerInputToken: 0.00004,
    costPerOutputToken: 0.0001,
    avgLatencyMs: 1800,
    qualityRating: 8,
    supportedFeatures: ['chat'],
    isAvailable: true,
    status: 'active',
  },

  {
    name: 'llama-4-maverick-17b-128e-instruct',
    provider: 'qwen',
    family: ModelFamily.LLAMA,
    parameterSize: '17B',
    contextWindow: 128000,
    costPerInputToken: 0.00002,
    costPerOutputToken: 0.00004,
    avgLatencyMs: 1200,
    qualityRating: 8,
    supportedFeatures: ['chat', 'function-calling'],
    isAvailable: true,
    status: 'active',
  },

  {
    name: 'glm-4.7',
    provider: 'qwen',
    family: ModelFamily.QWEN,
    parameterSize: 'unknown',
    contextWindow: 32768,
    costPerInputToken: 0.00002,
    costPerOutputToken: 0.00004,
    avgLatencyMs: 1000,
    qualityRating: 8,
    supportedFeatures: ['chat'],
    isAvailable: true,
    status: 'active',
  },

  // ============================================
  // Ollama Series (Local)
  // ============================================

  {
    name: 'deepseek-r1:1.5b',
    provider: 'ollama',
    family: ModelFamily.DEEPSEEK,
    parameterSize: '1.5B',
    contextWindow: 32768,
    costPerInputToken: 0,
    costPerOutputToken: 0,
    avgLatencyMs: 750,
    qualityRating: 7,
    supportedFeatures: ['chat', 'reasoning'],
    isAvailable: true,
    status: 'active',
  },
];
