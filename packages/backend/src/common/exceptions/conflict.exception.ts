import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-codes';

/**
 * Exception for conflict errors (409)
 */
export class ConflictException extends AppException {
  constructor(
    errorCode: ErrorCode = ErrorCode.CONFLICT,
    userMessage: string = 'The request conflicts with existing data.',
    details?: any
  ) {
    super(errorCode, userMessage, HttpStatus.CONFLICT, details);
  }
}
