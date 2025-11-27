import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-codes';

/**
 * Exception for external service errors (502/503)
 */
export class ExternalServiceException extends AppException {
  constructor(
    errorCode: ErrorCode = ErrorCode.EXTERNAL_SERVICE_ERROR,
    userMessage: string = 'An external service error occurred. Please try again later.',
    details?: any
  ) {
    const statusCode =
      errorCode === ErrorCode.AI_SERVICE_UNAVAILABLE ||
      errorCode === ErrorCode.SERVICE_UNAVAILABLE
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.BAD_GATEWAY;
    super(errorCode, userMessage, statusCode, details);
  }
}
