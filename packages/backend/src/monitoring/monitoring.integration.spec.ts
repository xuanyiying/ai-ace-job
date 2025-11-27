import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringModule } from './monitoring.module';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { AlertingService, AlertSeverity } from './alerting.service';
import { WinstonModule } from 'nest-winston';
import { loggerConfig } from '../logger/logger.config';

/**
 * Monitoring Integration Tests
 * Requirement 10.5, 12.6: Test monitoring and alerting functionality
 */
describe('Monitoring Integration', () => {
  let monitoringService: MonitoringService;
  let metricsService: MetricsService;
  let alertingService: AlertingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [WinstonModule.forRoot(loggerConfig), MonitoringModule],
    }).compile();

    monitoringService = moduleFixture.get<MonitoringService>(MonitoringService);
    metricsService = moduleFixture.get<MetricsService>(MetricsService);
    alertingService = moduleFixture.get<AlertingService>(AlertingService);
  });

  describe('Metrics Service', () => {
    it('should record HTTP request metrics', () => {
      metricsService.recordHttpRequest('GET', '/test', 200, 150, 1024, 2048);

      // Verify metrics are recorded (no errors thrown)
      expect(metricsService).toBeDefined();
    });

    it('should record resume upload metrics', () => {
      metricsService.recordResumeUpload('success');
      metricsService.recordResumeUpload('failure');

      expect(metricsService).toBeDefined();
    });

    it('should record optimization metrics', () => {
      metricsService.recordOptimization('success');
      metricsService.recordOptimization('failure');

      expect(metricsService).toBeDefined();
    });

    it('should record PDF generation metrics', () => {
      metricsService.recordPdfGeneration('modern', 5000);

      expect(metricsService).toBeDefined();
    });

    it('should record AI API call metrics', () => {
      metricsService.recordAiApiCall('parse_resume', 3000);
      metricsService.recordAiApiCall('optimize', 10000);

      expect(metricsService).toBeDefined();
    });

    it('should record AI API errors', () => {
      metricsService.recordAiApiError('parse_resume', 'timeout');
      metricsService.recordAiApiError('optimize', 'rate_limit');

      expect(metricsService).toBeDefined();
    });

    it('should set system metrics', () => {
      metricsService.setDatabaseConnectionPoolSize(10);
      metricsService.setRedisConnectionStatus(true);
      metricsService.setActiveUsers(50);
      metricsService.setQuotaUsage('user-123', 'free', 75);

      expect(metricsService).toBeDefined();
    });

    it('should export metrics in Prometheus format', async () => {
      const metrics = await metricsService.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should provide correct content type for metrics', () => {
      const contentType = metricsService.getMetricsContentType();

      expect(contentType).toContain('text/plain');
    });
  });

  describe('Alerting Service', () => {
    it('should create an alert', async () => {
      const alert = await alertingService.createAlert(
        'Test Alert',
        'This is a test alert',
        AlertSeverity.INFO,
        { test: true }
      );

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.title).toBe('Test Alert');
      expect(alert.description).toBe('This is a test alert');
      expect(alert.severity).toBe(AlertSeverity.INFO);
      expect(alert.resolved).toBe(false);
    });

    it('should retrieve an alert by ID', async () => {
      const createdAlert = await alertingService.createAlert(
        'Retrieve Test',
        'Test retrieval',
        AlertSeverity.LOW
      );

      const retrievedAlert = alertingService.getAlert(createdAlert.id);

      expect(retrievedAlert).toBeDefined();
      expect(retrievedAlert?.id).toBe(createdAlert.id);
    });

    it('should get all active alerts', async () => {
      await alertingService.createAlert(
        'Active Alert 1',
        'Description 1',
        AlertSeverity.MEDIUM
      );
      await alertingService.createAlert(
        'Active Alert 2',
        'Description 2',
        AlertSeverity.HIGH
      );

      const activeAlerts = alertingService.getActiveAlerts();

      expect(activeAlerts).toBeDefined();
      expect(activeAlerts.length).toBeGreaterThan(0);
      expect(activeAlerts.every((alert) => !alert.resolved)).toBe(true);
    });

    it('should get alerts by severity', async () => {
      await alertingService.createAlert(
        'Critical Alert',
        'Critical issue',
        AlertSeverity.CRITICAL
      );

      const criticalAlerts = alertingService.getAlertsBySeverity(
        AlertSeverity.CRITICAL
      );

      expect(criticalAlerts).toBeDefined();
      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(
        criticalAlerts.every(
          (alert) => alert.severity === AlertSeverity.CRITICAL
        )
      ).toBe(true);
    });

    it('should resolve an alert', async () => {
      const alert = await alertingService.createAlert(
        'Resolvable Alert',
        'Will be resolved',
        AlertSeverity.LOW
      );

      alertingService.resolveAlert(alert.id);

      const resolvedAlert = alertingService.getAlert(alert.id);
      expect(resolvedAlert?.resolved).toBe(true);
    });

    it('should check for performance degradation', async () => {
      await alertingService.checkPerformanceDegradation(3000, 2000);

      const alerts = alertingService.getActiveAlerts();
      const perfAlert = alerts.find((a) =>
        a.title.includes('Performance Degradation')
      );

      expect(perfAlert).toBeDefined();
      expect(perfAlert?.severity).toBe(AlertSeverity.HIGH);
    });

    it('should check for high error rate', async () => {
      await alertingService.checkHighErrorRate(0.1, 0.05);

      const alerts = alertingService.getActiveAlerts();
      const errorAlert = alerts.find((a) =>
        a.title.includes('High Error Rate')
      );

      expect(errorAlert).toBeDefined();
      expect(errorAlert?.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('should check for quota exhaustion', async () => {
      await alertingService.checkQuotaExhaustion('user-123', 95, 90);

      const alerts = alertingService.getActiveAlerts();
      const quotaAlert = alerts.find((a) =>
        a.title.includes('Quota Exhaustion')
      );

      expect(quotaAlert).toBeDefined();
      expect(quotaAlert?.severity).toBe(AlertSeverity.MEDIUM);
    });

    it('should check for service unavailability', async () => {
      await alertingService.checkServiceUnavailability('TestService', false);

      const alerts = alertingService.getActiveAlerts();
      const serviceAlert = alerts.find((a) =>
        a.title.includes('Service Unavailable')
      );

      expect(serviceAlert).toBeDefined();
      expect(serviceAlert?.severity).toBe(AlertSeverity.CRITICAL);
    });
  });

  describe('Monitoring Service', () => {
    it('should be defined', () => {
      expect(monitoringService).toBeDefined();
    });

    it('should capture exception', () => {
      const error = new Error('Test error');

      expect(() => {
        monitoringService.captureException(error, { test: true });
      }).not.toThrow();
    });

    it('should capture message', () => {
      expect(() => {
        monitoringService.captureMessage('Test message', 'info');
      }).not.toThrow();
    });

    it('should add breadcrumb', () => {
      expect(() => {
        monitoringService.addBreadcrumb(
          'Test breadcrumb',
          { data: 'test' },
          'info'
        );
      }).not.toThrow();
    });

    it('should set user context', () => {
      expect(() => {
        monitoringService.setUserContext(
          'user-123',
          'test@example.com',
          'testuser'
        );
      }).not.toThrow();
    });

    it('should clear user context', () => {
      expect(() => {
        monitoringService.clearUserContext();
      }).not.toThrow();
    });

    it('should get Sentry client', () => {
      const client = monitoringService.getSentryClient();
      expect(client).toBeDefined();
    });
  });
});
