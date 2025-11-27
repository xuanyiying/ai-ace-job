/**
 * AI Error Handling
 * Defines error types and error handling utilities
 * Requirements: 2.6, 6.1, 6.2, 6.3, 6.4
 */

/**
 * AI Error Codes
 * Standardized error codes for AI operations
 */
export enum AIErrorCode {
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  INSUFFICIENT_QUOTA = 'INSUFFICIENT_QUOTA',
  CONTENT_FILTER = 'CONTENT_FILTER',
}

/**
 * AI Error Class
 * Custom error class for AI operations
 */
export class AIError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string,
    public readonly originalError?: Error,
    public readonly retryable: boolean = true,
    public readonly provider?: string,
    public readonly model?: string
  ) {
    super(message);
    this.name = 'AIError';
    Object.setPrototypeOf(this, AIError.prototype);
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    return this.retryable;
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      provider: this.provider,
      model: this.model,
      originalError: this.originalError?.message,
    };
  }
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Determine if an error is retryable based on error code
 */
export function isRetryableError(error: AIError | Error): boolean {
  if (error instanceof AIError) {
    return error.isRetryable();
  }

  // For non-AIError errors, check the message
  const message = error.message.toLowerCase();
  const retryablePatterns = [
    'timeout',
    'network',
    'econnrefused',
    'enotfound',
    'rate limit',
    'too many requests',
    'service unavailable',
    '503',
    '429',
  ];

  return retryablePatterns.some((pattern) => message.includes(pattern));
}

/**
 * Convert generic errors to AIError
 */
export function toAIError(
  error: Error | unknown,
  provider?: string,
  model?: string
): AIError {
  if (error instanceof AIError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();
  const originalError = error instanceof Error ? error : undefined;

  // Determine error code based on message
  let code: AIErrorCode = AIErrorCode.UNKNOWN_ERROR;
  let retryable = true;

  if (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('429') ||
    lowerMessage.includes('too many requests')
  ) {
    code = AIErrorCode.RATE_LIMIT_EXCEEDED;
    retryable = true;
  } else if (
    lowerMessage.includes('auth') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('401') ||
    lowerMessage.includes('403') ||
    lowerMessage.includes('api key')
  ) {
    code = AIErrorCode.AUTHENTICATION_FAILED;
    retryable = false;
  } else if (
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('timed out')
  ) {
    code = AIErrorCode.TIMEOUT;
    retryable = true;
  } else if (
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('bad request') ||
    lowerMessage.includes('400')
  ) {
    code = AIErrorCode.INVALID_REQUEST;
    retryable = false;
  } else if (
    lowerMessage.includes('unavailable') ||
    lowerMessage.includes('503') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('504')
  ) {
    code = AIErrorCode.PROVIDER_UNAVAILABLE;
    retryable = true;
  } else if (
    lowerMessage.includes('model not found') ||
    lowerMessage.includes('404')
  ) {
    code = AIErrorCode.MODEL_NOT_FOUND;
    retryable = false;
  } else if (
    lowerMessage.includes('quota') ||
    lowerMessage.includes('insufficient')
  ) {
    code = AIErrorCode.INSUFFICIENT_QUOTA;
    retryable = false;
  } else if (lowerMessage.includes('content filter')) {
    code = AIErrorCode.CONTENT_FILTER;
    retryable = false;
  }

  return new AIError(code, message, originalError, retryable, provider, model);
}
