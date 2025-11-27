import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Inject,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MonitoringService } from './monitoring.service';
import { AlertingService, AlertSeverity } from './alerting.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Monitoring Exception Filter
 * Requirement 12.6: Captures exceptions and sends alerts
 * Integrates with Sentry and alerting system
 */
@Catch()
export class MonitoringExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly monitoring: MonitoringService,
    private readonly alerting: AlertingService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        errorCode = (exceptionResponse as any).error || 'HTTP_EXCEPTION';
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = exception.constructor.name;
    }

    // Capture exception with Sentry
    if (exception instanceof Error) {
      this.monitoring.captureException(exception, {
        method: request.method,
        path: request.path,
        statusCode: status,
      });
    }

    // Send alert for critical errors
    if (status >= 500) {
      await this.alerting.createAlert(
        `Server Error: ${errorCode}`,
        `${request.method} ${request.path} - ${message}`,
        AlertSeverity.CRITICAL,
        {
          method: request.method,
          path: request.path,
          statusCode: status,
          errorCode,
        }
      );
    }

    // Log the error
    this.logger.error('Exception caught', {
      method: request.method,
      path: request.path,
      statusCode: status,
      errorCode,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    // Send response
    response.status(status).json({
      error: {
        code: errorCode,
        message,
        timestamp: new Date().toISOString(),
        path: request.path,
      },
    });
  }
}
