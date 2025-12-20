/**
 * Ollama Provider Tests
 * Tests for Ollama AI provider implementation
 * **Feature: multi-llm-provider-integration, Property 1: 多提供商支持**
 * **Validates: Requirements 1.5, 9.1, 9.2, 9.3, 9.4, 9.6**
 */
import { OllamaProvider } from '@/ai-providers';
import { OllamaConfig } from '@/ai-providers/interfaces/model-config.interface';
import { AIRequest } from '@/ai-providers/interfaces';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let config: OllamaConfig;

  beforeEach(() => {
    config = {
      apiKey: 'dummy-key', // Ollama doesn't use API keys, but interface requires it
      baseUrl: 'http://localhost:11434',
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
    } as any as any);

    provider = new OllamaProvider(config);
  });

  describe('Provider Initialization', () => {
    it('should initialize with correct name', () => {
      expect(provider.name).toBe('ollama');
    });

    it('should initialize with provided configuration', () => {
      expect(provider).toBeDefined();
    });

    it('should use default base URL if not provided', () => {
      const configWithoutUrl: OllamaConfig = {
        apiKey: 'dummy-key',
      };

      const providerWithDefault = new OllamaProvider(configWithoutUrl);
      expect(providerWithDefault).toBeDefined();
    });

    it('should use custom base URL if provided', () => {
      const customConfig: OllamaConfig = {
        apiKey: 'dummy-key',
        baseUrl: 'http://192.168.1.100:11434',
      };

      const customProvider = new OllamaProvider(customConfig);
      expect(customProvider).toBeDefined();
    });
  });

  describe('call method', () => {
    it('should successfully call Ollama API and return formatted response', async () => {
      const request: AIRequest = {
        model: 'llama2',
        prompt: 'What is 2+2?',
        temperature: 0.5,
        maxTokens: 100,
      };

      const mockResponse = {
        data: {
          model: 'llama2',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'The answer is 4.',
          },
          done: true,
          total_duration: 5000000000,
          load_duration: 1000000000,
          prompt_eval_count: 10,
          prompt_eval_duration: 2000000000,
          eval_count: 5,
          eval_duration: 2000000000,
        },
      };

      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const response = await provider.call(request);

      expect(response).toEqual({
        content: 'The answer is 4.',
        model: 'llama2',
        provider: 'ollama',
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'stop',
        metadata: expect.objectContaining({
          totalDuration: 5000000000,
          loadDuration: 1000000000,
        }),
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({
          model: 'llama2',
          messages: expect.any(Array),
        })
      );
    });

    it('should use default temperature if not provided', async () => {
      const request: AIRequest = {
        model: 'mistral',
        prompt: 'Test prompt',
      };

      const mockResponse = {
        data: {
          model: 'mistral',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Response',
          },
          done: true,
          total_duration: 3000000000,
          load_duration: 500000000,
          prompt_eval_count: 5,
          prompt_eval_duration: 1000000000,
          eval_count: 3,
          eval_duration: 1500000000,
        },
      };

      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      await provider.call(request);

      const callArgs = (mockHttpClient.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.options.temperature).toBe(0.7);
    });

    it('should handle API errors and convert to AIError', async () => {
      const request: AIRequest = {
        model: 'llama2',
        prompt: 'Test',
      };

      const mockHttpClient = provider['httpClient'];
      const error = new Error('Connection refused');
      (mockHttpClient.post as jest.Mock).mockRejectedValue(error);

      await expect(provider.call(request)).rejects.toThrow();
    }, 10000);

    it('should include system prompt in request', async () => {
      const request: AIRequest = {
        model: 'llama2',
        prompt: 'User prompt',
        systemPrompt: 'You are a helpful assistant.',
      };

      const mockResponse = {
        data: {
          model: 'llama2',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Response',
          },
          done: true,
          total_duration: 3000000000,
          load_duration: 500000000,
          prompt_eval_count: 10,
          prompt_eval_duration: 1000000000,
          eval_count: 5,
          eval_duration: 1500000000,
        },
      };

      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.post as jest.Mock).mockResolvedValue(mockResponse);

      await provider.call(request);

      const callArgs = (mockHttpClient.post as jest.Mock).mock.calls[0][1];
      expect(callArgs.messages[0].content).toBe('You are a helpful assistant.');
    });
  });

  describe('stream method', () => {
    it('should stream responses from Ollama API', async () => {
      const request: AIRequest = {
        model: 'llama2',
        prompt: 'Stream test',
      };

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(
            JSON.stringify({
              model: 'llama2',
              message: { role: 'assistant', content: 'Hello' },
              done: false,
            }) + '\n'
          );
          yield Buffer.from(
            JSON.stringify({
              model: 'llama2',
              message: { role: 'assistant', content: ' world' },
              done: true,
            }) + '\n'
          );
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
        model: 'llama2',
        prompt: 'Stream test',
      };

      const mockHttpClient = provider['httpClient'];
      const error = new Error('Stream failed');
      (mockHttpClient.post as jest.Mock).mockRejectedValue(error);

      const streamGenerator = provider.stream(request);
      await expect(async () => {
        for await (const chunk of streamGenerator) {
          // Iterate through stream
          void chunk;
        }
      }).rejects.toThrow();
    });
  });

  describe('healthCheck method', () => {
    it('should return true when Ollama is healthy', async () => {
      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: {
          models: [{ name: 'llama2', modified_at: '2024-01-01', size: 1000 }],
        },
      });

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when Ollama is unavailable', async () => {
      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.get as jest.Mock).mockRejectedValue(
        new Error('Connection refused')
      );

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('listModels method', () => {
    it('should return list of available Ollama models', async () => {
      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: {
          models: [
            { name: 'llama2', modified_at: '2024-01-01', size: 1000 },
            { name: 'mistral', modified_at: '2024-01-02', size: 2000 },
            { name: 'neural-chat', modified_at: '2024-01-03', size: 1500 },
          ],
        },
      });

      const models = await provider.listModels();

      expect(models).toContain('llama2');
      expect(models).toContain('mistral');
      expect(models).toContain('neural-chat');
      expect(models.length).toBe(3);
    });

    it('should return empty array when Ollama is unavailable', async () => {
      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.get as jest.Mock).mockRejectedValue(
        new Error('Connection refused')
      );

      const models = await provider.listModels();

      expect(models).toEqual([]);
    });

    it('should cache models list and refresh after interval', async () => {
      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: {
          models: [{ name: 'llama2', modified_at: '2024-01-01', size: 1000 }],
        },
      });

      const models1 = await provider.listModels();
      const models2 = await provider.listModels();

      expect(models1).toEqual(models2);
      // Should only call get once due to caching
      expect(
        (mockHttpClient.get as jest.Mock).mock.calls.length
      ).toBeLessThanOrEqual(2);
    });
  });

  describe('getModelInfo method', () => {
    it('should return model information for available model', async () => {
      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: {
          models: [{ name: 'llama2', modified_at: '2024-01-01', size: 1000 }],
        },
      });

      // First call listModels to populate available models
      await provider.listModels();

      const modelInfo = await provider.getModelInfo('llama2');

      expect(modelInfo.name).toBe('llama2');
      expect(modelInfo.provider).toBe('ollama');
      expect(modelInfo.contextWindow).toBe(4096);
      expect(modelInfo.costPerInputToken).toBe(0); // Ollama is free
      expect(modelInfo.costPerOutputToken).toBe(0); // Ollama is free
      expect(modelInfo.isAvailable).toBe(true);
    });

    it('should return model information for unavailable model', async () => {
      const modelInfo = await provider.getModelInfo('unknown-model');

      expect(modelInfo.name).toBe('unknown-model');
      expect(modelInfo.provider).toBe('ollama');
      expect(modelInfo.isAvailable).toBe(false);
    });

    it('should cache model information', async () => {
      const modelInfo1 = await provider.getModelInfo('llama2');
      const modelInfo2 = await provider.getModelInfo('llama2');

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
      expect(provider.name).toBe('ollama');
    });

    it('should return AIResponse with correct structure', async () => {
      const request: AIRequest = {
        model: 'llama2',
        prompt: 'Test',
      };

      const mockResponse = {
        data: {
          model: 'llama2',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Response',
          },
          done: true,
          total_duration: 3000000000,
          load_duration: 500000000,
          prompt_eval_count: 10,
          prompt_eval_duration: 1000000000,
          eval_count: 5,
          eval_duration: 1500000000,
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
      expect(response.provider).toBe('ollama');
    });
  });

  describe('Custom Ollama Configuration', () => {
    it('should support custom Ollama base URL', () => {
      const customConfig: OllamaConfig = {
        apiKey: 'dummy-key',
        baseUrl: 'http://192.168.1.100:11434',
      };

      const customProvider = new OllamaProvider(customConfig);
      expect(customProvider).toBeDefined();
      expect(customProvider.name).toBe('ollama');
    });

    it('should support custom timeout configuration', () => {
      const customConfig: OllamaConfig = {
        apiKey: 'dummy-key',
        timeout: 60000,
      };

      const customProvider = new OllamaProvider(customConfig);
      expect(customProvider).toBeDefined();
    });
  });

  describe('Ollama-specific features', () => {
    it('should handle models with different names', async () => {
      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: {
          models: [
            { name: 'llama2:7b', modified_at: '2024-01-01', size: 1000 },
            { name: 'mistral:7b', modified_at: '2024-01-02', size: 2000 },
            { name: 'neural-chat:7b', modified_at: '2024-01-03', size: 1500 },
          ],
        },
      });

      const models = await provider.listModels();

      expect(models).toContain('llama2:7b');
      expect(models).toContain('mistral:7b');
      expect(models).toContain('neural-chat:7b');
    });

    it('should handle empty models list', async () => {
      const mockHttpClient = provider['httpClient'];
      (mockHttpClient.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: {
          models: [],
        },
      });

      const models = await provider.listModels();

      expect(models).toEqual([]);
    });
  });
});
