import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Error Logger Service
 * Provides structured error logging with context and stack traces
 * Requirement 12.5: Error logging with structured information
 */
@Injectable()
export class ErrorLoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  /**
   * Log an error with full context
   */
  logError(
    error: Error | string,
    context: string,
    additionalData?: Record<string, any>
  ): void {
    const errorData = {
      timestamp: new Date().toISOString(),
      context,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      ...additionalData,
    };

    this.logger.error('Application error occurred', errorData);
  }

  /**
   * Log a warning with context
   */
  logWarning(
    message: string,
    context: string,
    additionalData?: Record<string, any>
  ): void {
    const warningData = {
      timestamp: new Date().toISOString(),
      context,
      message,
      ...additionalData,
    };

    this.logger.warn('Warning logged', warningData);
  }

  /**
   * Log an info message with context
   */
  logInfo(
    message: string,
    context: string,
    additionalData?: Record<string, any>
  ): void {
    const infoData = {
      timestamp: new Date().toISOString(),
      context,
      message,
      ...additionalData,
    };

    this.logger.info('Info logged', infoData);
  }

  /**
   * Log a debug message with context
   */
  logDebug(
    message: string,
    context: string,
    additionalData?: Record<string, any>
  ): void {
    const debugData = {
      timestamp: new Date().toISOString(),
      context,
      message,
      ...additionalData,
    };

    this.logger.debug('Debug logged', debugData);
  }

  /**
   * Log an API error with request context
   */
  logApiError(
    error: Error | string,
    context: string,
    requestId: string,
    userId?: string,
    additionalData?: Record<string, any>
  ): void {
    const errorData = {
      timestamp: new Date().toISOString(),
      context,
      requestId,
      userId: userId || 'anonymous',
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      ...additionalData,
    };

    this.logger.error('API error occurred', errorData);
  }

  /**
   * Log a database error with query context
   */
  logDatabaseError(
    error: Error | string,
    query?: string,
    params?: any[]
  ): void {
    const errorData = {
      timestamp: new Date().toISOString(),
      context: 'Database',
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      query,
      params,
    };

    this.logger.error('Database error occurred', errorData);
  }

  /**
   * Log an external service error
   */
  logExternalServiceError(
    service: string,
    error: Error | string,
    endpoint?: string,
    statusCode?: number
  ): void {
    const errorData = {
      timestamp: new Date().toISOString(),
      context: `External Service: ${service}`,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      endpoint,
      statusCode,
    };

    this.logger.error('External service error occurred', errorData);
  }
}
