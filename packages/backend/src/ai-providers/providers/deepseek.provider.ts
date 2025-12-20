/**
 * DeepSeek AI Provider
 * Implements AIProvider interface for DeepSeek models
 * DeepSeek API is compatible with OpenAI API
 */

import { Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ModelInfo,
} from '@/ai-providers/interfaces';
import { DeepSeekConfig } from '@/ai-providers/interfaces/model-config.interface';
import { AIHttpClient } from '@/ai-providers/utils/http-client';
import { toAIError } from '@/ai-providers/utils/ai-error';
import { RetryHandler } from '@/ai-providers/utils/retry-handler';

/**
 * DeepSeek API Response structure (Compatible with OpenAI)
 */
interface DeepSeekAPIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * DeepSeek Stream Response structure (Compatible with OpenAI)
 */
interface DeepSeekStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

/**
 * DeepSeek Models List Response
 */
interface DeepSeekModelsResponse {
  object: string;
  data: {
    id: string;
    object: string;
    owned_by: string;
  }[];
}

/**
 * DeepSeek Provider Implementation
 */
export class DeepSeekProvider implements AIProvider {
  readonly name = 'deepseek';
  private readonly logger = new Logger(DeepSeekProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly config: DeepSeekConfig;
  private readonly retryHandler: RetryHandler;
  private modelInfoCache: Map<string, ModelInfo> = new Map();

  constructor(config: DeepSeekConfig) {
    this.config = config;
    this.retryHandler = new RetryHandler();

    const httpClient = new AIHttpClient({
      baseURL: config.endpoint || 'https://api.deepseek.com',
      timeout: config.timeout || 30000,
      authentication: {
        type: 'bearer',
        token: config.apiKey,
      },
      logger: this.logger,
      providerName: 'DeepSeek',
    });

    this.httpClient = httpClient.getInstance();
    this.logger.log('DeepSeek provider initialized');
  }

  /**
   * Call DeepSeek API
   */
  async call(request: AIRequest): Promise<AIResponse> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        const payload = this.buildRequestPayload(request);
        this.logger.debug(`Calling DeepSeek API with model: ${request.model}`);

        const response = await this.httpClient.post<DeepSeekAPIResponse>(
          '/chat/completions',
          payload
        );

        const data = response.data;
        const choice = data.choices[0];

        return {
          content: choice.message.content,
          model: data.model,
          provider: this.name,
          usage: {
            inputTokens: data.usage.prompt_tokens,
            outputTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          },
          finishReason: choice.finish_reason,
          metadata: {
            requestId: data.id,
          },
        };
      } catch (error) {
        throw toAIError(error, this.name, request.model);
      }
    });
  }

  /**
   * Stream DeepSeek API response
   */
  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    try {
      const payload = { ...this.buildRequestPayload(request), stream: true };
      this.logger.debug(`Streaming DeepSeek API with model: ${request.model}`);

      const response = await this.httpClient.post(
        '/chat/completions',
        payload,
        { responseType: 'stream' }
      );

      const stream = response.data;

      for await (const chunk of stream) {
        const lines = chunk.toString().split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.substring(6);
              const data: DeepSeekStreamResponse = JSON.parse(jsonStr);
              const choice = data.choices[0];

              if (choice.delta.content) {
                yield {
                  content: choice.delta.content,
                  model: data.model,
                  provider: this.name,
                  finishReason: choice.finish_reason || undefined,
                };
              }
            } catch (e) {
              this.logger.warn(`Failed to parse stream chunk: ${trimmedLine}`);
            }
          }
        }
      }
    } catch (error) {
      throw toAIError(error, this.name, request.model);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.httpClient.get('/models');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `DeepSeek provider health check failed: ${errorMessage}. Provider will be unavailable.`
      );
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response =
        await this.httpClient.get<DeepSeekModelsResponse>('/models');
      return response.data.data.map((model) => model.id);
    } catch (error) {
      this.logger.error(
        `Failed to list DeepSeek models: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Get model info
   */
  async getModelInfo(modelName: string): Promise<ModelInfo> {
    if (this.modelInfoCache.has(modelName)) {
      return this.modelInfoCache.get(modelName)!;
    }

    // Default model info for DeepSeek models
    const defaultInfo: ModelInfo = {
      name: modelName,
      provider: this.name,
      contextWindow: 32000, // Default context window
      costPerInputToken: 0, // Placeholder
      costPerOutputToken: 0, // Placeholder
      latency: 1000,
      successRate: 0.99,
      isAvailable: true,
    };

    if (modelName === 'deepseek-chat') {
      defaultInfo.contextWindow = 32000;
      defaultInfo.costPerInputToken = 0.00014 / 1000; // $0.14 per 1M tokens
      defaultInfo.costPerOutputToken = 0.00028 / 1000; // $0.28 per 1M tokens
    } else if (modelName === 'deepseek-coder') {
      defaultInfo.contextWindow = 32000;
      defaultInfo.costPerInputToken = 0.00014 / 1000;
      defaultInfo.costPerOutputToken = 0.00028 / 1000;
    }

    this.modelInfoCache.set(modelName, defaultInfo);
    return defaultInfo;
  }

  private buildRequestPayload(request: AIRequest): Record<string, any> {
    return {
      model: request.model,
      messages: [
        { role: 'system', content: request.systemPrompt || '' },
        { role: 'user', content: request.prompt },
      ],
      temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config.defaultMaxTokens,
      top_p: request.topP,
      stop: request.stopSequences,
    };
  }
}
