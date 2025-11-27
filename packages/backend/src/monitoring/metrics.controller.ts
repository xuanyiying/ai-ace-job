import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

/**
 * Metrics Controller
 * Requirement 10.5: Exposes Prometheus metrics endpoint
 */
@ApiTags('monitoring')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics' })
  async getMetrics(@Res() res: Response) {
    const metricsData = await this.metrics.getMetrics();
    res.set('Content-Type', this.metrics.getMetricsContentType());
    res.send(metricsData);
  }
}
