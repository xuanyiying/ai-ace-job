import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import {
  ERROR_CODE_TO_MESSAGE,
} from '../exceptions/error-codes';
import { MonitoringService } from '../../monitoring/monitoring.service';
import { AlertingService, AlertSeverity } from '../../monitoring/alerting.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

/**
 * Global exception filter for standardized error responses
 * Requirement 12.6: Captures exceptions and sends alerts
 * Handles all exceptions and converts them to standardized error format
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly monitoring: MonitoringService,
    private readonly alerting: AlertingService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate request ID for tracking
    const requestId =
      (request.headers['x-request-id'] as string) || this.generateRequestId();

    // Extract error information
    let errorCode: string;
    let userMessage: string;
    let status: number;
    let details: any = null;

    if (exception instanceof AppException) {
      // Handle custom AppException
      errorCode = exception.errorCode;
      userMessage = exception.userMessage;
      status = exception.statusCode;
      details = exception.details;
    } else if (exception instanceof BadRequestException) {
      // Handle validation errors from class-validator
      errorCode = 'INVALID_INPUT';
      status = HttpStatus.BAD_REQUEST;
      const exceptionResponse = exception.getResponse() as any;
      userMessage = this.extractValidationMessage(exceptionResponse);
      details = this.extractValidationDetails(exceptionResponse);
    } else if (exception instanceof HttpException) {
      // Handle generic HttpException
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      errorCode = this.getErrorCodeFromStatus(status);
      userMessage = this.getUserFriendlyMessage(errorCode);

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        details = responseObj.message || responseObj.error || null;
      }
    } else {
      // Handle non-HTTP exceptions (like Prisma or native errors)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';
      userMessage = 'An unexpected error occurred. Please try again later.';
      
      if (exception instanceof Error) {
        details = exception.message;
        errorCode = (exception as any).code || exception.constructor.name;
      }
    }

    // Capture exception with monitoring system
    if (exception instanceof Error) {
      this.monitoring.captureException(exception, {
        method: request.method,
        path: request.path,
        statusCode: status,
        requestId,
      });
    }

    // Send alert for critical errors
    if (status >= 500) {
      await this.alerting.createAlert(
        `Server Error: ${errorCode}`,
        `${request.method} ${request.path} - ${userMessage}`,
        AlertSeverity.CRITICAL,
        {
          method: request.method,
          path: request.path,
          statusCode: status,
          errorCode,
          requestId,
        }
      );
    }

    // Log the error
    const logData = {
      requestId,
      method: request.method,
      path: request.path,
      statusCode: status,
      errorCode,
      message: userMessage,
      details,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    if (status >= 500) {
      this.logger.error('Exception caught', logData);
    } else if (status >= 400) {
      this.logger.warn('Exception caught', logData);
    }

    // Build standardized error response
    const errorResponse = {
      error: {
        code: errorCode,
        message: userMessage,
        ...(process.env.NODE_ENV === 'development' && details && { details }),
        timestamp: new Date().toISOString(),
        path: request.path,
        requestId,
      },
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Extract validation error message from class-validator response
   */
  private extractValidationMessage(response: any): string {
    if (response.message) {
      if (Array.isArray(response.message)) {
        return response.message[0] || 'Invalid input provided.';
      }
      return response.message;
    }
    return 'Invalid input provided. Please check the required fields.';
  }

  /**
   * Extract validation error details from class-validator response
   */
  private extractValidationDetails(response: any): any {
    if (Array.isArray(response.message)) {
      return response.message;
    }
    return null;
  }

  /**
   * Get error code based on HTTP status
   */
  private getErrorCodeFromStatus(status: number): string {
    const codeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
      [HttpStatus.BAD_GATEWAY]: 'EXTERNAL_SERVICE_ERROR',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
      [HttpStatus.PAYLOAD_TOO_LARGE]: 'FILE_TOO_LARGE',
      [HttpStatus.REQUEST_TIMEOUT]: 'REQUEST_TIMEOUT',
    };

    return codeMap[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Get user-friendly error message from error code
   */
  private getUserFriendlyMessage(errorCode: string): string {
    return (
      ERROR_CODE_TO_MESSAGE[errorCode as keyof typeof ERROR_CODE_TO_MESSAGE] ||
      'An error occurred. Please try again later.'
    );
  }

  /**
   * Generate unique request ID for error tracking
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
