import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MetricsService } from './metrics.service';
import { AlertingService } from './alerting.service';
import { MetricsController } from './metrics.controller';
import { AlertingController } from './alerting.controller';
import { MonitoringInterceptor } from './monitoring.interceptor';
import { MonitoringExceptionFilter } from './monitoring.filter';
import { MonitoringGuard } from './monitoring.guard';

/**
 * Monitoring Module
 * Requirement 10.5, 12.6: Application Performance Monitoring, Error Tracking, Alerting
 * Provides APM, metrics collection, error tracking, and alerting capabilities
 */
@Module({
  controllers: [MetricsController, AlertingController],
  providers: [
    MonitoringService,
    MetricsService,
    AlertingService,
    MonitoringInterceptor,
    MonitoringExceptionFilter,
    MonitoringGuard,
  ],
  exports: [
    MonitoringService,
    MetricsService,
    AlertingService,
    MonitoringInterceptor,
    MonitoringExceptionFilter,
    MonitoringGuard,
  ],
})
export class MonitoringModule {}
