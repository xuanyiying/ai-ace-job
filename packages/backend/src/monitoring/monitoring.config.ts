/**
 * Monitoring Configuration
 * Requirement 10.5, 12.6: Monitoring and Alerting Configuration
 */

export interface MonitoringConfig {
  // Sentry Configuration
  sentry: {
    dsn?: string;
    environment: string;
    tracesSampleRate: number;
    enabled: boolean;
  };

  // Alerting Configuration
  alerting: {
    webhookUrl?: string;
    slackWebhookUrl?: string;
    emailEnabled: boolean;
    emailRecipients?: string[];
  };

  // Metrics Configuration
  metrics: {
    enabled: boolean;
    port: number;
    path: string;
  };

  // Health Check Configuration
  health: {
    checkInterval: number; // milliseconds
    databaseTimeout: number;
    redisTimeout: number;
  };

  // Performance Thresholds
  thresholds: {
    slowRequestMs: number;
    highErrorRatePercent: number;
    highMemoryUsagePercent: number;
    highCpuUsagePercent: number;
  };
}

export function getMonitoringConfig(): MonitoringConfig {
  return {
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'
      ),
      enabled: !!process.env.SENTRY_DSN,
    },
    alerting: {
      webhookUrl: process.env.ALERT_WEBHOOK_URL,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      emailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',
      emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(','),
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      port: parseInt(process.env.METRICS_PORT || '9090', 10),
      path: process.env.METRICS_PATH || '/metrics',
    },
    health: {
      checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
      databaseTimeout: parseInt(process.env.HEALTH_DB_TIMEOUT || '5000', 10),
      redisTimeout: parseInt(process.env.HEALTH_REDIS_TIMEOUT || '5000', 10),
    },
    thresholds: {
      slowRequestMs: parseInt(process.env.SLOW_REQUEST_MS || '2000', 10),
      highErrorRatePercent: parseFloat(
        process.env.HIGH_ERROR_RATE_PERCENT || '5'
      ),
      highMemoryUsagePercent: parseFloat(
        process.env.HIGH_MEMORY_USAGE_PERCENT || '90'
      ),
      highCpuUsagePercent: parseFloat(
        process.env.HIGH_CPU_USAGE_PERCENT || '80'
      ),
    },
  };
}
