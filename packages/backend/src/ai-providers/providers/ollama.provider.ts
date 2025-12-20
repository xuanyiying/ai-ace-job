/**
 * Ollama AI Provider
 * Implements AIProvider interface for local Ollama deployments
 * Requirements: 1.5, 9.1, 9.2, 9.3, 9.4, 9.6
 */

import { Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ModelInfo,
} from '../interfaces';
import { OllamaConfig } from '@/ai-providers/interfaces/model-config.interface';
import { toAIError } from '@/ai-providers/utils/ai-error';
import { RetryHandler } from '@/ai-providers/utils/retry-handler';
import { AIHttpClient } from '@/ai-providers/utils/http-client';

/**
 * Ollama API Response structure
 */
interface OllamaAPIResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

/**
 * Ollama Models List Response
 */
interface OllamaModelsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
    digest: string;
  }>;
}

/**
 * Ollama Provider Implementation
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly config: OllamaConfig;
  private readonly retryHandler: RetryHandler;
  private availableModels: string[] = [];
  private modelInfoCache: Map<string, ModelInfo> = new Map();
  private lastModelsRefresh: number = 0;
  private readonly modelsRefreshInterval: number = 60000; // 1 minute

  constructor(config: OllamaConfig) {
    this.config = config;
    this.retryHandler = new RetryHandler();

    // Initialize HTTP client using AIHttpClient
    let baseUrl = config.baseUrl || 'http://localhost:11434';
    // Remove trailing slash and /api if present to prevent double api paths
    baseUrl = baseUrl.replace(/\/$/, '').replace(/\/api$/, '');
    const httpClient = new AIHttpClient({
      baseURL: baseUrl,
      timeout: config.timeout || 30000,
      logger: this.logger,
      providerName: 'Ollama',
    });

    this.httpClient = httpClient.getInstance();

    this.logger.log(`Ollama provider initialized with base URL: ${baseUrl}`);
  }

  /**
   * Call Ollama API
   * Validates: Requirements 9.3
   */
  async call(request: AIRequest): Promise<AIResponse> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        const payload = this.buildRequestPayload(request);

        this.logger.debug(`Calling Ollama API with model: ${request.model}`);

        const response = await this.httpClient.post<OllamaAPIResponse>(
          '/api/chat',
          payload
        );

        const data = response.data;

        // Calculate token counts (Ollama provides these in the response)
        const inputTokens = data.prompt_eval_count || 0;
        const outputTokens = data.eval_count || 0;

        return {
          content: data.message.content,
          model: request.model,
          provider: this.name,
          usage: {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
          },
          finishReason: data.done ? 'stop' : 'length',
          metadata: {
            totalDuration: data.total_duration,
            loadDuration: data.load_duration,
            promptEvalDuration: data.prompt_eval_duration,
            evalDuration: data.eval_duration,
          },
        };
      } catch (error) {
        const aiError = toAIError(error, this.name, request.model);
        this.logger.error(`Ollama API call failed: ${aiError.message}`, {
          code: aiError.code,
          model: request.model,
        });
        throw aiError;
      }
    });
  }

  /**
   * Stream Ollama API response
   * Validates: Requirements 9.3
   */
  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    try {
      const payload = this.buildRequestPayload(request);

      this.logger.debug(`Streaming Ollama API with model: ${request.model}`);

      const response = await this.httpClient.post('/api/chat', payload, {
        responseType: 'stream',
      });

      const stream = response.data;

      for await (const chunk of stream) {
        const lines = chunk.toString().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data: OllamaAPIResponse = JSON.parse(line);

            yield {
              content: data.message.content,
              model: request.model,
              provider: this.name,
              finishReason: data.done ? 'stop' : undefined,
            };
          } catch (parseError) {
            this.logger.warn(`Failed to parse stream chunk: ${line}`);
          }
        }
      }
    } catch (error) {
      const aiError = toAIError(error, this.name, request.model);
      this.logger.error(`Ollama streaming failed: ${aiError.message}`, {
        code: aiError.code,
        model: request.model,
      });
      throw aiError;
    }
  }

  /**
   * Health check for Ollama provider
   * Validates: Requirements 9.1
   */
  async healthCheck(): Promise<boolean> {
    try {
      this.logger.debug('Performing Ollama health check');

      // Try to get tags (list models) as a health check
      await this.httpClient.get('/api/tags');

      this.logger.log('Ollama provider health check passed');
      // Refresh models list on successful health check
      await this.refreshModelsList();

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Ollama provider health check failed: ${errorMessage}. This is expected if Ollama is not running locally.`
      );
      return false;
    }
  }

  /**
   * List available models
   * Validates: Requirements 9.2
   */
  async listModels(): Promise<string[]> {
    try {
      this.logger.debug('Listing available Ollama models');

      // Refresh models if cache is stale
      const now = Date.now();
      if (
        this.availableModels.length === 0 ||
        now - this.lastModelsRefresh > this.modelsRefreshInterval
      ) {
        await this.refreshModelsList();
      }

      return this.availableModels;
    } catch (error) {
      this.logger.error(
        `Failed to list Ollama models: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get model information
   * Validates: Requirements 9.3
   */
  async getModelInfo(modelName: string): Promise<ModelInfo> {
    // Check cache first
    if (this.modelInfoCache.has(modelName)) {
      return this.modelInfoCache.get(modelName)!;
    }

    // For Ollama, we provide generic model info
    // In a real implementation, this could fetch from model metadata
    const modelInfo: ModelInfo = {
      name: modelName,
      provider: this.name,
      contextWindow: 4096, // Default context window for most open models
      costPerInputToken: 0, // Ollama is free (local)
      costPerOutputToken: 0, // Ollama is free (local)
      latency: 2000, // Average latency in ms (varies by model)
      successRate: 0.95,
      isAvailable: this.availableModels.includes(modelName),
    };

    // Cache the model info
    this.modelInfoCache.set(modelName, modelInfo);

    return modelInfo;
  }

  /**
   * Refresh the list of available models from Ollama
   */
  private async refreshModelsList(): Promise<void> {
    try {
      this.logger.debug('Refreshing Ollama models list');

      const response =
        await this.httpClient.get<OllamaModelsResponse>('/api/tags');

      const models = response.data.models || [];
      this.availableModels = models.map((m) => m.name);
      this.lastModelsRefresh = Date.now();

      this.logger.log(
        `Found ${this.availableModels.length} Ollama models: ${this.availableModels.join(', ')}`
      );

      // Clear model info cache when models list changes
      this.modelInfoCache.clear();
    } catch (error) {
      this.logger.error(
        `Failed to refresh Ollama models list: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Build request payload for Ollama API
   */
  private buildRequestPayload(request: AIRequest): Record<string, unknown> {
    return {
      model: request.model,
      messages: [
        {
          role: 'system',
          content: request.systemPrompt || 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: request.prompt,
        },
      ],
      stream: false,
      options: {
        temperature:
          request.temperature ?? this.config.defaultTemperature ?? 0.7,
        num_predict: request.maxTokens ?? this.config.defaultMaxTokens ?? 2000,
        top_p: request.topP,
        top_k: request.topK,
        stop: request.stopSequences,
      },
    };
  }
}
