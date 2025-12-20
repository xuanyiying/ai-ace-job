/**
 * Google Gemini AI Provider
 * Implements AIProvider interface for Google Gemini models
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
import { GeminiConfig } from '@/ai-providers/interfaces/model-config.interface';
import { AIHttpClient } from '@/ai-providers/utils/http-client';
import { toAIError } from '@/ai-providers/utils/ai-error';
import { RetryHandler } from '@/ai-providers/utils/retry-handler';

/**
 * Gemini API Request structure
 */
interface GeminiRequest {
  contents: {
    role: string;
    parts: { text: string }[];
  }[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
  };
  systemInstruction?: {
    parts: { text: string }[];
  };
}

/**
 * Gemini API Response structure
 */
interface GeminiAPIResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  }[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Gemini Models List Response
 */
interface GeminiModelsResponse {
  models: {
    name: string;
    version: string;
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
  }[];
}

/**
 * Gemini Provider Implementation
 */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly config: GeminiConfig;
  private readonly retryHandler: RetryHandler;
  private modelInfoCache: Map<string, ModelInfo> = new Map();

  constructor(config: GeminiConfig) {
    this.config = config;
    this.retryHandler = new RetryHandler();

    const httpClient = new AIHttpClient({
      baseURL:
        config.endpoint || 'https://generativelanguage.googleapis.com/v1beta',
      timeout: config.timeout || 30000,
      authentication: {
        type: 'custom',
        headerName: 'x-goog-api-key',
        headerValue: config.apiKey,
      },
      logger: this.logger,
      providerName: 'Gemini',
    });

    this.httpClient = httpClient.getInstance();
    this.logger.log('Gemini provider initialized');
  }

  /**
   * Call Gemini API
   */
  async call(request: AIRequest): Promise<AIResponse> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        const payload = this.buildRequestPayload(request);
        this.logger.debug(`Calling Gemini API with model: ${request.model}`);

        // Gemini uses model name in URL: models/{model}:generateContent
        const modelName = request.model.startsWith('models/')
          ? request.model
          : `models/${request.model}`;

        const response = await this.httpClient.post<GeminiAPIResponse>(
          `/${modelName}:generateContent`,
          payload
        );

        const data = response.data;
        const candidate = data.candidates?.[0];

        if (!candidate) {
          throw new Error('No candidates returned from Gemini API');
        }

        const content =
          candidate.content?.parts?.map((p) => p.text).join('') || '';

        return {
          content,
          model: request.model,
          provider: this.name,
          usage: {
            inputTokens: data.usageMetadata?.promptTokenCount || 0,
            outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0,
          },
          finishReason: candidate.finishReason,
        };
      } catch (error) {
        throw toAIError(error, this.name, request.model);
      }
    });
  }

  /**
   * Stream Gemini API response
   */
  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    try {
      const payload = this.buildRequestPayload(request);
      this.logger.debug(`Streaming Gemini API with model: ${request.model}`);

      const modelName = request.model.startsWith('models/')
        ? request.model
        : `models/${request.model}`;

      // Use streamGenerateContent?alt=sse for SSE streaming
      const response = await this.httpClient.post(
        `/${modelName}:streamGenerateContent?alt=sse`,
        payload,
        { responseType: 'stream' }
      );

      const stream = response.data;

      for await (const chunk of stream) {
        const lines = chunk.toString().split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.substring(6);
              const data: GeminiAPIResponse = JSON.parse(jsonStr);
              const candidate = data.candidates?.[0];

              if (candidate && candidate.content?.parts) {
                const content = candidate.content.parts
                  .map((p) => p.text)
                  .join('');
                if (content) {
                  yield {
                    content,
                    model: request.model,
                    provider: this.name,
                    finishReason: candidate.finishReason || undefined,
                  };
                }
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
      await this.httpClient.get('/models?pageSize=1');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Gemini provider health check failed: ${errorMessage}. Provider will be unavailable.`
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
        await this.httpClient.get<GeminiModelsResponse>('/models');
      return response.data.models
        .filter((m) => m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => m.name.replace('models/', ''));
    } catch (error) {
      this.logger.error(
        `Failed to list Gemini models: ${error instanceof Error ? error.message : String(error)}`
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

    // Default model info for Gemini models
    const defaultInfo: ModelInfo = {
      name: modelName,
      provider: this.name,
      contextWindow: 32000,
      costPerInputToken: 0, // Free tier available
      costPerOutputToken: 0,
      latency: 1000,
      successRate: 0.99,
      isAvailable: true,
    };

    if (modelName.includes('gemini-1.5-pro')) {
      defaultInfo.contextWindow = 1000000; // 1M context window
      defaultInfo.costPerInputToken = 0.0035 / 1000;
      defaultInfo.costPerOutputToken = 0.0105 / 1000;
    } else if (modelName.includes('gemini-1.5-flash')) {
      defaultInfo.contextWindow = 1000000;
      defaultInfo.costPerInputToken = 0.00035 / 1000;
      defaultInfo.costPerOutputToken = 0.00105 / 1000;
    }

    this.modelInfoCache.set(modelName, defaultInfo);
    return defaultInfo;
  }

  private buildRequestPayload(request: AIRequest): GeminiRequest {
    const contents = [
      {
        role: 'user',
        parts: [{ text: request.prompt }],
      },
    ];

    const payload: GeminiRequest = {
      contents,
      generationConfig: {
        temperature:
          request.temperature ?? this.config.defaultTemperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? this.config.defaultMaxTokens,
        topP: request.topP,
        topK: request.topK,
        stopSequences: request.stopSequences,
      },
    };

    if (request.systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: request.systemPrompt }],
      };
    }

    return payload;
  }
}
