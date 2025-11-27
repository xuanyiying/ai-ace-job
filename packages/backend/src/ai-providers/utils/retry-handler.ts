/**
 * Retry Handler
 * Implements retry logic with exponential backoff
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { Logger } from '@nestjs/common';
import {
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  isRetryableError,
} from './ai-error';

export class RetryHandler {
  private readonly logger = new Logger(RetryHandler.name);
  private readonly config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic
   * @param fn - Function to execute
   * @param errorHandler - Optional custom error handler
   * @returns Promise resolving to function result
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    errorHandler?: (error: Error, attempt: number) => boolean
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry
        const shouldRetry = errorHandler
          ? errorHandler(lastError, attempt)
          : this.shouldRetry(lastError, attempt);

        if (!shouldRetry || attempt >= this.config.maxRetries) {
          this.logger.error(
            `Operation failed after ${attempt + 1} attempts`,
            lastError
          );
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);

        this.logger.warn(
          `Attempt ${attempt + 1}/${this.config.maxRetries + 1} failed. Retrying in ${delay}ms...`,
          {
            error: lastError.message,
            attempt: attempt + 1,
            maxRetries: this.config.maxRetries + 1,
          }
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Unknown error during retry');
  }

  /**
   * Determine if an error should be retried
   */
  private shouldRetry(error: Error, attempt: number): boolean {
    // Don't retry if we've exhausted attempts
    if (attempt >= this.config.maxRetries) {
      return false;
    }

    // Check if error is retryable
    return isRetryableError(error);
  }

  /**
   * Calculate delay for next retry using exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay =
      this.config.initialDelayMs *
      Math.pow(this.config.backoffMultiplier, attempt);

    // Add jitter (random variation) to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay; // 0-30% jitter

    return Math.min(delay + jitter, this.config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}
