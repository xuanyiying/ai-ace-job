import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AlertingService, AlertSeverity } from './alerting.service';

/**
 * Alerting Controller
 * Requirement 12.6: Alerting Rules and Notifications
 */
@ApiTags('monitoring')
@Controller('alerts')
export class AlertingController {
  constructor(private readonly alerting: AlertingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active alerts' })
  @ApiResponse({ status: 200, description: 'List of active alerts' })
  getActiveAlerts() {
    return this.alerting.getActiveAlerts();
  }

  @Get('severity/:severity')
  @ApiOperation({ summary: 'Get alerts by severity' })
  @ApiResponse({ status: 200, description: 'List of alerts by severity' })
  getAlertsBySeverity(@Param('severity') severity: AlertSeverity) {
    return this.alerting.getAlertsBySeverity(severity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiResponse({ status: 200, description: 'Alert details' })
  getAlert(@Param('id') id: string) {
    return this.alerting.getAlert(id);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  resolveAlert(@Param('id') id: string) {
    this.alerting.resolveAlert(id);
    return { message: 'Alert resolved', alertId: id };
  }

  @Post()
  @ApiOperation({ summary: 'Create a manual alert' })
  @ApiResponse({ status: 201, description: 'Alert created' })
  async createAlert(
    @Body()
    body: {
      title: string;
      description: string;
      severity: AlertSeverity;
      context?: Record<string, any>;
    }
  ) {
    return this.alerting.createAlert(
      body.title,
      body.description,
      body.severity,
      body.context
    );
  }
}
