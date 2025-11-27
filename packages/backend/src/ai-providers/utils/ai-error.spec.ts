/**
 * AI Error Tests
 * Tests for error handling and error conversion utilities
 * Validates: Requirements 2.6, 6.4, 6.5
 */

import { AIError, AIErrorCode, isRetryableError, toAIError } from './ai-error';

describe('AIError', () => {
  describe('constructor', () => {
    it('should create an AIError with all properties', () => {
      const originalError = new Error('Original error');
      const error = new AIError(
        AIErrorCode.PROVIDER_UNAVAILABLE,
        'Provider is unavailable',
        originalError,
        true,
        'openai',
        'gpt-4'
      );

      expect(error.code).toBe(AIErrorCode.PROVIDER_UNAVAILABLE);
      expect(error.message).toBe('Provider is unavailable');
      expect(error.originalError).toBe(originalError);
      expect(error.retryable).toBe(true);
      expect(error.provider).toBe('openai');
      expect(error.model).toBe('gpt-4');
      expect(error.name).toBe('AIError');
    });

    it('should have default retryable value of true', () => {
      const error = new AIError(AIErrorCode.TIMEOUT, 'Request timed out');

      expect(error.retryable).toBe(true);
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable errors', () => {
      const error = new AIError(
        AIErrorCode.TIMEOUT,
        'Request timed out',
        undefined,
        true
      );

      expect(error.isRetryable()).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = new AIError(
        AIErrorCode.AUTHENTICATION_FAILED,
        'Invalid API key',
        undefined,
        false
      );

      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should convert error to JSON representation', () => {
      const originalError = new Error('Original error');
      const error = new AIError(
        AIErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
        originalError,
        true,
        'qwen',
        'qwen-max'
      );

      const json = error.toJSON();

      expect(json.name).toBe('AIError');
      expect(json.code).toBe(AIErrorCode.RATE_LIMIT_EXCEEDED);
      expect(json.message).toBe('Rate limit exceeded');
      expect(json.retryable).toBe(true);
      expect(json.provider).toBe('qwen');
      expect(json.model).toBe('qwen-max');
      expect(json.originalError).toBe('Original error');
    });
  });
});

