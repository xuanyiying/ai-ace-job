import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MetricsService } from '../monitoring/metrics.service';
import { AlertingService, AlertSeverity } from '../monitoring/alerting.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Health Check Controller
 * Requirement 10.5, 12.6: Health check endpoint for monitoring
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: MetricsService,
    private readonly alerting: AlertingService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    const startTime = Date.now();
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      services: {
        database: 'unknown',
        redis: 'unknown',
      },
      checks: {
        database: { status: 'unknown', responseTime: 0 },
        redis: { status: 'unknown', responseTime: 0 },
      },
    };

    // Check database connection
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbDuration = Date.now() - dbStart;
      health.services.database = 'connected';
      health.checks.database = {
        status: 'connected',
        responseTime: dbDuration,
      };
    } catch (error) {
      health.services.database = 'disconnected';
      health.checks.database = { status: 'disconnected', responseTime: 0 };
      health.status = 'degraded';
      this.metrics.setDatabaseConnectionPoolSize(0);
      await this.alerting.checkServiceUnavailability('Database', false);
    }

    // Check Redis connection
    try {
      const redisStart = Date.now();
      await this.redis.set('health_check', 'ok', 10);
      const result = await this.redis.get('health_check');
      const redisDuration = Date.now() - redisStart;
      health.services.redis = result === 'ok' ? 'connected' : 'disconnected';
      health.checks.redis = {
        status: result === 'ok' ? 'connected' : 'disconnected',
        responseTime: redisDuration,
      };
      this.metrics.setRedisConnectionStatus(true);
    } catch (error) {
      health.services.redis = 'disconnected';
      health.checks.redis = { status: 'disconnected', responseTime: 0 };
      health.status = 'degraded';
      this.metrics.setRedisConnectionStatus(false);
      await this.alerting.checkServiceUnavailability('Redis', false);
    }

    // Check memory usage
    const heapUsedPercent =
      (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
    if (heapUsedPercent > 90) {
      health.status = 'degraded';
      await this.alerting.createAlert(
        'High Memory Usage',
        `Heap memory usage is at ${heapUsedPercent.toFixed(2)}%`,
        AlertSeverity.HIGH,
        { heapUsedPercent }
      );
    }

    const duration = Date.now() - startTime;
    (health as any).responseTime = duration;

    this.logger.debug('Health check completed', {
      status: health.status,
      duration,
    });

    return health;
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async readiness() {
    try {
      // Quick database check
      await this.prisma.$queryRaw`SELECT 1`;
      // Quick Redis check
      await this.redis.set('ready_check', 'ok', 5);

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
