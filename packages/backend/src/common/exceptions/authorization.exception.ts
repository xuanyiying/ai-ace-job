import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-codes';

/**
 * Exception for authorization-related errors (403)
 */
export class AuthorizationException extends AppException {
  constructor(
    errorCode: ErrorCode = ErrorCode.FORBIDDEN,
    userMessage: string = 'You do not have permission to access this resource.',
    details?: any
  ) {
    const statusCode =
      errorCode === ErrorCode.RATE_LIMIT_EXCEEDED
        ? HttpStatus.TOO_MANY_REQUESTS
        : HttpStatus.FORBIDDEN;
    super(errorCode, userMessage, statusCode, details);
  }
}
