import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { ErrorCode } from './error-codes';

/**
 * Exception for business logic errors (422)
 */
export class BusinessLogicException extends AppException {
  constructor(
    errorCode: ErrorCode = ErrorCode.UNPROCESSABLE_ENTITY,
    userMessage: string = 'The request could not be processed.',
    details?: any
  ) {
    super(errorCode, userMessage, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}
