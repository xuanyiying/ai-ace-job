import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

/**
 * Monitoring Service
 * Requirement 10.5, 12.6: Application Performance Monitoring and Error Tracking
 * Integrates Sentry for error tracking and performance monitoring
 */
@Injectable()
export class MonitoringService implements OnModuleInit {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  onModuleInit() {
    this.initializeSentry();
  }

  /**
   * Initialize Sentry for error tracking and APM
   */
  private initializeSentry() {
    const sentryDsn = process.env.SENTRY_DSN;

    if (!sentryDsn) {
      this.logger.warn('Sentry DSN not configured, error tracking disabled');
      return;
    }

    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'
      ),
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
      beforeSend(event) {
        // Filter out health check errors
        if (event.request?.url?.includes('/health')) {
          return null;
        }
        return event;
      },
    });

    this.logger.info('Sentry initialized for error tracking and APM');
  }

  /**
   * Capture an exception with Sentry
   */
  captureException(error: Error, context?: Record<string, any>) {
    Sentry.captureException(error, {
      contexts: {
        application: context,
      },
    });

    this.logger.error('Exception captured', {
      error: error.message,
      stack: error.stack,
      context,
    });
  }

  /**
   * Capture a message with Sentry
   */
  captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' = 'info'
  ) {
    Sentry.captureMessage(message, level);
  }

  /**
   * Add breadcrumb for tracking user actions
   */
  addBreadcrumb(
    message: string,
    data?: Record<string, any>,
    level: 'fatal' | 'error' | 'warning' | 'info' = 'info'
  ) {
    Sentry.addBreadcrumb({
      message,
      data,
      level,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(userId: string, email?: string, username?: string) {
    Sentry.setUser({
      id: userId,
      email,
      username,
    });
  }

  /**
   * Clear user context
   */
  clearUserContext() {
    Sentry.setUser(null);
  }

  /**
   * Get Sentry client for advanced usage
   */
  getSentryClient() {
    return Sentry;
  }

  /**
   * Record a performance metric
   * Requirement 10.2: Record and store performance metrics
   */
  async recordMetric(
    name: string,
    value: number,
    labels: Record<string, string> = {},
    _hint?: string
  ): Promise<void> {
    // Create or update gauge
    const metricKey = this.getMetricKey(name, labels);

    // In a real implementation, we would send this to Prometheus or another metrics system
    // For now, we'll just log it if it's significant
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`Metric recorded: ${metricKey} = ${value}`);
    }
  }

  /**
   * Generate a unique key for a metric based on name and labels
   */
  private getMetricKey(name: string, labels: Record<string, string>): string {
    const labelString = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .sort()
      .join(',');

    return labelString ? `${name}{${labelString}}` : name;
  }
}
