/**
 * AI Engine Service
 * Integrates all AI provider components into a unified service
 * Requirements: 2.1, 2.3, 2.4, 2.5, 2.6
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnApplicationBootstrap,
} from '@nestjs/common';
import {
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ModelInfo,
  ScenarioType,
} from './interfaces';
import { AIProviderFactory } from './factory';
import {
  ModelSelector,
  ScenarioModelMappingService,
  ModelRegistry,
} from '@/ai-providers/selector';
import {
  ModelConfigService,
  PromptTemplateManager,
} from '@/ai-providers/config';
import { UsageTrackerService } from '@/ai-providers/tracking';
import { PerformanceMonitorService } from '@/ai-providers/monitoring';
import { RetryHandler } from '@/ai-providers/utils';
import { AIError, AIErrorCode } from './utils/ai-error';
import { AILogger } from './logging/ai-logger';

/**
 * AI Engine Service
 * Unified interface for calling AI providers with integrated features:
 * - Model selection based on scenario
 * - Prompt template management
 * - Error handling and retry logic
 * - Cost and usage tracking
 * - Performance monitoring
 * - Logging and auditing
 *
 * Validates: Requirements 2.1, 2.3, 2.4, 2.5, 2.6
 */
@Injectable()
export class AIEngineService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(AIEngineService.name);
  private retryHandler: RetryHandler;
  private availableModels: Map<string, ModelInfo> = new Map();

  constructor(
    private providerFactory: AIProviderFactory,
    private modelConfigService: ModelConfigService,
    private promptTemplateManager: PromptTemplateManager,
    private usageTracker: UsageTrackerService,
    private performanceMonitor: PerformanceMonitorService,
    private aiLogger: AILogger,
    private scenarioModelMappingService: ScenarioModelMappingService,
    private openSourceModelRegistry: ModelRegistry,
    private modelSelector: ModelSelector
  ) {
    this.retryHandler = new RetryHandler({
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    });
  }

  /**
   * Initialize on module startup
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing AI Engine Service');
  }

  /**
   * Initialize on application bootstrap
   * This runs after all onModuleInit hooks have completed,
   * ensuring that AIProviderFactory has finished its health checks.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Bootstrapping AI Engine Service - loading models');

    try {
      await this.loadAvailableModels();
      this.logger.log(
        `AI Engine Service initialized with ${this.availableModels.size} models`
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize AI Engine Service models: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load all available models from all providers and registry
   * Property 2: Provider initialization
   * Validates: Requirements 1.6, 2.1
   */
  private async loadAvailableModels(): Promise<void> {
    this.logger.log('Loading available models...');
    const newModels = new Map<string, ModelInfo>();

    // 1. First, load default open source models from registry
    // Requirements: 2.1
    try {
      this.logger.debug('Loading default open source models from registry...');
      const registryModels = this.openSourceModelRegistry.getAvailableModels();
      this.logger.log(
        `Found ${registryModels.length} open source models in registry`
      );

      for (const model of registryModels) {
        const key = `${model.provider}:${model.name}`;
        newModels.set(key, model);
        this.logger.debug(
          `Loaded open source model: ${key} (quality: ${model.qualityRating}, latency: ${model.latency}ms)`
        );
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load open source models from registry: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // 2. Then, load models from database configurations
    // This ensures that models explicitly configured by admin are always available
    // regardless of whether the provider supports listing models.
    try {
      this.logger.debug(
        'Fetching active model configurations from database...'
      );
      const activeConfigs = await this.modelConfigService.getAllModelConfigs();
      const activeModels = activeConfigs.filter((c) => c.isActive);

      this.logger.log(
        `Found ${activeModels.length} active model configurations in database`
      );

      for (const config of activeModels) {
        try {
          this.logger.debug(
            `Loading provider ${config.provider} for model ${config.name}...`
          );
          const provider = this.providerFactory.getProvider(config.provider);
          if (provider) {
            this.logger.debug(
              `Getting model info for ${config.name} from ${config.provider}...`
            );
            const modelInfo = await provider.getModelInfo(config.name);
            const key = `${provider.name}:${config.name}`;

            // Merge with registry data if available
            const registryModel = this.openSourceModelRegistry.getModel(
              config.name
            );
            if (registryModel) {
              // Merge database config with registry data
              const mergedModel: ModelInfo = {
                ...registryModel,
                ...modelInfo,
                name: config.name,
                provider: provider.name,
              };
              newModels.set(key, mergedModel);
              this.logger.debug(
                `Merged model from database and registry: ${key}`
              );
            } else {
              newModels.set(key, modelInfo);
              this.logger.debug(
                `Loaded model from database configuration: ${key} (cost: ${modelInfo.costPerInputToken}/${modelInfo.costPerOutputToken})`
              );
            }
          } else {
            this.logger.warn(
              `Provider ${config.provider} for model ${config.name} is not loaded or available`
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to load configured model ${config.name} from provider ${config.provider}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to load model configurations from database: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // 3. Then, try to discover additional models from providers (if supported)
    this.logger.debug('Discovering additional models from providers...');
    const providers = this.providerFactory.getAvailableProviders();
    this.logger.debug(
      `Found ${providers.length} available providers for discovery`
    );

    for (const provider of providers) {
      try {
        this.logger.debug(`Listing models for provider ${provider.name}...`);
        const modelNames = await provider.listModels();
        this.logger.debug(
          `Provider ${provider.name} returned ${modelNames.length} models`
        );

        for (const modelName of modelNames) {
          try {
            const key = `${provider.name}:${modelName}`;

            // Skip if already loaded from database or registry
            if (newModels.has(key)) continue;

            const modelInfo = await provider.getModelInfo(modelName);

            // Try to merge with registry data if available
            const registryModel =
              this.openSourceModelRegistry.getModel(modelName);
            if (registryModel) {
              const mergedModel: ModelInfo = {
                ...registryModel,
                ...modelInfo,
                name: modelName,
                provider: provider.name,
              };
              newModels.set(key, mergedModel);
              this.logger.debug(
                `Discovered and merged model from provider ${provider.name}: ${key}`
              );
            } else {
              newModels.set(key, modelInfo);
              this.logger.debug(
                `Discovered model from provider ${provider.name}: ${key}`
              );
            }
          } catch (error) {
            this.logger.warn(
              `Failed to get info for discovered model ${modelName} from provider ${provider.name}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to list models from provider ${provider.name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // 4. Register available models with scenario mapping service
    // Requirements: 2.1
    try {
      const availableModelsArray = Array.from(newModels.values());
      this.logger.log(
        `Discovered ${availableModelsArray.length} available models across all providers: ${availableModelsArray.map((m) => `${m.provider}:${m.name}`).join(', ')}`
      );

      const openSourceModels = availableModelsArray.map((m) => ({
        name: m.name,
        provider: m.provider,
        family: (m as any).family || 'other',
        parameterSize: (m as any).parameterSize || 'unknown',
        contextWindow: (m as any).contextWindow || 4096,
        costPerInputToken: m.costPerInputToken,
        costPerOutputToken: m.costPerOutputToken,
        latency: m.latency || 0,
        avgLatencyMs: m.latency || 0,
        qualityRating: (m as any).qualityRating || 5,
        supportedFeatures: (m as any).supportedFeatures || [],
        isAvailable: m.isAvailable,
        status: 'active',
        successRate: (m as any).successRate || 1.0,
        lastHealthCheckAt: new Date(),
        healthStatus: 'healthy',
      }));
      this.scenarioModelMappingService.registerAvailableModels(
        openSourceModels as any
      );
      this.logger.debug(
        'Registered available models with scenario mapping service'
      );
    } catch (error) {
      this.logger.warn(
        `Failed to register available models with scenario mapping service: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Swap the models map
    this.availableModels = newModels;
    this.logger.log(`Total available models: ${this.availableModels.size}`);
  }

  /**
   * Record latency and cost
   */
  private async recordMetrics(
    selectedModel: string,
    providerName: string,
    response: AIResponse,
    startTime: number,
    scenario: string,
    userId: string,
    modelInfo: ModelInfo
  ): Promise<void> {
    const latency = Date.now() - startTime;
    const cost =
      response.usage.inputTokens * modelInfo.costPerInputToken +
      response.usage.outputTokens * modelInfo.costPerOutputToken;

    await this.usageTracker.recordUsage({
      userId,
      model: selectedModel,
      provider: providerName,
      scenario,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      cost,
      latency,
      success: true,
      agentType: null,
      workflowStep: null,
      errorCode: null,
    });

    await this.performanceMonitor.recordMetrics(
      selectedModel,
      providerName,
      latency,
      true
    );
  }

  /**
   * Generate embedding for text
   * @param text - The text to embed
   * @param scenario - Scenario name for model selection
   * @param userId - User ID for tracking
   * @returns Promise resolving to embedding vector
   */
  async embed(
    text: string,
    userId: string,
    scenario: string = ScenarioType.AGENT_EMBEDDING_GENERATION
  ): Promise<number[]> {
    const startTime = Date.now();
    let selectedModel = '';
    let providerName = '';

    try {
      // Select model
      selectedModel = await this.selectModelForScenario(scenario);

      // Get provider
      const firstColonIndex = selectedModel.indexOf(':');
      providerName = selectedModel.substring(0, firstColonIndex);
      const modelName = selectedModel.substring(firstColonIndex + 1);
      const providerInstance = this.providerFactory.getProvider(providerName);

      if (!providerInstance) {
        throw new AIError(
          AIErrorCode.PROVIDER_UNAVAILABLE,
          `Provider ${providerName} not found`
        );
      }

      // Generate embedding
      const embedding = await providerInstance.embed(text, modelName);

      // Record metrics (with dummy usage for now as embeddings usage is simpler)
      const latency = Date.now() - startTime;
      await this.performanceMonitor.recordMetrics(
        selectedModel,
        providerName,
        latency,
        true
      );

      return embedding;
    } catch (error) {
      this.logger.error(
        `Embedding generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Call AI with unified interface
   * Property 5: Unified request format
   * Property 6: Unified response format
   * Validates: Requirements 2.3, 2.4
   *
   * @param request - Unified AI request
   * @param userId - User ID for tracking
   * @param scenario - Scenario name for model selection
   * @returns Unified AI response
   */
  async call(
    request: AIRequest,
    userId: string,
    scenario: string = ScenarioType.GENERAL,
    language: string = 'en'
  ): Promise<AIResponse> {
    const startTime = Date.now();
    let selectedModel = '';
    let providerName = '';

    try {
      // Validate request
      this.validateRequest(request);

      // Select model if not specified
      selectedModel = request.model;
      if (!selectedModel) {
        selectedModel = await this.selectModelForScenario(scenario);
      }

      // Get provider and model info
      const firstColonIndex = selectedModel.indexOf(':');
      if (firstColonIndex === -1) {
        throw new AIError(
          AIErrorCode.INVALID_REQUEST,
          `Invalid model format: ${selectedModel}. Expected provider:model`,
          undefined,
          false
        );
      }
      providerName = selectedModel.substring(0, firstColonIndex);
      const modelName = selectedModel.substring(firstColonIndex + 1);
      const providerInstance = this.providerFactory.getProvider(providerName);

      if (!providerInstance) {
        throw new AIError(
          AIErrorCode.PROVIDER_UNAVAILABLE,
          `Provider ${providerName} not found`,
          undefined,
          true
        );
      }

      let modelInfo = this.availableModels.get(selectedModel);

      // If model info not found in registry but we have a provider (e.g. hard fallback)
      // try to get it directly from the provider
      if (!modelInfo) {
        try {
          this.logger.debug(
            `Model ${selectedModel} not found in registry, attempting to get info directly from provider ${providerName}`
          );
          modelInfo = await providerInstance.getModelInfo(modelName);
        } catch (error) {
          this.logger.warn(
            `Failed to get model info for ${selectedModel} directly from provider: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (!modelInfo) {
        throw new AIError(
          AIErrorCode.INVALID_REQUEST,
          `Model ${selectedModel} not found and could not be retrieved from provider`,
          undefined,
          false
        );
      }

      // Render prompt template if needed
      let finalPrompt = request.prompt;
      if (request.metadata?.templateName) {
        const template = await this.promptTemplateManager.getTemplate(
          request.metadata.templateName as string,
          language,
          providerName
        );

        if (template) {
          finalPrompt = await this.promptTemplateManager.renderTemplate(
            template,
            request.metadata.templateVariables as Record<string, string>
          );
        }
      }

      // Prepare request for provider
      const providerRequest: AIRequest = {
        ...request,
        model: modelName,
        prompt: finalPrompt,
      };

      // Execute with retry
      let response: AIResponse;
      try {
        response = await this.retryHandler.executeWithRetry(async () => {
          return await providerInstance.call(providerRequest);
        });
      } catch (error) {
        // Log error
        await this.aiLogger.logError(
          selectedModel,
          providerName,
          error instanceof AIError ? error.code : AIErrorCode.UNKNOWN_ERROR,
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : undefined,
          scenario,
          userId
        );

        throw error;
      }

      // Record latency
      const latency = Date.now() - startTime;

      // Calculate cost
      const cost =
        response.usage.inputTokens * modelInfo.costPerInputToken +
        response.usage.outputTokens * modelInfo.costPerOutputToken;

      // Track usage
      await this.usageTracker.recordUsage({
        userId,
        model: selectedModel,
        provider: providerName,
        scenario,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cost,
        latency,
        success: true,
        agentType: null,
        workflowStep: null,
        errorCode: null,
      });

      // Record performance metrics
      await this.performanceMonitor.recordMetrics(
        selectedModel,
        providerName,
        latency,
        true
      );

      // Log successful response
      await this.aiLogger.logAICall({
        model: selectedModel,
        provider: providerName,
        scenario,
        responseContent: response.content.substring(0, 500), // Truncate for logging
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        latency,
        success: true,
        userId,
      });

      this.logger.debug(
        `AI call completed: model=${selectedModel}, latency=${latency}ms, cost=${cost}`
      );

      return response;
    } catch (error) {
      const latency = Date.now() - startTime;

      // Record failed call
      await this.performanceMonitor.recordMetrics(
        selectedModel || request.model || 'unknown',
        providerName || 'unknown',
        latency,
        false
      );

      this.logger.error(
        `AI call failed: ${error instanceof Error ? error.message : String(error)}`
      );

      throw error;
    }
  }

  /**
   * Stream AI response
   * Property 7: Stream and non-stream support
   * Validates: Requirements 2.5
   *
   * @param request - Unified AI request
   * @param userId - User ID for tracking
   * @param scenario - Scenario name for model selection
   * @returns Async iterable of stream chunks
   */
  async *stream(
    request: AIRequest,
    userId: string,
    scenario: string = ScenarioType.GENERAL,
    language: string = 'en'
  ): AsyncGenerator<AIStreamChunk> {
    const startTime = Date.now();
    let selectedModel = '';
    let providerName = '';

    try {
      // Validate request
      this.validateRequest(request);

      // Select model if not specified
      selectedModel = request.model;
      if (!selectedModel) {
        selectedModel = await this.selectModelForScenario(scenario);
      }

      // Get provider and model info
      const firstColonIndex = selectedModel.indexOf(':');
      if (firstColonIndex === -1) {
        throw new AIError(
          AIErrorCode.INVALID_REQUEST,
          `Invalid model format: ${selectedModel}. Expected provider:model`,
          undefined,
          false
        );
      }
      providerName = selectedModel.substring(0, firstColonIndex);
      const modelName = selectedModel.substring(firstColonIndex + 1);
      const providerInstance = this.providerFactory.getProvider(providerName);

      if (!providerInstance) {
        throw new AIError(
          AIErrorCode.PROVIDER_UNAVAILABLE,
          `Provider ${providerName} not found`,
          undefined,
          true
        );
      }

      let modelInfo = this.availableModels.get(selectedModel);

      // If model info not found in registry but we have a provider (e.g. hard fallback)
      // try to get it directly from the provider
      if (!modelInfo) {
        try {
          this.logger.debug(
            `Model ${selectedModel} not found in registry, attempting to get info directly from provider ${providerName}`
          );
          modelInfo = await providerInstance.getModelInfo(modelName);
        } catch (error) {
          this.logger.warn(
            `Failed to get model info for ${selectedModel} directly from provider: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (!modelInfo) {
        throw new AIError(
          AIErrorCode.INVALID_REQUEST,
          `Model ${selectedModel} not found and could not be retrieved from provider`,
          undefined,
          false
        );
      }

      // Render prompt template if needed
      let finalPrompt = request.prompt;
      if (request.metadata?.templateName) {
        const template = await this.promptTemplateManager.getTemplate(
          request.metadata.templateName as string,
          language,
          providerName
        );

        if (template) {
          finalPrompt = await this.promptTemplateManager.renderTemplate(
            template,
            request.metadata.templateVariables as Record<string, string>
          );
        }
      }

      // Prepare request for provider
      const providerRequest: AIRequest = {
        ...request,
        model: modelName,
        prompt: finalPrompt,
      };

      // Stream with timeout and retry
      const STREAM_TIMEOUT = 120000; // 120s total stream timeout
      const streamStartTime = Date.now();

      try {
        const iterator = providerInstance
          .stream(providerRequest)
          [Symbol.asyncIterator]();

        while (true) {
          // Check for total duration timeout
          if (Date.now() - streamStartTime > STREAM_TIMEOUT) {
            throw new AIError(
              AIErrorCode.TIMEOUT,
              `Streaming timed out after ${STREAM_TIMEOUT}ms`,
              undefined,
              true
            );
          }

          const { value: chunk, done } = await iterator.next();
          if (done) break;
          yield chunk;
        }
      } catch (error) {
        // Log error
        await this.aiLogger.logError(
          selectedModel,
          providerName,
          error instanceof AIError ? error.code : AIErrorCode.UNKNOWN_ERROR,
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : undefined,
          scenario,
          userId
        );

        throw error;
      }

      // Record latency
      const latency = Date.now() - startTime;

      // Record performance metrics
      await this.performanceMonitor.recordMetrics(
        selectedModel,
        providerName,
        latency,
        true
      );

      // Log successful stream
      await this.aiLogger.logAICall({
        model: selectedModel,
        provider: providerName,
        scenario,
        latency,
        success: true,
        userId,
      });

      this.logger.debug(
        `AI stream completed: model=${selectedModel}, latency=${latency}ms`
      );
    } catch (error) {
      const latency = Date.now() - startTime;

      // Record failed call
      await this.performanceMonitor.recordMetrics(
        selectedModel || request.model || 'unknown',
        providerName || 'unknown',
        latency,
        false
      );

      this.logger.error(
        `AI stream failed: ${error instanceof Error ? error.message : String(error)}`
      );

      throw error;
    }
  }

  /**
   * Select the best model for a scenario
   * Property 22: Scenario selection strategy definition
   * Property 23: Resume parsing cost optimization
   * Property 24: Optimization suggestion quality optimization
   * Property 25: Interview question speed optimization
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 1.4, 6.1-6.6
   *
   * @param scenario - Scenario name
   * @returns Selected model name
   */
  private async selectBestModel(scenario: string): Promise<string> {
    const availableModels = Array.from(this.availableModels.values());

    if (availableModels.length === 0) {
      this.logger.warn(
        `No models available in registry. Attempting to find local Ollama fallback for scenario: ${scenario}`
      );

      // Try to find any Ollama model as a last resort
      try {
        const ollamaProvider = this.providerFactory.getProvider('ollama');
        if (ollamaProvider) {
          // Try to list models directly from provider if registry is empty
          const modelNames = await (ollamaProvider as any).listModels?.();
          if (modelNames && modelNames.length > 0) {
            this.logger.log(
              `Falling back to local Ollama model: ${modelNames[0]}`
            );
            return `ollama:${modelNames[0]}`;
          }
          this.logger.log('Falling back to local Ollama (llama3.2)');
          return 'ollama:llama3.2'; // Default fallback
        }
      } catch (error) {
        this.logger.error('Ollama provider not available for fallback');
      }

      throw new AIError(
        AIErrorCode.PROVIDER_UNAVAILABLE,
        'No models available and no fallback found',
        undefined,
        true
      );
    }

    try {
      const selectedModel = this.modelSelector.selectModel(
        availableModels,
        scenario
      );
      return `${selectedModel.provider}:${selectedModel.name}`;
    } catch (error) {
      this.logger.warn(
        `Model selection failed for scenario ${scenario}: ${error instanceof Error ? error.message : String(error)}. Attempting fallback.`
      );

      // 1. Try to find any Ollama model already in the registry
      const ollamaModel = availableModels.find((m) => m.provider === 'ollama');
      if (ollamaModel) {
        return `${ollamaModel.provider}:${ollamaModel.name}`;
      }

      // 2. Try to use Ollama provider directly if it's healthy, even if no models in registry
      try {
        const ollamaProvider = this.providerFactory.getProvider('ollama');
        if (ollamaProvider) {
          this.logger.log(
            'Model selection failed, falling back to local Ollama (llama3.2)'
          );
          return 'ollama:llama3.2';
        }
      } catch (e) {
        // Ollama not available, continue to last resort
      }

      // 3. Last resort: just pick the first one from registry
      const firstModel = availableModels[0];
      return `${firstModel.provider}:${firstModel.name}`;
    }
  }

  /**
   * Select model for a specific scenario using scenario configuration
   * Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   *
   * @param scenario - Scenario type
   * @returns Selected model name
   */
  private async selectModelForScenario(scenario: string): Promise<string> {
    const availableModels = Array.from(this.availableModels.values());

    if (availableModels.length === 0) {
      this.logger.warn(
        `No models available in registry for scenario: ${scenario}`
      );

      // Try to find any Ollama model as a last resort
      try {
        const ollamaProvider = this.providerFactory.getProvider('ollama');
        if (ollamaProvider) {
          // Try to list models directly from provider if registry is empty
          const modelNames = await (ollamaProvider as any).listModels?.();
          if (modelNames && modelNames.length > 0) {
            this.logger.log(
              `Falling back to local Ollama model: ${modelNames[0]}`
            );
            return `ollama:${modelNames[0]}`;
          }
          this.logger.log('Falling back to local Ollama (llama3.2)');
          return 'ollama:llama3.2';
        }
      } catch (error) {
        this.logger.error('Ollama provider not available for fallback');
      }

      throw new AIError(
        AIErrorCode.PROVIDER_UNAVAILABLE,
        'No models available and no fallback found',
        undefined,
        true
      );
    }

    try {
      // Try to use scenario-based selection if available
      const selectedModel = this.modelSelector.selectModelForScenario(
        scenario as any,
        availableModels
      );
      return `${selectedModel.provider}:${selectedModel.name}`;
    } catch (error) {
      this.logger.warn(
        `Scenario-based selection failed for ${scenario}: ${error instanceof Error ? error.message : String(error)}. Falling back to default selection.`
      );

      // Fall back to default selection
      return await this.selectBestModel(scenario);
    }
  }

  /**
   * Get recommended models for a scenario
   * Requirements: 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   *
   * @param scenario - Scenario type
   * @returns Array of recommended models
   */
  getRecommendedModelsForScenario(scenario: string): ModelInfo[] {
    const availableModels = Array.from(this.availableModels.values());
    return this.modelSelector.getRecommendedModels(
      scenario as any,
      availableModels
    );
  }

  /**
   * Get all available models
   * Property 1: Multiple provider support
   * Validates: Requirements 1.1-1.5
   *
   * @returns Array of available models
   */
  getAvailableModels(): ModelInfo[] {
    return Array.from(this.availableModels.values());
  }

  /**
   * Get available models for a specific provider
   *
   * @param providerName - Provider name
   * @returns Array of models from that provider
   */
  getModelsByProvider(providerName: string): ModelInfo[] {
    return Array.from(this.availableModels.values()).filter(
      (m) => m.provider === providerName
    );
  }

  /**
   * Get model info by name
   *
   * @param modelName - Model name (format: provider:model)
   * @returns Model info or undefined
   */
  getModelInfo(modelName: string): ModelInfo | undefined {
    return this.availableModels.get(modelName);
  }

  /**
   * Reload models from providers
   * Property 3: Dynamic configuration update
   * Validates: Requirements 1.7
   */
  async reloadModels(): Promise<void> {
    this.logger.log('Reloading available models');

    try {
      await this.loadAvailableModels();
      this.logger.log('Models reloaded successfully');
    } catch (error) {
      this.logger.error(
        `Failed to reload models: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get model selection statistics
   * Property 28: Model selection logging
   * Validates: Requirements 5.7
   *
   * @returns Selection statistics
   */
  getSelectionStatistics() {
    return this.modelSelector.getSelectionStatistics();
  }

  /**
   * Get selection decision log
   *
   * @param limit - Maximum number of recent decisions
   * @returns Array of selection decisions
   */
  getSelectionLog(limit?: number) {
    return this.modelSelector.getSelectionLog(limit);
  }

  /**
   * Get cost report
   */
  async getCostReport(
    startDate: Date,
    endDate: Date,
    groupBy: 'model' | 'scenario' | 'user' | 'agent-type' | 'workflow-step'
  ) {
    return this.usageTracker.generateCostReport(startDate, endDate, groupBy);
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    model?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    if (model) {
      return this.performanceMonitor.getMetrics(model, startDate, endDate);
    }
    return this.performanceMonitor.getAllMetrics();
  }

  /**
   * Check performance alerts
   */
  async checkPerformanceAlerts() {
    return this.performanceMonitor.checkAlerts();
  }

  /**
   * Get logs
   */
  async getLogs(filters: any) {
    return this.aiLogger.queryLogs(filters);
  }

  /**
   * Validate AI request
   * Property 5: Unified request format
   * Validates: Requirements 2.3
   */
  private validateRequest(request: AIRequest): void {
    if (!request.prompt || !request.prompt.trim()) {
      throw new AIError(
        AIErrorCode.INVALID_REQUEST,
        'Prompt is required',
        undefined,
        false
      );
    }

    if (request.temperature !== undefined) {
      if (request.temperature < 0 || request.temperature > 2) {
        throw new AIError(
          AIErrorCode.INVALID_REQUEST,
          'Temperature must be between 0 and 2',
          undefined,
          false
        );
      }
    }

    if (request.maxTokens !== undefined) {
      if (request.maxTokens < 1) {
        throw new AIError(
          AIErrorCode.INVALID_REQUEST,
          'Max tokens must be at least 1',
          undefined,
          false
        );
      }
    }
  }
}
