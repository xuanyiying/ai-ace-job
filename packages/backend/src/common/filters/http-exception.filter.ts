import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import {
  ERROR_CODE_TO_MESSAGE,
  ERROR_CODE_TO_STATUS,
} from '../exceptions/error-codes';

/**
 * Global HTTP exception filter for standardized error responses
 * Handles all HTTP exceptions and converts them to standardized error format
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate request ID for tracking
    const requestId =
      request.headers['x-request-id'] || this.generateRequestId();

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
    } else {
      // Handle generic HttpException
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      errorCode = this.getErrorCodeFromStatus(status);
      userMessage = this.getUserFriendlyMessage(errorCode);

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        details = responseObj.message || responseObj.error || null;
      }
    }

    // Log error with appropriate level
    const logMessage = `[${requestId}] ${request.method} ${request.url} - ${status} - ${errorCode}`;
    if (status >= 500) {
      this.logger.error(logMessage, exception.stack);
    } else if (status >= 400) {
      this.logger.warn(logMessage);
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
