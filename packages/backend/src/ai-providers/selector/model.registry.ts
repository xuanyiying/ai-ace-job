/**
 * Open Source Model Registry
 * Manages registration, retrieval, and status tracking of open source models
 * Requirements: 2.1, 2.2, 2.3
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  LLMModelInfo,
  ModelFamily,
  ModelMetrics,
  ModelRegistrationData,
} from '@/ai-providers';

/**
 * Open Source Model Registry Service
 * Manages all open source models available in the system
 * Requirements: 2.1, 2.2, 2.3
 */
@Injectable()
export class ModelRegistry {
  private readonly logger = new Logger(ModelRegistry.name);
  private models: Map<string, LLMModelInfo> = new Map();
  private modelsByFamily: Map<ModelFamily, Set<string>> = new Map();

  constructor() {
    this.initializeModelFamilyMap();
  }

  /**
   * Initialize the model family map
   */
  private initializeModelFamilyMap(): void {
    Object.values(ModelFamily).forEach((family) => {
      this.modelsByFamily.set(family, new Set());
    });
  }

  /**
   * Register a new model in the registry
   * Requirements: 2.1, 2.2
   *
   * @param data - Model registration data
   * @throws Error if model with same name already exists
   */
  registerModel(data: ModelRegistrationData): void {
    if (this.models.has(data.name)) {
      throw new Error(`Model ${data.name} is already registered`);
    }

    const model: LLMModelInfo = {
      name: data.name,
      provider: data.provider,
      family: data.family,
      parameterSize: data.parameterSize,
      contextWindow: data.contextWindow,
      costPerInputToken: data.costPerInputToken,
      costPerOutputToken: data.costPerOutputToken,
      latency: data.avgLatencyMs,
      avgLatencyMs: data.avgLatencyMs,
      qualityRating: data.qualityRating,
      supportedFeatures: data.supportedFeatures,
      isAvailable: data.isAvailable ?? true,
      status: data.status ?? 'active',
      successRate: 1.0,
      lastHealthCheckAt: new Date(),
      healthStatus: 'healthy',
    };

    this.models.set(data.name, model);
    this.modelsByFamily.get(data.family)?.add(data.name);

    this.logger.log(
      `Registered model: ${data.name} (${data.family}, ${data.parameterSize})`
    );
  }

  /**
   * Get a model by name
   * Requirements: 2.1, 2.2
   *
   * @param name - Model name
   * @returns Model info or undefined if not found
   */
  getModel(name: string): LLMModelInfo | undefined {
    return this.models.get(name);
  }

  /**
   * Get all models from a specific family
   * Requirements: 2.1
   *
   * @param family - Model family
   * @returns Array of models in the family
   */
  getModelsByFamily(family: ModelFamily): LLMModelInfo[] {
    const modelNames = this.modelsByFamily.get(family) || new Set();
    return Array.from(modelNames)
      .map((name) => this.models.get(name))
      .filter((model): model is LLMModelInfo => model !== undefined);
  }

  /**
   * Get all available models
   * Requirements: 2.1, 2.3
   *
   * @returns Array of available models
   */
  getAvailableModels(): LLMModelInfo[] {
    return Array.from(this.models.values()).filter(
      (model) => model.isAvailable
    );
  }

  /**
   * Get all registered models
   *
   * @returns Array of all models
   */
  getAllModels(): LLMModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * Update model availability status
   * Requirements: 2.3
   *
   * @param name - Model name
   * @param isAvailable - Availability status
   * @throws Error if model not found
   */
  updateModelStatus(name: string, isAvailable: boolean): void {
    const model = this.models.get(name);
    if (!model) {
      throw new Error(`Model ${name} not found in registry`);
    }

    model.isAvailable = isAvailable;
    model.status = isAvailable ? 'active' : 'inactive';
    model.lastHealthCheckAt = new Date();

    this.logger.log(
      `Updated model status: ${name} -> ${isAvailable ? 'available' : 'unavailable'}`
    );
  }

  /**
   * Update model metrics
   * Requirements: 2.3
   *
   * @param name - Model name
   * @param metrics - Model metrics to update
   * @throws Error if model not found
   */
  updateModelMetrics(name: string, metrics: Partial<ModelMetrics>): void {
    const model = this.models.get(name);
    if (!model) {
      throw new Error(`Model ${name} not found in registry`);
    }

    if (metrics.avgLatencyMs !== undefined) {
      model.avgLatencyMs = metrics.avgLatencyMs;
      model.latency = metrics.avgLatencyMs;
    }

    if (metrics.successRate !== undefined) {
      model.successRate = metrics.successRate;
    }

    model.lastHealthCheckAt = new Date();

    this.logger.debug(`Updated metrics for model: ${name}`);
  }

  /**
   * Update model health status
   * Requirements: 2.3
   *
   * @param name - Model name
   * @param status - Health status
   * @throws Error if model not found
   */
  updateModelHealthStatus(
    name: string,
    status: 'healthy' | 'degraded' | 'unhealthy'
  ): void {
    const model = this.models.get(name);
    if (!model) {
      throw new Error(`Model ${name} not found in registry`);
    }

    model.healthStatus = status;
    model.lastHealthCheckAt = new Date();

    // Mark as unavailable if unhealthy
    if (status === 'unhealthy') {
      model.isAvailable = false;
      model.status = 'inactive';
    }

    this.logger.log(`Updated health status for model: ${name} -> ${status}`);
  }

  /**
   * Check if a model is registered
   *
   * @param name - Model name
   * @returns True if model is registered
   */
  hasModel(name: string): boolean {
    return this.models.has(name);
  }

  /**
   * Get the count of registered models
   *
   * @returns Number of registered models
   */
  getModelCount(): number {
    return this.models.size;
  }

  /**
   * Get the count of available models
   *
   * @returns Number of available models
   */
  getAvailableModelCount(): number {
    return this.getAvailableModels().length;
  }

  /**
   * Clear all models from the registry
   * Useful for testing
   */
  clear(): void {
    this.models.clear();
    this.initializeModelFamilyMap();
    this.logger.log('Model registry cleared');
  }
}
