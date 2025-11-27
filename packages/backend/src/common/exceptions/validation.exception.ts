import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-codes';

/**
 * Exception for validation errors (400)
 */
export class ValidationException extends AppException {
  constructor(
    errorCode: ErrorCode = ErrorCode.INVALID_INPUT,
    userMessage: string = 'Invalid input provided. Please check the required fields.',
    details?: any
  ) {
    const statusCode =
      errorCode === ErrorCode.FILE_TOO_LARGE
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : HttpStatus.BAD_REQUEST;
    super(errorCode, userMessage, statusCode, details);
  }
}
