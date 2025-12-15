import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Monitoring Interceptor
 * Requirement 10.5: Captures metrics for all HTTP requests
 * Records request/response metrics, duration, and errors
 */
@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  constructor(
    private readonly metrics: MetricsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();
    const method = request.method;
    const route = request.route?.path || request.path;
    const requestSize = parseInt(request.headers['content-length'] || '0', 10);

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        const responseSize = JSON.stringify(data)?.length || 0;

        // Record metrics
        this.metrics.recordHttpRequest(
          method,
          route,
          statusCode,
          duration,
          requestSize,
          responseSize
        );

        // Log slow requests
        if (duration > 2000) {
          this.logger.warn('Slow request detected', {
            method,
            route,
            duration,
            statusCode,
          });
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode || 500;

        // Record error metrics
        this.metrics.recordHttpRequest(
          method,
          route,
          statusCode,
          duration,
          requestSize,
          0
        );

        this.logger.error('Request error', {
          method,
          route,
          duration,
          statusCode,
          error: error.message,
        });

        throw error;
      })
    );
  }
}
