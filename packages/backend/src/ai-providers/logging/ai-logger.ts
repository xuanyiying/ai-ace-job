import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * AI Logger Service
 * Provides comprehensive logging for AI provider operations
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 * Properties: 58, 59, 60, 61, 62, 63
 */

export interface AICallLog {
  id?: string;
  model: string;
  provider: string;
  scenario?: string;
  requestContent?: string;
  responseContent?: string;
  inputTokens?: number;
  outputTokens?: number;
  latency: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  stackTrace?: string;
  userId?: string;
  timestamp?: Date;
}

export interface AIRetryLog {
  id?: string;
  model: string;
  provider: string;
  attempt: number;
  maxAttempts: number;
  errorCode?: string;
  errorMessage?: string;
  timestamp?: Date;
}

export interface AIDegradationLog {
  id?: string;
  model: string;
  provider: string;
  reason: string;
  fallbackModel?: string;
  fallbackProvider?: string;
  timestamp?: Date;
}

export interface AILogQuery {
  model?: string;
  provider?: string;
  scenario?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AILogger {
  private readonly LOG_RETENTION_DAYS = 30;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Log a successful AI call
   * Requirement 11.3: Record all AI calls with request parameters, response content, and latency
   */
  async logAICall(log: AICallLog): Promise<void> {
    const sanitizedLog = this.sanitizeSensitiveData(log);

    // Log to Winston
    if (log.success) {
      this.logger.info('AI call successful', {
        model: log.model,
        provider: log.provider,
        scenario: log.scenario,
        latency: log.latency,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        timestamp: log.timestamp || new Date(),
      });
    } else {
      this.logger.error('AI call failed', {
        model: log.model,
        provider: log.provider,
        scenario: log.scenario,
        errorCode: log.errorCode,
        errorMessage: log.errorMessage,
        latency: log.latency,
        timestamp: log.timestamp || new Date(),
      });
    }

    // Store in database for querying
    try {
      await this.prisma.aICallLog.create({
        data: {
          model: log.model,
          provider: log.provider,
          scenario: log.scenario,
          requestContent: sanitizedLog.requestContent,
          responseContent: sanitizedLog.responseContent,
          inputTokens: log.inputTokens,
          outputTokens: log.outputTokens,
          latency: log.latency,
          success: log.success,
          errorCode: log.errorCode,
          errorMessage: log.errorMessage,
          stackTrace: log.stackTrace,
          userId: log.userId,
          timestamp: log.timestamp || new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to store AI call log', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Log an error with detailed information
   * Requirement 11.1: Record detailed error information including error code, message, and stack trace
   * Requirement 11.2: Define specific error codes for different error types
   */
  async logError(
    model: string,
    provider: string,
    errorCode: string,
    errorMessage: string,
    stackTrace?: string,
    scenario?: string,
    userId?: string
  ): Promise<void> {
    const errorLog = {
      model,
      provider,
      scenario,
      errorCode,
      errorMessage,
      stackTrace,
      userId,
      latency: 0,
      success: false,
      timestamp: new Date(),
    };

    await this.logAICall(errorLog);
  }

  /**
   * Log a retry event
   * Requirement 6.5: Record all retry and degradation events to logs
   */
  async logRetry(log: AIRetryLog): Promise<void> {
    this.logger.warn('AI call retry', {
      model: log.model,
      provider: log.provider,
      attempt: log.attempt,
      maxAttempts: log.maxAttempts,
      errorCode: log.errorCode,
      errorMessage: log.errorMessage,
      timestamp: log.timestamp || new Date(),
    });

    try {
      await this.prisma.aIRetryLog.create({
        data: {
          model: log.model,
          provider: log.provider,
          attempt: log.attempt,
          maxAttempts: log.maxAttempts,
          errorCode: log.errorCode,
          errorMessage: log.errorMessage,
          timestamp: log.timestamp || new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to store retry log', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Log a degradation event
   * Requirement 6.5: Record all retry and degradation events to logs
   * Requirement 6.6: Mark degradation status in response
   */
  async logDegradation(log: AIDegradationLog): Promise<void> {
    this.logger.warn('AI call degradation', {
      model: log.model,
      provider: log.provider,
      reason: log.reason,
      fallbackModel: log.fallbackModel,
      fallbackProvider: log.fallbackProvider,
      timestamp: log.timestamp || new Date(),
    });

    try {
      await this.prisma.aIDegradationLog.create({
        data: {
          model: log.model,
          provider: log.provider,
          reason: log.reason,
          fallbackModel: log.fallbackModel,
          fallbackProvider: log.fallbackProvider,
          timestamp: log.timestamp || new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to store degradation log', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Query AI call logs
   * Requirement 11.5: Support querying logs by model, scenario, and time range
   */
  async queryLogs(query: AILogQuery): Promise<AICallLog[]> {
    const where: any = {};

    if (query.model) where.model = query.model;
    if (query.provider) where.provider = query.provider;
    if (query.scenario) where.scenario = query.scenario;
    if (query.success !== undefined) where.success = query.success;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = query.startDate;
      if (query.endDate) where.timestamp.lte = query.endDate;
    }

    try {
      const logs = await this.prisma.aICallLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: query.limit || 100,
        skip: query.offset || 0,
      });

      return logs as AICallLog[];
    } catch (error) {
      this.logger.error('Failed to query logs', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Query retry logs
   * Requirement 11.5: Support querying logs by model, scenario, and time range
   */
  async queryRetryLogs(query: AILogQuery): Promise<AIRetryLog[]> {
    const where: any = {};

    if (query.model) where.model = query.model;
    if (query.provider) where.provider = query.provider;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = query.startDate;
      if (query.endDate) where.timestamp.lte = query.endDate;
    }

    try {
      const logs = await this.prisma.aIRetryLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: query.limit || 100,
        skip: query.offset || 0,
      });

      return logs as AIRetryLog[];
    } catch (error) {
      this.logger.error('Failed to query retry logs', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Query degradation logs
   * Requirement 11.5: Support querying logs by model, scenario, and time range
   */
  async queryDegradationLogs(query: AILogQuery): Promise<AIDegradationLog[]> {
    const where: any = {};

    if (query.model) where.model = query.model;
    if (query.provider) where.provider = query.provider;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = query.startDate;
      if (query.endDate) where.timestamp.lte = query.endDate;
    }

    try {
      const logs = await this.prisma.aIDegradationLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: query.limit || 100,
        skip: query.offset || 0,
      });

      return logs as AIDegradationLog[];
    } catch (error) {
      this.logger.error('Failed to query degradation logs', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Clean up old logs
   * Requirement 11.6: Periodically clean up expired log files
   */
  async cleanupOldLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.LOG_RETENTION_DAYS);

    try {
      const deletedCalls = await this.prisma.aICallLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      const deletedRetries = await this.prisma.aIRetryLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      const deletedDegradations = await this.prisma.aIDegradationLog.deleteMany(
        {
          where: {
            timestamp: {
              lt: cutoffDate,
            },
          },
        }
      );

      this.logger.info('Cleaned up old logs', {
        deletedCalls: deletedCalls.count,
        deletedRetries: deletedRetries.count,
        deletedDegradations: deletedDegradations.count,
        cutoffDate,
      });
    } catch (error) {
      this.logger.error('Failed to cleanup old logs', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Sanitize sensitive data from logs
   * Requirement 12.2: Do not record API keys or sensitive information in logs
   */
  private sanitizeSensitiveData(log: AICallLog): AICallLog {
    const sanitized = { ...log };

    // Remove sensitive patterns from request and response content
    if (sanitized.requestContent) {
      sanitized.requestContent = this.removeSensitivePatterns(
        sanitized.requestContent
      );
    }

    if (sanitized.responseContent) {
      sanitized.responseContent = this.removeSensitivePatterns(
        sanitized.responseContent
      );
    }

    return sanitized;
  }

  /**
   * Remove sensitive patterns from text
   * Requirement 12.2: Filter out API keys and other sensitive information
   */
  private removeSensitivePatterns(text: string): string {
    if (!text) return text;

    // Remove API keys (common patterns)
    let sanitized = text.replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_API_KEY]');
    sanitized = sanitized.replace(
      /Bearer\s+[a-zA-Z0-9\-_.]+/g,
      'Bearer [REDACTED_TOKEN]'
    );

    // Remove email addresses
    sanitized = sanitized.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[REDACTED_EMAIL]'
    );

    // Remove phone numbers
    sanitized = sanitized.replace(
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      '[REDACTED_PHONE]'
    );

    return sanitized;
  }

  /**
   * Get log statistics
   * Requirement 11.5: Support querying logs by model, scenario, and time range
   */
  async getLogStatistics(query: AILogQuery): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;
  }> {
    const where: any = {};

    if (query.model) where.model = query.model;
    if (query.provider) where.provider = query.provider;
    if (query.scenario) where.scenario = query.scenario;

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = query.startDate;
      if (query.endDate) where.timestamp.lte = query.endDate;
    }

    try {
      const totalCalls = await this.prisma.aICallLog.count({ where });
      const successfulCalls = await this.prisma.aICallLog.count({
        where: { ...where, success: true },
      });
      const failedCalls = totalCalls - successfulCalls;
      const successRate =
        totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

      return {
        totalCalls,
        successfulCalls,
        failedCalls,
        successRate,
      };
    } catch (error) {
      this.logger.error('Failed to get log statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        successRate: 0,
      };
    }
  }
}
