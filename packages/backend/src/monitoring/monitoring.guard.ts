import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { MonitoringService } from './monitoring.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Monitoring Guard
 * Requirement 12.6: Sets up Sentry context for error tracking
 * Captures user information and request context for better error tracking
 */
@Injectable()
export class MonitoringGuard implements CanActivate {
  constructor(
    private readonly monitoring: MonitoringService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract user information if available
    const user = (request as any).user;
    if (user) {
      this.monitoring.setUserContext(user.id, user.email, user.username);
    }

    // Add breadcrumb for request
    this.monitoring.addBreadcrumb(
      `${request.method} ${request.path}`,
      {
        method: request.method,
        path: request.path,
        query: request.query,
        ip: request.ip,
      },
      'info'
    );

    return true;
  }
}
