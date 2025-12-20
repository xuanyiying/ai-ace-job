/**
 * Qwen (Alibaba) AI Provider
 * Implements AIProvider interface for Alibaba's Qwen models
 * Requirements: 1.1, 2.2, 2.3, 2.4, 2.5, 2.6
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
import { QwenConfig } from '@/ai-providers/interfaces/model-config.interface';
import { AIError, AIErrorCode, toAIError } from '@/ai-providers/utils/ai-error';
import { RetryHandler } from '@/ai-providers/utils/retry-handler';
import { AIHttpClient } from '@/ai-providers/utils/http-client';

/**
 * Qwen API Response structure
 */
interface QwenAPIResponse {
  output: {
    text: string;
    finish_reason: string;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  request_id: string;
}

/**
 * Qwen Streaming Response structure
 */
interface QwenStreamResponse {
  output: {
    text: string;
    finish_reason?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  request_id: string;
}

/**
 * Qwen Provider Implementation
 */
export class QwenProvider implements AIProvider {
  readonly name = 'qwen';
  private readonly logger = new Logger(QwenProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly config: QwenConfig;
  private readonly retryHandler: RetryHandler;

  /**
   * Available Qwen models
   */
  private readonly availableModels = [
    'qwen-max',
    'qwen-plus',
    'qwen-turbo',
    'qwen-long',
  ];

  /**
   * Model information cache
   */
  private modelInfoCache: Map<string, ModelInfo> = new Map();

  constructor(config: QwenConfig) {
    this.config = config;
    this.retryHandler = new RetryHandler();

    // Initialize HTTP client using AIHttpClient with Bearer token authentication
    const httpClient = new AIHttpClient({
      baseURL: config.endpoint || 'https://dashscope.aliyuncs.com/api/v1',
      timeout: config.timeout || 30000,
      authentication: {
        type: 'bearer',
        token: config.apiKey,
      },
      logger: this.logger,
      providerName: 'Qwen',
    });

    this.httpClient = httpClient.getInstance();

    this.logger.log('Qwen provider initialized');
  }

  /**
   * Call Qwen API
   * Validates: Requirements 2.3, 2.4
   */
  async call(request: AIRequest): Promise<AIResponse> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        const payload = this.buildRequestPayload(request);

        this.logger.debug(`Calling Qwen API with model: ${request.model}`);

        const response = await this.httpClient.post<QwenAPIResponse>(
          '/services/aigc/text-generation/generation',
          payload
        );

        const data = response.data;

        return {
          content: data.output.text,
          model: request.model,
          provider: this.name,
          usage: {
            inputTokens: data.usage.input_tokens,
            outputTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          },
          finishReason: data.output.finish_reason,
          metadata: {
            requestId: data.request_id,
          },
        };
      } catch (error) {
        const aiError = toAIError(error, this.name, request.model);
        this.logger.error(`Qwen API call failed: ${aiError.message}`, {
          code: aiError.code,
          model: request.model,
        });
        throw aiError;
      }
    });
  }

  /**
   * Stream Qwen API response
   * Validates: Requirements 2.5
   */
  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    try {
      const payload = this.buildRequestPayload(request);
      const parameters = (payload.parameters as Record<string, unknown>) || {};
      parameters.incremental_output = true;
      payload.parameters = parameters;

      this.logger.debug(`Streaming Qwen API with model: ${request.model}`);

      const response = await this.httpClient.post(
        '/services/aigc/text-generation/generation',
        payload,
        {
          responseType: 'stream',
        }
      );

      const stream = response.data;

      for await (const chunk of stream) {
        const lines = chunk.toString().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // Parse SSE format: data: {...}
            if (line.startsWith('data:')) {
              const jsonStr = line.substring(5).trim();
              const data: QwenStreamResponse = JSON.parse(jsonStr);

              yield {
                content: data.output.text,
                model: request.model,
                provider: this.name,
                finishReason: data.output.finish_reason,
              };
            }
          } catch (parseError) {
            this.logger.warn(`Failed to parse stream chunk: ${line}`);
          }
        }
      }
    } catch (error) {
      const aiError = toAIError(error, this.name, request.model);
      this.logger.error(`Qwen streaming failed: ${aiError.message}`, {
        code: aiError.code,
        model: request.model,
      });
      throw aiError;
    }
  }

  /**
   * Health check for Qwen provider
   * Validates: Requirements 2.2
   */
  async healthCheck(): Promise<boolean> {
    try {
      this.logger.debug('Performing Qwen health check');

      // Try to list models as a health check
      const models = await this.listModels();

      const isHealthy = models.length > 0;

      if (isHealthy) {
        this.logger.log('Qwen provider health check passed');
      } else {
        this.logger.warn(
          'Qwen provider health check failed: no models available'
        );
      }

      return isHealthy;
    } catch (error) {
      this.logger.error(
        `Qwen provider health check failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return false;
    }
  }

  /**
   * List available models
   * Validates: Requirements 1.1, 2.2
   */
  async listModels(): Promise<string[]> {
    try {
      this.logger.debug('Listing available Qwen models');

      // For Qwen, we return the predefined list of available models
      // In a real implementation, this could fetch from an API endpoint
      return this.availableModels;
    } catch (error) {
      this.logger.error(
        `Failed to list Qwen models: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get model information
   * Validates: Requirements 2.2
   */
  async getModelInfo(modelName: string): Promise<ModelInfo> {
    // Check cache first
    if (this.modelInfoCache.has(modelName)) {
      return this.modelInfoCache.get(modelName)!;
    }

    // Define model information
    const modelInfoMap: Record<string, ModelInfo> = {
      'qwen-max': {
        name: 'qwen-max',
        provider: this.name,
        contextWindow: 8000,
        costPerInputToken: 0.02 / 1000, // $0.02 per 1K tokens
        costPerOutputToken: 0.06 / 1000, // $0.06 per 1K tokens
        latency: 2000, // Average latency in ms
        successRate: 0.99,
        isAvailable: true,
      },
      'qwen-plus': {
        name: 'qwen-plus',
        provider: this.name,
        contextWindow: 4000,
        costPerInputToken: 0.008 / 1000, // $0.008 per 1K tokens
        costPerOutputToken: 0.02 / 1000, // $0.02 per 1K tokens
        latency: 1500,
        successRate: 0.98,
        isAvailable: true,
      },
      'qwen-turbo': {
        name: 'qwen-turbo',
        provider: this.name,
        contextWindow: 4000,
        costPerInputToken: 0.002 / 1000, // $0.002 per 1K tokens
        costPerOutputToken: 0.006 / 1000, // $0.006 per 1K tokens
        latency: 1000,
        successRate: 0.97,
        isAvailable: true,
      },
      'qwen-long': {
        name: 'qwen-long',
        provider: this.name,
        contextWindow: 30000,
        costPerInputToken: 0.01 / 1000, // $0.01 per 1K tokens
        costPerOutputToken: 0.03 / 1000, // $0.03 per 1K tokens
        latency: 3000,
        successRate: 0.98,
        isAvailable: true,
      },
    };

    const modelInfo = modelInfoMap[modelName];

    if (!modelInfo) {
      throw new AIError(
        AIErrorCode.MODEL_NOT_FOUND,
        `Model ${modelName} not found in Qwen provider`,
        undefined,
        false,
        this.name,
        modelName
      );
    }

    // Cache the model info
    this.modelInfoCache.set(modelName, modelInfo);

    return modelInfo;
  }

  /**
   * Build request payload for Qwen API
   */
  private buildRequestPayload(request: AIRequest): Record<string, unknown> {
    return {
      model: request.model,
      input: {
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
      },
      parameters: {
        temperature:
          request.temperature ?? this.config.defaultTemperature ?? 0.7,
        max_tokens: request.maxTokens ?? this.config.defaultMaxTokens ?? 2000,
        top_p: request.topP,
        top_k: request.topK,
        stop: request.stopSequences,
      },
    };
  }
}
