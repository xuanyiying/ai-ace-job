import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-codes';

/**
 * Exception for resource not found errors (404)
 */
export class ResourceNotFoundException extends AppException {
  constructor(
    errorCode: ErrorCode = ErrorCode.NOT_FOUND,
    userMessage: string = 'The requested resource was not found.',
    details?: any
  ) {
    super(errorCode, userMessage, HttpStatus.NOT_FOUND, details);
  }
}
