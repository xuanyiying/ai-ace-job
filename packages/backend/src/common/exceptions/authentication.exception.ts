import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-codes';

/**
 * Exception for authentication-related errors (401)
 */
export class AuthenticationException extends AppException {
  constructor(
    errorCode: ErrorCode = ErrorCode.UNAUTHORIZED,
    userMessage: string = 'Authentication required. Please log in.',
    details?: any
  ) {
    super(errorCode, userMessage, HttpStatus.UNAUTHORIZED, details);
  }
}
