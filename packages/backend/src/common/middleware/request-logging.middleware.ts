import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Request Logging Middleware
 * Logs all incoming requests with structured information
 * Requirement 12.5: Structured logging with timestamp, user ID, request path, and response status
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const userId = this.extractUserId(req);
    const logger = this.logger;

    // Attach request ID to request object for use in other middleware/controllers
    (req as any).requestId = requestId;
    (req as any).userId = userId;

    // Capture the original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Structured log entry
      const logEntry = {
        timestamp: new Date().toISOString(),
        requestId,
        userId: userId || 'anonymous',
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
        statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('content-length') || 'unknown',
        userAgent: req.get('user-agent'),
        ip: req.ip,
      };

      // Log based on status code
      if (statusCode >= 500) {
        logger.error('Request failed with server error', {
          ...logEntry,
          responseBody: data,
        });
      } else if (statusCode >= 400) {
        logger.warn('Request failed with client error', logEntry);
      } else {
        logger.info('Request completed successfully', logEntry);
      }

      // Add request ID to response headers for tracing
      res.set('X-Request-ID', requestId);

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  }

  /**
   * Generate a unique request ID for tracing
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract user ID from JWT token or request
   */
  private extractUserId(req: Request): string | null {
    try {
      const authHeader = req.get('authorization');
      if (!authHeader) {
        return null;
      }

      // Extract from Bearer token if available
      const token = authHeader.replace('Bearer ', '');
      // Note: In production, you'd decode the JWT here
      // For now, we'll just return a placeholder
      return token ? 'user-from-token' : null;
    } catch {
      return null;
    }
  }
}
