/**
 * OpenAI AI Provider
 * Implements AIProvider interface for OpenAI models
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
import { OpenAIConfig } from '@/ai-providers/interfaces/model-config.interface';
import { AIHttpClient } from '@/ai-providers/utils/http-client';
import { toAIError } from '@/ai-providers/utils/ai-error';
import { RetryHandler } from '@/ai-providers/utils/retry-handler';

/**
 * OpenAI API Response structure
 */
interface OpenAIAPIResponse {
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
 * OpenAI Stream Response structure
 */
interface OpenAIStreamResponse {
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
 * OpenAI Models List Response
 */
interface OpenAIModelsResponse {
  object: string;
  data: {
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }[];
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly config: OpenAIConfig;
  private readonly retryHandler: RetryHandler;
  private modelInfoCache: Map<string, ModelInfo> = new Map();

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.retryHandler = new RetryHandler();

    const httpClient = new AIHttpClient({
      baseURL: config.endpoint || 'https://api.openai.com/v1',
      timeout: config.timeout || 30000,
      authentication: {
        type: 'bearer',
        token: config.apiKey,
      },
      headers: config.organization
        ? { 'OpenAI-Organization': config.organization }
        : undefined,
      logger: this.logger,
      providerName: 'OpenAI',
    });

    this.httpClient = httpClient.getInstance();
    this.logger.log('OpenAI provider initialized');
  }

  /**
   * Call OpenAI API
   */
  async call(request: AIRequest): Promise<AIResponse> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        const payload = this.buildRequestPayload(request);
        this.logger.debug(`Calling OpenAI API with model: ${request.model}`);

        const response = await this.httpClient.post<OpenAIAPIResponse>(
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
   * Stream OpenAI API response
   */
  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    try {
      const payload = { ...this.buildRequestPayload(request), stream: true };
      this.logger.debug(`Streaming OpenAI API with model: ${request.model}`);

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
              const data: OpenAIStreamResponse = JSON.parse(jsonStr);
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
        `OpenAI provider health check failed: ${errorMessage}. Provider will be unavailable.`
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
        await this.httpClient.get<OpenAIModelsResponse>('/models');
      return response.data.data.map((model) => model.id);
    } catch (error) {
      this.logger.error(
        `Failed to list OpenAI models: ${error instanceof Error ? error.message : String(error)}`
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

    // Default model info for common OpenAI models
    // In a real app, this might be fetched from a database or config
    const defaultInfo: ModelInfo = {
      name: modelName,
      provider: this.name,
      contextWindow: 128000, // Default for GPT-4o/Turbo
      costPerInputToken: 0.005 / 1000,
      costPerOutputToken: 0.015 / 1000,
      latency: 1000,
      successRate: 0.99,
      isAvailable: true,
    };

    if (modelName.includes('gpt-3.5')) {
      defaultInfo.contextWindow = 16385;
      defaultInfo.costPerInputToken = 0.0005 / 1000;
      defaultInfo.costPerOutputToken = 0.0015 / 1000;
    } else if (modelName.includes('gpt-4o-mini')) {
      defaultInfo.contextWindow = 128000;
      defaultInfo.costPerInputToken = 0.00015 / 1000;
      defaultInfo.costPerOutputToken = 0.0006 / 1000;
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
