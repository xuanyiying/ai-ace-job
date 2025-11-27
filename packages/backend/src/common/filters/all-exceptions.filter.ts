import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../exceptions/error-codes';

/**
 * Global exception filter for catching all unhandled exceptions
 * Converts any exception to a standardized error response
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate request ID for tracking
    const requestId =
      request.headers['x-request-id'] || this.generateRequestId();

    // Default error values
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    let userMessage =
      'An internal server error occurred. Please try again later.';
    let details: any = null;

    // Handle different exception types
    if (exception instanceof Error) {
      const errorMessage = exception.message || 'Unknown error';

      // Log the full error with stack trace
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - Unhandled Exception`,
        exception.stack
      );

      // Determine error type and set appropriate response
      if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        errorCode = ErrorCode.INVALID_INPUT;
        userMessage =
          'Invalid input provided. Please check the required fields.';
        details = errorMessage;
      } else if (exception.name === 'TimeoutError') {
        status = HttpStatus.REQUEST_TIMEOUT;
        errorCode = ErrorCode.REQUEST_TIMEOUT;
        userMessage = 'Request timeout. Please try again.';
      } else if (
        exception.name === 'DatabaseError' ||
        exception.name === 'PrismaClientKnownRequestError'
      ) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        errorCode = ErrorCode.DATABASE_ERROR;
        userMessage = 'A database error occurred. Please try again later.';
        // Don't expose database details in production
        if (process.env.NODE_ENV === 'development') {
          details = errorMessage;
        }
      } else if (exception.name === 'JsonWebTokenError') {
        status = HttpStatus.UNAUTHORIZED;
        errorCode = ErrorCode.TOKEN_INVALID;
        userMessage = 'Invalid authentication token. Please log in again.';
      } else if (exception.name === 'TokenExpiredError') {
        status = HttpStatus.UNAUTHORIZED;
        errorCode = ErrorCode.TOKEN_EXPIRED;
        userMessage = 'Your session has expired. Please log in again.';
      } else {
        // Generic error handling
        if (process.env.NODE_ENV === 'development') {
          details = errorMessage;
        }
      }
    } else {
      // Handle non-Error exceptions
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - Unhandled Exception (non-Error)`,
        JSON.stringify(exception)
      );
    }

    // Build standardized error response
    const errorResponse = {
      error: {
        code: errorCode,
        message: userMessage,
        ...(process.env.NODE_ENV === 'development' && details && { details }),
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Generate unique request ID for error tracking
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
