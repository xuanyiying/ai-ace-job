/**
 * Retry Handler Tests
 * Tests for retry logic with exponential backoff
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { RetryHandler } from './retry-handler';
import { AIError, AIErrorCode } from './ai-error';

describe('RetryHandler', () => {
  describe('constructor', () => {
    it('should use default configuration', () => {
      const handler = new RetryHandler();
      const config = handler.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.initialDelayMs).toBe(1000);
      expect(config.maxDelayMs).toBe(10000);
      expect(config.backoffMultiplier).toBe(2);
    });

    it('should accept custom configuration', () => {
      const handler = new RetryHandler({
        maxRetries: 5,
        initialDelayMs: 500,
        maxDelayMs: 5000,
        backoffMultiplier: 1.5,
      });

      const config = handler.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.initialDelayMs).toBe(500);
      expect(config.maxDelayMs).toBe(5000);
      expect(config.backoffMultiplier).toBe(1.5);
    });

    it('should merge partial configuration with defaults', () => {
      const handler = new RetryHandler({
        maxRetries: 2,
      });

      const config = handler.getConfig();

      expect(config.maxRetries).toBe(2);
      expect(config.initialDelayMs).toBe(1000); // default
      expect(config.maxDelayMs).toBe(10000); // default
      expect(config.backoffMultiplier).toBe(2); // default
    });
  });

  describe('executeWithRetry', () => {
    it('should execute function successfully on first attempt', async () => {
      const handler = new RetryHandler();
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      const handler = new RetryHandler();
      const error = new AIError(
        AIErrorCode.AUTHENTICATION_FAILED,
        'Invalid API key',
        undefined,
        false
      );
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(handler.executeWithRetry(mockFn)).rejects.toThrow(error);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry up to maxRetries times', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const mockFn = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(handler.executeWithRetry(mockFn)).rejects.toThrow();

      expect(mockFn).toHaveBeenCalledTimes(4); // initial + 3 retries
    });

    it('should throw error after exhausting retries', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const error = new Error('timeout');
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(handler.executeWithRetry(mockFn)).rejects.toThrow(error);

      expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should use custom error handler', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValueOnce('success');

      const errorHandler = jest.fn().mockReturnValue(true); // always retry

      const result = await handler.executeWithRetry(mockFn, errorHandler);

      expect(result).toBe('success');
      expect(errorHandler).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should stop retrying when custom error handler returns false', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const error = new Error('error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const errorHandler = jest.fn().mockReturnValue(false); // never retry

      await expect(
        handler.executeWithRetry(mockFn, errorHandler)
      ).rejects.toThrow(error);

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle AIError with retryable flag', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const retryableError = new AIError(
        AIErrorCode.TIMEOUT,
        'Timeout',
        undefined,
        true
      );

      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limit errors', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle service unavailable errors', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('exponential backoff', () => {
    it('should retry with increasing delays', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });

      const startTime = Date.now();
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(mockFn);

      const elapsed = Date.now() - startTime;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
      // Should have delays: ~10ms + ~20ms = ~30ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(20);
    });

    it('should respect maxDelayMs cap', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 100, // Very low cap
        backoffMultiplier: 2,
      });

      const startTime = Date.now();
      const mockFn = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(handler.executeWithRetry(mockFn)).rejects.toThrow();

      const elapsed = Date.now() - startTime;

      // With maxDelayMs of 100, total delay should be roughly 100 * 3 = 300ms
      // Allow some variance
      expect(elapsed).toBeLessThan(2000);
    });

    it('should add jitter to delays', async () => {
      const handler = new RetryHandler({
        maxRetries: 1,
        initialDelayMs: 50,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
      });

      const delays: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        const mockFn = jest
          .fn()
          .mockRejectedValueOnce(new Error('timeout'))
          .mockResolvedValueOnce('success');

        await handler.executeWithRetry(mockFn);

        const elapsed = Date.now() - startTime;
        delays.push(elapsed);
      }

      // With jitter, delays should vary
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of configuration', () => {
      const handler = new RetryHandler({
        maxRetries: 5,
      });

      const config1 = handler.getConfig();
      const config2 = handler.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });

  describe('error handling strategies', () => {
    it('should not retry authentication errors', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const error = new AIError(
        AIErrorCode.AUTHENTICATION_FAILED,
        'Invalid API key',
        undefined,
        false
      );
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(handler.executeWithRetry(mockFn)).rejects.toThrow(error);

      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry invalid request errors', async () => {
      const handler = new RetryHandler({
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const error = new AIError(
        AIErrorCode.INVALID_REQUEST,
        'Invalid parameters',
        undefined,
        false
      );
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(handler.executeWithRetry(mockFn)).rejects.toThrow(error);

      expect(mockFn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should retry timeout errors', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const error = new AIError(
        AIErrorCode.TIMEOUT,
        'Request timeout',
        undefined,
        true
      );
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should retry rate limit errors', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const error = new AIError(
        AIErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
        undefined,
        true
      );
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should retry provider unavailable errors', async () => {
      const handler = new RetryHandler({
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const error = new AIError(
        AIErrorCode.PROVIDER_UNAVAILABLE,
        'Service unavailable',
        undefined,
        true
      );
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('edge cases', () => {
    it('should handle zero maxRetries', async () => {
      const handler = new RetryHandler({
        maxRetries: 0,
        initialDelayMs: 10,
        maxDelayMs: 100,
      });

      const mockFn = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(handler.executeWithRetry(mockFn)).rejects.toThrow();

      expect(mockFn).toHaveBeenCalledTimes(1); // Only initial attempt
    });

    it('should handle very large maxRetries', async () => {
      const handler = new RetryHandler({
        maxRetries: 100,
        initialDelayMs: 1,
        maxDelayMs: 10,
      });

      let callCount = 0;
      const mockFn = jest.fn(async () => {
        callCount++;
        if (callCount < 5) {
          throw new Error('timeout');
        }
        return 'success';
      });

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('success');
      expect(callCount).toBe(5);
    });

    it('should handle function that returns falsy values', async () => {
      const handler = new RetryHandler();

      const mockFn = jest.fn().mockResolvedValue(null);

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBeNull();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle function that returns undefined', async () => {
      const handler = new RetryHandler();

      const mockFn = jest.fn().mockResolvedValue(undefined);

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBeUndefined();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle function that returns 0', async () => {
      const handler = new RetryHandler();

      const mockFn = jest.fn().mockResolvedValue(0);

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe(0);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle function that returns empty string', async () => {
      const handler = new RetryHandler();

      const mockFn = jest.fn().mockResolvedValue('');

      const result = await handler.executeWithRetry(mockFn);

      expect(result).toBe('');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
