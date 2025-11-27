import { Injectable } from '@nestjs/common';
import * as promClient from 'prom-client';

/**
 * Metrics Service
 * Requirement 10.5: Application Performance Monitoring
 * Collects and exposes Prometheus metrics for monitoring
 */
@Injectable()
export class MetricsService {
  private readonly register = new promClient.Registry();

  // HTTP metrics
  private readonly httpRequestDuration: promClient.Histogram;
  private readonly httpRequestTotal: promClient.Counter;
  private readonly httpRequestSize: promClient.Histogram;
  private readonly httpResponseSize: promClient.Histogram;

  // Business metrics
  private readonly resumeUploadTotal: promClient.Counter;
  private readonly optimizationTotal: promClient.Counter;
  private readonly pdfGenerationDuration: promClient.Histogram;
  private readonly aiApiCallDuration: promClient.Histogram;
  private readonly aiApiCallErrors: promClient.Counter;

  // System metrics
  private readonly databaseConnectionPoolSize: promClient.Gauge;
  private readonly redisConnectionStatus: promClient.Gauge;
  private readonly activeUsers: promClient.Gauge;
  private readonly quotaUsage: promClient.Gauge;

  constructor() {
    // Set default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({ register: this.register });

    // HTTP metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestSize = new promClient.Histogram({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.register],
    });

    this.httpResponseSize = new promClient.Histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.register],
    });

    // Business metrics
    this.resumeUploadTotal = new promClient.Counter({
      name: 'resume_uploads_total',
      help: 'Total resume uploads',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.optimizationTotal = new promClient.Counter({
      name: 'optimizations_total',
      help: 'Total optimization requests',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.pdfGenerationDuration = new promClient.Histogram({
      name: 'pdf_generation_duration_seconds',
      help: 'PDF generation duration in seconds',
      labelNames: ['template'],
      buckets: [1, 2, 5, 10, 20],
      registers: [this.register],
    });

    this.aiApiCallDuration = new promClient.Histogram({
      name: 'ai_api_call_duration_seconds',
      help: 'AI API call duration in seconds',
      labelNames: ['operation'],
      buckets: [1, 5, 10, 30, 60],
      registers: [this.register],
    });

    this.aiApiCallErrors = new promClient.Counter({
      name: 'ai_api_call_errors_total',
      help: 'Total AI API call errors',
      labelNames: ['operation', 'error_type'],
      registers: [this.register],
    });

    // System metrics
    this.databaseConnectionPoolSize = new promClient.Gauge({
      name: 'database_connection_pool_size',
      help: 'Database connection pool size',
      registers: [this.register],
    });

    this.redisConnectionStatus = new promClient.Gauge({
      name: 'redis_connection_status',
      help: 'Redis connection status (1 = connected, 0 = disconnected)',
      registers: [this.register],
    });

    this.activeUsers = new promClient.Gauge({
      name: 'active_users',
      help: 'Number of active users',
      registers: [this.register],
    });

    this.quotaUsage = new promClient.Gauge({
      name: 'quota_usage_percent',
      help: 'User quota usage percentage',
      labelNames: ['user_id', 'tier'],
      registers: [this.register],
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ) {
    const statusCodeStr = statusCode.toString();
    this.httpRequestDuration
      .labels(method, route, statusCodeStr)
      .observe(duration / 1000);
    this.httpRequestTotal.labels(method, route, statusCodeStr).inc();

    if (requestSize) {
      this.httpRequestSize.labels(method, route).observe(requestSize);
    }

    if (responseSize) {
      this.httpResponseSize
        .labels(method, route, statusCodeStr)
        .observe(responseSize);
    }
  }

  /**
   * Record resume upload
   */
  recordResumeUpload(status: 'success' | 'failure') {
    this.resumeUploadTotal.labels(status).inc();
  }

  /**
   * Record optimization request
   */
  recordOptimization(status: 'success' | 'failure') {
    this.optimizationTotal.labels(status).inc();
  }

  /**
   * Record PDF generation
   */
  recordPdfGeneration(template: string, duration: number) {
    this.pdfGenerationDuration.labels(template).observe(duration / 1000);
  }

  /**
   * Record AI API call
   */
  recordAiApiCall(operation: string, duration: number) {
    this.aiApiCallDuration.labels(operation).observe(duration / 1000);
  }

  /**
   * Record AI API error
   */
  recordAiApiError(operation: string, errorType: string) {
    this.aiApiCallErrors.labels(operation, errorType).inc();
  }

  /**
   * Set database connection pool size
   */
  setDatabaseConnectionPoolSize(size: number) {
    this.databaseConnectionPoolSize.set(size);
  }

  /**
   * Set Redis connection status
   */
  setRedisConnectionStatus(connected: boolean) {
    this.redisConnectionStatus.set(connected ? 1 : 0);
  }

  /**
   * Set active users count
   */
  setActiveUsers(count: number) {
    this.activeUsers.set(count);
  }

  /**
   * Set quota usage for a user
   */
  setQuotaUsage(userId: string, tier: string, usagePercent: number) {
    this.quotaUsage.labels(userId, tier).set(usagePercent);
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Get metrics content type
   */
  getMetricsContentType(): string {
    return this.register.contentType;
  }
}
