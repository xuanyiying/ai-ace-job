import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import axios from 'axios';

/**
 * Alert Severity Levels
 */
export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

/**
 * Alert Interface
 */
export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  timestamp: Date;
  context?: Record<string, any>;
  resolved?: boolean;
}

/**
 * Alerting Service
 * Requirement 12.6: Alerting Rules and Notifications
 * Manages alert creation, routing, and notifications
 */
@Injectable()
export class AlertingService {
  private readonly alerts: Map<string, Alert> = new Map();
  private readonly webhookUrl = process.env.ALERT_WEBHOOK_URL;
  private readonly emailAlerts = process.env.ALERT_EMAIL_ENABLED === 'true';
  private readonly slackWebhook = process.env.SLACK_WEBHOOK_URL;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  /**
   * Create and send an alert
   */
  async createAlert(
    title: string,
    description: string,
    severity: AlertSeverity,
    context?: Record<string, unknown>
  ): Promise<Alert> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      severity,
      timestamp: new Date(),
      context,
      resolved: false,
    };

    this.alerts.set(alert.id, alert);

    // Log the alert
    this.logger.warn(`Alert created: ${title}`, {
      alertId: alert.id,
      severity,
      description,
      context,
    });

    // Send notifications based on severity
    await this.sendAlertNotifications(alert);

    return alert;
  }

  /**
   * Send alert notifications to configured channels
   */
  private async sendAlertNotifications(alert: Alert) {
    const promises: Promise<void>[] = [];

    // Send to webhook if configured
    if (this.webhookUrl) {
      promises.push(this.sendWebhookAlert(alert));
    }

    // Send to Slack if configured
    if (this.slackWebhook) {
      promises.push(this.sendSlackAlert(alert));
    }

    // Send email for critical alerts
    if (this.emailAlerts && alert.severity === AlertSeverity.CRITICAL) {
      promises.push(this.sendEmailAlert(alert));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send alert to webhook
   */
  private async sendWebhookAlert(alert: Alert) {
    if (!this.webhookUrl) {
      return;
    }

    try {
      await axios.post(this.webhookUrl, {
        alert: {
          id: alert.id,
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          timestamp: alert.timestamp.toISOString(),
          context: alert.context,
        },
      });
    } catch (error) {
      this.logger.error('Failed to send webhook alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send alert to Slack
   */
  private async sendSlackAlert(alert: Alert) {
    if (!this.slackWebhook) {
      return;
    }

    try {
      const color = this.getSeverityColor(alert.severity);
      const emoji = this.getSeverityEmoji(alert.severity);

      await axios.post(this.slackWebhook, {
        attachments: [
          {
            color,
            title: `${emoji} ${alert.title}`,
            text: alert.description,
            fields: [
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Alert ID',
                value: alert.id,
                short: true,
              },
              {
                title: 'Timestamp',
                value: alert.timestamp.toISOString(),
                short: false,
              },
            ],
            footer: 'Resume Optimizer Monitoring',
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      });
    } catch (error) {
      this.logger.error('Failed to send Slack alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Send email alert (placeholder for email service integration)
   */
  private async sendEmailAlert(alert: Alert) {
    try {
      // This would integrate with an email service like SendGrid, AWS SES, etc.
      this.logger.info('Email alert would be sent', {
        alertId: alert.id,
        title: alert.title,
        recipients: process.env.ALERT_EMAIL_RECIPIENTS,
      });
    } catch (error) {
      this.logger.error('Failed to send email alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get color for Slack based on severity
   */
  private getSeverityColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      [AlertSeverity.CRITICAL]: '#FF0000',
      [AlertSeverity.HIGH]: '#FF6600',
      [AlertSeverity.MEDIUM]: '#FFAA00',
      [AlertSeverity.LOW]: '#00AA00',
      [AlertSeverity.INFO]: '#0099FF',
    };
    return colors[severity];
  }

  /**
   * Get emoji for Slack based on severity
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    const emojis: Record<AlertSeverity, string> = {
      [AlertSeverity.CRITICAL]: '🚨',
      [AlertSeverity.HIGH]: '⚠️',
      [AlertSeverity.MEDIUM]: '⚡',
      [AlertSeverity.LOW]: 'ℹ️',
      [AlertSeverity.INFO]: 'ℹ️',
    };
    return emojis[severity];
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.info('Alert resolved', { alertId });
    }
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((alert) => !alert.resolved);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alerts.values()).filter(
      (alert) => alert.severity === severity && !alert.resolved
    );
  }

  /**
   * Check for performance degradation
   */
  async checkPerformanceDegradation(
    avgResponseTime: number,
    threshold: number = 2000
  ) {
    if (avgResponseTime > threshold) {
      await this.createAlert(
        'Performance Degradation Detected',
        `Average response time (${avgResponseTime}ms) exceeds threshold (${threshold}ms)`,
        AlertSeverity.HIGH,
        { avgResponseTime, threshold }
      );
    }
  }

  /**
   * Check for high error rate
   */
  async checkHighErrorRate(errorRate: number, threshold: number = 0.05) {
    if (errorRate > threshold) {
      await this.createAlert(
        'High Error Rate Detected',
        `Error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold (${(threshold * 100).toFixed(2)}%)`,
        AlertSeverity.CRITICAL,
        { errorRate, threshold }
      );
    }
  }

  /**
   * Check for quota exhaustion
   */
  async checkQuotaExhaustion(
    userId: string,
    usagePercent: number,
    threshold: number = 90
  ) {
    if (usagePercent > threshold) {
      await this.createAlert(
        'Quota Exhaustion Warning',
        `User ${userId} has used ${usagePercent}% of their quota`,
        AlertSeverity.MEDIUM,
        { userId, usagePercent, threshold }
      );
    }
  }

  /**
   * Check for service unavailability
   */
  async checkServiceUnavailability(serviceName: string, available: boolean) {
    if (!available) {
      await this.createAlert(
        `Service Unavailable: ${serviceName}`,
        `The ${serviceName} service is currently unavailable`,
        AlertSeverity.CRITICAL,
        { serviceName }
      );
    }
  }
}