describe('isRetryableError', () => {
  describe('with AIError instances', () => {
    it('should return true for retryable AIError', () => {
      const error = new AIError(
        AIErrorCode.TIMEOUT,
        'Timeout',
        undefined,
        true
      );

      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable AIError', () => {
      const error = new AIError(
        AIErrorCode.AUTHENTICATION_FAILED,
        'Auth failed',
        undefined,
        false
      );

      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('with generic Error instances', () => {
    it('should return true for timeout errors', () => {
      const error = new Error('Request timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for network errors', () => {
      const error = new Error('Network error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for ECONNREFUSED errors', () => {
      const error = new Error('ECONNREFUSED');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for ENOTFOUND errors', () => {
      const error = new Error('ENOTFOUND');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 429 errors', () => {
      const error = new Error('429 Too Many Requests');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for 503 errors', () => {
      const error = new Error('503 Service Unavailable');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for authentication errors', () => {
      const error = new Error('401 Unauthorized');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return false for invalid request errors', () => {
      const error = new Error('400 Bad Request');
      expect(isRetryableError(error)).toBe(false);
    });
  });
});

describe('toAIError', () => {
  describe('with AIError instances', () => {
    it('should return the same AIError', () => {
      const originalError = new AIError(AIErrorCode.TIMEOUT, 'Timeout');

      const result = toAIError(originalError);

      expect(result).toBe(originalError);
    });
  });

  describe('with generic Error instances', () => {
    it('should convert rate limit error', () => {
      const error = new Error('429 Too Many Requests');
      const result = toAIError(error, 'openai', 'gpt-4');

      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe(AIErrorCode.RATE_LIMIT_EXCEEDED);
      expect(result.retryable).toBe(true);
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
    });

    it('should convert authentication error', () => {
      const error = new Error('401 Unauthorized - Invalid API key');
      const result = toAIError(error, 'qwen', 'qwen-max');

      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe(AIErrorCode.AUTHENTICATION_FAILED);
      expect(result.retryable).toBe(false);
    });

    it('should convert timeout error', () => {
      const error = new Error('Request timed out');
      const result = toAIError(error);

      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe(AIErrorCode.TIMEOUT);
      expect(result.retryable).toBe(true);
    });

    it('should convert invalid request error', () => {
      const error = new Error('400 Bad Request - Invalid parameters');
      const result = toAIError(error);

      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe(AIErrorCode.INVALID_REQUEST);
      expect(result.retryable).toBe(false);
    });

    it('should convert provider unavailable error', () => {
      const error = new Error('503 Service Unavailable');
      const result = toAIError(error);

      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe(AIErrorCode.PROVIDER_UNAVAILABLE);
      expect(result.retryable).toBe(true);
    });

    it('should convert model not found error', () => {
      const error = new Error('404 Model not found');
      const result = toAIError(error);

      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe(AIErrorCode.MODEL_NOT_FOUND);
      expect(result.retryable).toBe(false);
    });

    it('should convert insufficient quota error', () => {
      const error = new Error('Insufficient quota');
      const result = toAIError(error);

      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe(AIErrorCode.INSUFFICIENT_QUOTA);
      expect(result.retryable).toBe(false);
    });

    it('should convert content filter error', () => {
      const error = new Error('Content filter triggered');
      const result = toAIError(error);

      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe(AIErrorCode.CONTENT_FILTER);
      expect(result.retryable).toBe(false);
    });

    it('should convert unknown error', () => {
      const error = new Error('Some unknown error');
      const result = toAIError(error);

      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe(AIErrorCode.UNKNOWN_ERROR);
    });

    it('should handle case-insensitive error messages', () => {
      const error = new Error('TIMEOUT');
      const result = toAIError(error);

      expect(result.code).toBe(AIErrorCode.TIMEOUT);
    });
  });

  describe('with non-Error values', () => {
    it('should convert string to AIError', () => {
      const result = toAIError('Some error message');

      expect(result).toBeInstanceOf(AIError);
      expect(result.message).toBe('Some error message');
      expect(result.code).toBe(AIErrorCode.UNKNOWN_ERROR);
    });

    it('should convert object to AIError', () => {
      const result = toAIError({ error: 'Something went wrong' });

      expect(result).toBeInstanceOf(AIError);
      expect(result.code).toBe(AIErrorCode.UNKNOWN_ERROR);
    });
  });

  describe('error code detection', () => {
    it('should detect rate limit from "rate limit" text', () => {
      const error = new Error('Rate limit exceeded');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.RATE_LIMIT_EXCEEDED);
    });

    it('should detect rate limit from "too many requests" text', () => {
      const error = new Error('Too many requests');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.RATE_LIMIT_EXCEEDED);
    });

    it('should detect authentication from "auth" text', () => {
      const error = new Error('Authentication failed');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.AUTHENTICATION_FAILED);
    });

    it('should detect authentication from "unauthorized" text', () => {
      const error = new Error('Unauthorized access');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.AUTHENTICATION_FAILED);
    });

    it('should detect authentication from "api key" text', () => {
      const error = new Error('Invalid API key');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.AUTHENTICATION_FAILED);
    });

    it('should detect timeout from "timeout" text', () => {
      const error = new Error('Connection timeout');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.TIMEOUT);
    });

    it('should detect timeout from "timed out" text', () => {
      const error = new Error('Request timed out');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.TIMEOUT);
    });

    it('should detect invalid request from "invalid" text', () => {
      const error = new Error('Invalid request');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.INVALID_REQUEST);
    });

    it('should detect invalid request from "bad request" text', () => {
      const error = new Error('Bad request');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.INVALID_REQUEST);
    });

    it('should detect unavailable from "unavailable" text', () => {
      const error = new Error('Service unavailable');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.PROVIDER_UNAVAILABLE);
    });

    it('should detect unavailable from "502" text', () => {
      const error = new Error('502 Bad Gateway');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.PROVIDER_UNAVAILABLE);
    });

    it('should detect unavailable from "504" text', () => {
      const error = new Error('504 Gateway');
      const result = toAIError(error);
      expect(result.code).toBe(AIErrorCode.PROVIDER_UNAVAILABLE);
    });
  });
});
