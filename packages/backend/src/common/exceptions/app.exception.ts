import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Application-specific exception with error code and details
 */
export class AppException extends HttpException {
  constructor(
    public readonly errorCode: string,
    public readonly userMessage: string,
    public readonly statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly details?: any
  ) {
    super(
      {
        message: userMessage,
        error: errorCode,
      },
      statusCode
    );
  }
}
