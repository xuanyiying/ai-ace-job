/**
 * Qwen Provider Tests
 * Tests for Qwen AI provider implementation
 * **Feature: multi-llm-provider-integration, Property 1: 多提供商支持**
 * **Validates: Requirements 1.1, 2.2, 2.3, 2.4, 2.5, 2.6**
 */

import { QwenProvider } from './qwen.provider';
import { QwenConfig } from '../interfaces/model-config.interface';
import { AIRequest } from '../interfaces';
import { AIError } from '../utils/ai-error';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('QwenProvider', () => {
  let provider: QwenProvider;
  let config: QwenConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      endpoint: 'https://dashscope.aliyuncs.com/api/v1',
      defaultTemperature: 0.7,
      defaultMaxTokens: 2000,
      timeout: 30000,
    };

    // Reset mocks
    jest.clearAllMocks();

    // Mock axios.create to return a mock instance
    mockedAxios.create.mockReturnValue({
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    } as any);

    provider = new QwenProvider(config);
  });

  describe('Provider Initialization', () => {
    it('should initialize with correct name', () => {
      expect(provider.name).toBe('qwen');
    });

    it('should initialize with provided configuration', () => {
      expect(provider).toBeDefined();
    });
  });

  describe('call method', () => {
    it('should successfully call Qwen API and return formatted response', async () => {
      const request: AIRequest = {
        model: 'qwen-max',
        prompt: 'What is 2+2?',
        temperature: 0.5,
        maxTokens: 100,
      };

      const mockResponse = {
        data: {
          output: {
            text: 'The answer is 4.',
            finish_reason: 'stop',
          },
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
          request_id: 'req-123',
        },
      };

      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const response = await provider.call(request);

      expect(response).toEqual({
        content: 'The answer is 4.',
        model: 'qwen-max',
        provider: 'qwen',
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'stop',
        metadata: {
          requestId: 'req-123',
        },
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/services/aigc/text-generation/generation',
        expect.objectContaining({
          model: 'qwen-max',
          input: expect.objectContaining({
            messages: expect.any(Array),
          }),
        })
      );
    });

    it('should use default temperature if not provided', async () => {
      const request: AIRequest = {
        model: 'qwen-plus',
        prompt: 'Test prompt',
      };

      const mockResponse = {
        data: {
          output: {
            text: 'Response',
            finish_reason: 'stop',
          },
          usage: {
            input_tokens: 5,
            output_tokens: 3,
          },
          request_id: 'req-456',
        },
      };

      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      await provider.call(request);

      const callArgs = (mockHttpClient.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.parameters.temperature).toBe(0.7);
    });

    it('should handle API errors and convert to AIError', async () => {
      const request: AIRequest = {
        model: 'qwen-max',
        prompt: 'Test',
      };

      const mockHttpClient = provider['httpClient'];
      const error = new Error('401 Unauthorized');
      (mockHttpClient.post as jest.Mock).mockRejectedValue(error);

      await expect(provider.call(request)).rejects.toThrow();
    }, 10000);

    it('should include system prompt in request', async () => {
      const request: AIRequest = {
        model: 'qwen-max',
        prompt: 'User prompt',
        systemPrompt: 'You are a helpful assistant.',
      };

      const mockResponse = {
        data: {
          output: {
            text: 'Response',
            finish_reason: 'stop',
          },
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
          request_id: 'req-789',
        },
      };

      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      await provider.call(request);

      const callArgs = (mockHttpClient.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.input.messages[0].content).toBe(
        'You are a helpful assistant.'
      );
    });
  });

  describe('stream method', () => {
    it('should stream responses from Qwen API', async () => {
      const request: AIRequest = {
        model: 'qwen-max',
        prompt: 'Stream test',
      };

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('data: {"output":{"text":"Hello"}}\n');
          yield Buffer.from('data: {"output":{"text":" world"}}\n');
        },
      };

      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.post as jest.Mock).mockResolvedValue({
        data: mockStream,
      });

      const chunks: string[] = [];
      for await (const chunk of provider.stream(request)) {
        chunks.push(chunk.content);
      }

      expect(chunks).toContain('Hello');
      expect(chunks).toContain(' world');
    });

    it('should handle streaming errors', async () => {
      const request: AIRequest = {
        model: 'qwen-max',
        prompt: 'Stream test',
      };

      const mockHttpClient = provider['httpClient'];
      const error = new Error('Stream failed');
      (mockHttpClient.post as jest.Mock).mockRejectedValue(error);

      const streamGenerator = provider.stream(request);
      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of streamGenerator) {
          // Iterate through stream
        }
      }).rejects.toThrow();
    });
  });

  describe('healthCheck method', () => {
    it('should return true when provider is healthy', async () => {
      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.post as jest.Mock).mockResolvedValue({
        data: {
          output: {
            text: 'OK',
            finish_reason: 'stop',
          },
          usage: {
            input_tokens: 1,
            output_tokens: 1,
          },
          request_id: 'health-check',
        },
      });

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when provider is unhealthy', async () => {
      // Mock listModels to return empty array to simulate unhealthy state
      jest.spyOn(provider, 'listModels').mockResolvedValue([]);

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('listModels method', () => {
    it('should return list of available Qwen models', async () => {
      const models = await provider.listModels();

      expect(models).toContain('qwen-max');
      expect(models).toContain('qwen-plus');
      expect(models).toContain('qwen-turbo');
      expect(models).toContain('qwen-long');
      expect(models.length).toBe(4);
    });
  });

  describe('getModelInfo method', () => {
    it('should return model information for qwen-max', async () => {
      const modelInfo = await provider.getModelInfo('qwen-max');

      expect(modelInfo.name).toBe('qwen-max');
      expect(modelInfo.provider).toBe('qwen');
      expect(modelInfo.contextWindow).toBe(8000);
      expect(modelInfo.costPerInputToken).toBeGreaterThan(0);
      expect(modelInfo.costPerOutputToken).toBeGreaterThan(0);
      expect(modelInfo.isAvailable).toBe(true);
    });

    it('should return model information for qwen-plus', async () => {
      const modelInfo = await provider.getModelInfo('qwen-plus');

      expect(modelInfo.name).toBe('qwen-plus');
      expect(modelInfo.provider).toBe('qwen');
      expect(modelInfo.contextWindow).toBe(4000);
      expect(modelInfo.isAvailable).toBe(true);
    });

    it('should return model information for qwen-turbo', async () => {
      const modelInfo = await provider.getModelInfo('qwen-turbo');

      expect(modelInfo.name).toBe('qwen-turbo');
      expect(modelInfo.provider).toBe('qwen');
      expect(modelInfo.contextWindow).toBe(4000);
      expect(modelInfo.isAvailable).toBe(true);
    });

    it('should return model information for qwen-long', async () => {
      const modelInfo = await provider.getModelInfo('qwen-long');

      expect(modelInfo.name).toBe('qwen-long');
      expect(modelInfo.provider).toBe('qwen');
      expect(modelInfo.contextWindow).toBe(30000);
      expect(modelInfo.isAvailable).toBe(true);
    });

    it('should throw error for unknown model', async () => {
      await expect(provider.getModelInfo('unknown-model')).rejects.toThrow(
        AIError
      );
    });

    it('should cache model information', async () => {
      const modelInfo1 = await provider.getModelInfo('qwen-max');
      const modelInfo2 = await provider.getModelInfo('qwen-max');

      expect(modelInfo1).toEqual(modelInfo2);
    });
  });

  describe('Property 1: Multi-provider support', () => {
    it('should implement all required AIProvider interface methods', () => {
      expect(typeof provider.call).toBe('function');
      expect(typeof provider.stream).toBe('function');
      expect(typeof provider.healthCheck).toBe('function');
      expect(typeof provider.listModels).toBe('function');
      expect(typeof provider.getModelInfo).toBe('function');
    });

    it('should have correct provider name', () => {
      expect(provider.name).toBe('qwen');
    });

    it('should return AIResponse with correct structure', async () => {
      const request: AIRequest = {
        model: 'qwen-max',
        prompt: 'Test',
      };

      const mockResponse = {
        data: {
          output: {
            text: 'Response',
            finish_reason: 'stop',
          },
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
          request_id: 'req-123',
        },
      };

      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const response = await provider.call(request);

      expect(response).toHaveProperty('content');
      expect(response).toHaveProperty('model');
      expect(response).toHaveProperty('provider');
      expect(response).toHaveProperty('usage');
      expect(response).toHaveProperty('finishReason');
      expect(response.provider).toBe('qwen');
    });
  });
});
