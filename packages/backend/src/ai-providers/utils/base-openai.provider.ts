import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ModelInfo,
} from '../interfaces';
import { toAIError } from '@/ai-providers/utils/ai-error';
import { RetryHandler } from '@/ai-providers/utils/retry-handler';

/**
 * Base OpenAI Provider Implementation
 * Provides a common implementation for all OpenAI-compatible providers using the official SDK
 */
export abstract class BaseOpenAIProvider implements AIProvider {
  abstract readonly name: string;
  protected readonly logger: Logger;
  protected readonly client: OpenAI;
  protected readonly retryHandler: RetryHandler;
  protected modelInfoCache: Map<string, ModelInfo> = new Map();

  constructor(
    providerName: string,
    config: {
      endpoint: string;
      apiKey: string;
      timeout?: number;
      organization?: string;
    }
  ) {
    this.logger = new Logger(providerName);
    this.retryHandler = new RetryHandler();

    this.client = new OpenAI({
      baseURL: config.endpoint,
      apiKey: config.apiKey,
      timeout: config.timeout || 120000, // Default to 120s instead of 30s
      organization: config.organization,
    });
  }

  /**
   * Call API
   */
  async call(request: AIRequest): Promise<AIResponse> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        const payload = this.buildRequestPayload(request);
        this.logger.debug(
          `Calling ${this.name} API with model: ${request.model}`
        );

        const response = await this.client.chat.completions.create({
          ...payload,
          stream: false,
        } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);

        const choice = response.choices[0];

        return {
          content: choice.message.content || '',
          model: response.model,
          provider: this.name,
          usage: {
            inputTokens: response.usage?.prompt_tokens || 0,
            outputTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
          finishReason: choice.finish_reason,
          metadata: {
            requestId: response.id,
          },
        };
      } catch (error) {
        throw toAIError(error, this.name, request.model);
      }
    });
  }

  /**
   * Stream API response
   */
  async *stream(request: AIRequest): AsyncIterable<AIStreamChunk> {
    try {
      const payload = this.buildRequestPayload(request);
      this.logger.debug(
        `Streaming ${this.name} API with model: ${request.model}`
      );

      const stream = await this.client.chat.completions.create({
        ...payload,
        stream: true,
      } as OpenAI.Chat.ChatCompletionCreateParamsStreaming);

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (choice?.delta?.content) {
          yield {
            content: choice.delta.content,
            model: chunk.model,
            provider: this.name,
            finishReason: (choice.finish_reason as string) || undefined,
          };
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
      await this.client.models.list();
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `${this.name} provider health check failed: ${errorMessage}. Provider will be unavailable.`
      );
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map((model) => model.id);
    } catch (error) {
      this.logger.error(
        `Failed to list ${this.name} models: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
    }
  }

  /**
   * Generate embedding for text
   */
  async embed(text: string, model?: string): Promise<number[]> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        const response = await this.client.embeddings.create({
          model: model || 'text-embedding-3-small',
          input: text,
        });

        return response.data[0].embedding;
      } catch (error) {
        throw toAIError(error, this.name, model || 'unknown');
      }
    });
  }

  /**
   * Get model info
   */
  abstract getModelInfo(modelName: string): Promise<ModelInfo>;

  /**
   * Build request payload
   */
  protected buildRequestPayload(request: AIRequest): Record<string, any> {
    const messages: any[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    if (request.messages && request.messages.length > 0) {
      messages.push(...request.messages);
    } else {
      messages.push({ role: 'user', content: request.prompt });
    }

    const metadata = (request.metadata as Record<string, any>) || {};

    // Filter out internal metadata that shouldn't be sent to the AI provider
    const { templateName, templateVariables, ...providerMetadata } = metadata;

    // Handle response_format if present in metadata
    let response_format = providerMetadata.response_format;

    // If response_format is 'json_object', we need to make sure the provider supports it
    // Most modern OpenAI-compatible APIs support it, but some might require specific instructions in the prompt.
    // The instructions are already in our templates.

    const payload: Record<string, any> = {
      model: request.model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4096,
      top_p: request.topP ?? 1,
      stop: request.stopSequences ?? null,
      ...providerMetadata,
    };

    if (response_format) {
      payload.response_format = response_format;
    }

    return payload;
  }
}
