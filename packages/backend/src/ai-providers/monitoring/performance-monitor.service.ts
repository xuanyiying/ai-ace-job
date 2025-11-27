/**
 * Performance Monitor Service
 * Monitors AI model performance metrics and generates alerts
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PerformanceMetrics as PrismaPerformanceMetrics } from '@prisma/client';

export interface PerformanceMetrics {
  id: string;
  model: string;
  provider: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  successRate: number;
  failureRate: number;
  lastUpdated: Date;
}

export interface Alert {
  id: string;
  model: string;
  provider: string;
  alertType: 'HIGH_FAILURE_RATE' | 'HIGH_LATENCY';
  threshold: number;
  currentValue: number;
  severity: 'WARNING' | 'CRITICAL';
  timestamp: Date;
}

export interface PerformanceAlert {
  model: string;
  provider: string;
  alertType: 'HIGH_FAILURE_RATE' | 'HIGH_LATENCY';
  threshold: number;
  currentValue: number;
  severity: 'WARNING' | 'CRITICAL';
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);

  // Alert thresholds
  private readonly FAILURE_RATE_THRESHOLD = 0.1; // 10%
  private readonly LATENCY_THRESHOLD_MS = 30000; // 30 seconds

  constructor(private prisma: PrismaService) {}

  /**
   * Record performance metrics for a model call
   * Property 41: 响应时间记录
   */
  async recordMetrics(
    model: string,
    provider: string,
    latency: number,
    success: boolean
  ): Promise<PerformanceMetrics> {
    try {
      // Validate input
      if (!model || !model.trim()) {
        throw new Error('Model is required');
      }

      if (!provider || !provider.trim()) {
        throw new Error('Provider is required');
      }

      if (latency < 0) {
        throw new Error('Latency must be non-negative');
      }

      // Get or create metrics record
      let metrics = await this.prisma.performanceMetrics.findUnique({
        where: { model },
      });

      if (!metrics) {
        metrics = await this.prisma.performanceMetrics.create({
          data: {
            model,
            provider,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageLatency: 0,
            maxLatency: 0,
            minLatency: 0,
            successRate: 0,
            failureRate: 0,
          },
        });
      }

      // Update metrics
      const newTotalCalls = metrics.totalCalls + 1;
      const newSuccessfulCalls = success
        ? metrics.successfulCalls + 1
        : metrics.successfulCalls;
      const newFailedCalls = !success
        ? metrics.failedCalls + 1
        : metrics.failedCalls;

      // Calculate new average latency
      const newAverageLatency =
        (metrics.averageLatency * metrics.totalCalls + latency) / newTotalCalls;

      // Update max and min latency
      const newMaxLatency = Math.max(metrics.maxLatency, latency);
      const newMinLatency =
        metrics.minLatency === 0
          ? latency
          : Math.min(metrics.minLatency, latency);

      // Calculate success and failure rates
      const newSuccessRate = newSuccessfulCalls / newTotalCalls;
      const newFailureRate = newFailedCalls / newTotalCalls;

      const updated = await this.prisma.performanceMetrics.update({
        where: { model },
        data: {
          totalCalls: newTotalCalls,
          successfulCalls: newSuccessfulCalls,
          failedCalls: newFailedCalls,
          averageLatency: Math.round(newAverageLatency * 100) / 100,
          maxLatency: newMaxLatency,
          minLatency: newMinLatency,
          successRate: Math.round(newSuccessRate * 10000) / 10000,
          failureRate: Math.round(newFailureRate * 10000) / 10000,
          lastUpdated: new Date(),
        },
      });

      this.logger.debug(
        `Recorded metrics for model ${model}: latency=${latency}ms, success=${success}`
      );

      return this.mapPrismaToMetrics(updated);
    } catch (error) {
      this.logger.error(
        `Failed to record metrics: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get performance metrics for a model
   * Property 42: 性能指标计算
   */
  async getMetrics(
    model: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceMetrics | null> {
    try {
      if (!model || !model.trim()) {
        throw new Error('Model is required');
      }

      const metrics = await this.prisma.performanceMetrics.findUnique({
        where: { model },
      });

      if (!metrics) {
        return null;
      }

      // If date range is provided, calculate metrics for that range
      if (startDate && endDate) {
        return this.calculateMetricsForDateRange(model, startDate, endDate);
      }

      return this.mapPrismaToMetrics(metrics);
    } catch (error) {
      this.logger.error(
        `Failed to get metrics: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get metrics for all models
   */
  async getAllMetrics(): Promise<PerformanceMetrics[]> {
    try {
      const metrics = await this.prisma.performanceMetrics.findMany();
      return metrics.map((m) => this.mapPrismaToMetrics(m));
    } catch (error) {
      this.logger.error(
        `Failed to get all metrics: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get metrics for a provider
   */
  async getMetricsByProvider(provider: string): Promise<PerformanceMetrics[]> {
    try {
      if (!provider || !provider.trim()) {
        throw new Error('Provider is required');
      }

      const metrics = await this.prisma.performanceMetrics.findMany({
        where: { provider },
      });

      return metrics.map((m) => this.mapPrismaToMetrics(m));
    } catch (error) {
      this.logger.error(
        `Failed to get metrics by provider: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Check for alerts
   * Property 44: 失败率告警
   * Property 45: 响应时间告警
   */
  async checkAlerts(): Promise<PerformanceAlert[]> {
    try {
      const alerts: PerformanceAlert[] = [];
      const metrics = await this.prisma.performanceMetrics.findMany();

      for (const metric of metrics) {
        // Check failure rate threshold
        if (metric.failureRate > this.FAILURE_RATE_THRESHOLD) {
          alerts.push({
            model: metric.model,
            provider: metric.provider,
            alertType: 'HIGH_FAILURE_RATE',
            threshold: this.FAILURE_RATE_THRESHOLD,
            currentValue: metric.failureRate,
            severity: metric.failureRate > 0.2 ? 'CRITICAL' : 'WARNING',
          });

          this.logger.warn(
            `High failure rate alert for model ${metric.model}: ${(metric.failureRate * 100).toFixed(2)}%`
          );
        }

        // Check latency threshold
        if (metric.averageLatency > this.LATENCY_THRESHOLD_MS) {
          alerts.push({
            model: metric.model,
            provider: metric.provider,
            alertType: 'HIGH_LATENCY',
            threshold: this.LATENCY_THRESHOLD_MS,
            currentValue: metric.averageLatency,
            severity: metric.averageLatency > 60000 ? 'CRITICAL' : 'WARNING',
          });

          this.logger.warn(
            `High latency alert for model ${metric.model}: ${metric.averageLatency.toFixed(2)}ms`
          );
        }
      }

      return alerts;
    } catch (error) {
      this.logger.error(
        `Failed to check alerts: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get alerts for a specific model
   */
  async getAlertsForModel(model: string): Promise<PerformanceAlert[]> {
    try {
      if (!model || !model.trim()) {
        throw new Error('Model is required');
      }

      const metrics = await this.prisma.performanceMetrics.findUnique({
        where: { model },
      });

      if (!metrics) {
        return [];
      }

      const alerts: PerformanceAlert[] = [];

      if (metrics.failureRate > this.FAILURE_RATE_THRESHOLD) {
        alerts.push({
          model: metrics.model,
          provider: metrics.provider,
          alertType: 'HIGH_FAILURE_RATE',
          threshold: this.FAILURE_RATE_THRESHOLD,
          currentValue: metrics.failureRate,
          severity: metrics.failureRate > 0.2 ? 'CRITICAL' : 'WARNING',
        });
      }

      if (metrics.averageLatency > this.LATENCY_THRESHOLD_MS) {
        alerts.push({
          model: metrics.model,
          provider: metrics.provider,
          alertType: 'HIGH_LATENCY',
          threshold: this.LATENCY_THRESHOLD_MS,
          currentValue: metrics.averageLatency,
          severity: metrics.averageLatency > 60000 ? 'CRITICAL' : 'WARNING',
        });
      }

      return alerts;
    } catch (error) {
      this.logger.error(
        `Failed to get alerts for model: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Reset metrics for a model
   */
  async resetMetrics(model: string): Promise<PerformanceMetrics> {
    try {
      if (!model || !model.trim()) {
        throw new Error('Model is required');
      }

      const metrics = await this.prisma.performanceMetrics.findUnique({
        where: { model },
      });

      if (!metrics) {
        throw new Error(`Metrics not found for model ${model}`);
      }

      const reset = await this.prisma.performanceMetrics.update({
        where: { model },
        data: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          averageLatency: 0,
          maxLatency: 0,
          minLatency: 0,
          successRate: 0,
          failureRate: 0,
          lastUpdated: new Date(),
        },
      });

      this.logger.log(`Reset metrics for model ${model}`);

      return this.mapPrismaToMetrics(reset);
    } catch (error) {
      this.logger.error(
        `Failed to reset metrics: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Calculate metrics for a date range
   * Property 46: 性能指标查询
   */
  private async calculateMetricsForDateRange(
    model: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceMetrics> {
    try {
      const records = await this.prisma.usageRecord.findMany({
        where: {
          model,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      if (records.length === 0) {
        return {
          id: '',
          model,
          provider: '',
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          averageLatency: 0,
          maxLatency: 0,
          minLatency: 0,
          successRate: 0,
          failureRate: 0,
          lastUpdated: new Date(),
        };
      }

      const successfulCalls = records.filter((r) => r.success).length;
      const failedCalls = records.filter((r) => !r.success).length;
      const latencies = records.map((r) => r.latency);
      const averageLatency =
        latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);
      const successRate = successfulCalls / records.length;
      const failureRate = failedCalls / records.length;

      const metrics = await this.prisma.performanceMetrics.findUnique({
        where: { model },
      });

      return {
        id: metrics?.id || '',
        model,
        provider: metrics?.provider || '',
        totalCalls: records.length,
        successfulCalls,
        failedCalls,
        averageLatency: Math.round(averageLatency * 100) / 100,
        maxLatency,
        minLatency,
        successRate: Math.round(successRate * 10000) / 10000,
        failureRate: Math.round(failureRate * 10000) / 10000,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate metrics for date range: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Map Prisma PerformanceMetrics to PerformanceMetrics interface
   */
  private mapPrismaToMetrics(
    metrics: PrismaPerformanceMetrics
  ): PerformanceMetrics {
    return {
      id: metrics.id,
      model: metrics.model,
      provider: metrics.provider,
      totalCalls: metrics.totalCalls,
      successfulCalls: metrics.successfulCalls,
      failedCalls: metrics.failedCalls,
      averageLatency: metrics.averageLatency,
      maxLatency: metrics.maxLatency,
      minLatency: metrics.minLatency,
      successRate: metrics.successRate,
      failureRate: metrics.failureRate,
      lastUpdated: metrics.lastUpdated,
    };
  }
}
