/**
 * Unified Interview AI Controller
 * Handles both REST API and WebSocket endpoints for resume optimization
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ResumeOptimizerService } from '../services/resume-optimizer.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Optimization } from '@prisma/client';

@Controller('interview-ai')
@UseGuards(JwtAuthGuard)
export class ResumeOptimizerController {
  constructor(private resumeOptimizerService: ResumeOptimizerService) {}

  /**
   * Create a new optimization
   * POST /api/v1/interview-ai/optimizations
   */
  @Post('optimizations')
  @HttpCode(HttpStatus.CREATED)
  async createOptimization(
    @Request() req: any,
    @Body() body: { resumeId: string; jobId: string }
  ): Promise<Optimization> {
    return this.resumeOptimizerService.createOptimization(
      req.user.id,
      body.resumeId,
      body.jobId
    );
  }

  /**
   * List all optimizations for the user
   * GET /api/v1/interview-ai/optimizations
   */
  @Get('optimizations')
  async listOptimizations(@Request() req: any): Promise<Optimization[]> {
    return this.resumeOptimizerService.listOptimizations(req.user.id);
  }

  /**
   * Get an optimization by ID
   * GET /api/v1/interview-ai/optimizations/:id
   */
  @Get('optimizations/:id')
  async getOptimization(
    @Request() req: any,
    @Param('id') optimizationId: string
  ): Promise<Optimization> {
    return this.resumeOptimizerService.getOptimization(
      optimizationId,
      req.user.id
    );
  }

  /**
   * Apply a single suggestion
   * POST /api/v1/interview-ai/optimizations/:id/suggestions/:suggestionId/accept
   */
  @Post('optimizations/:id/suggestions/:suggestionId/accept')
  @HttpCode(HttpStatus.OK)
  async applySuggestion(
    @Request() req: any,
    @Param('id') optimizationId: string,
    @Param('suggestionId') suggestionId: string
  ): Promise<Optimization> {
    return this.resumeOptimizerService.applySuggestion(
      optimizationId,
      req.user.id,
      suggestionId
    );
  }

  /**
   * Apply multiple suggestions in batch
   * POST /api/v1/interview-ai/optimizations/:id/suggestions/accept-batch
   */
  @Post('optimizations/:id/suggestions/accept-batch')
  @HttpCode(HttpStatus.OK)
  async applyBatchSuggestions(
    @Request() req: any,
    @Param('id') optimizationId: string,
    @Body() body: { suggestionIds: string[] }
  ): Promise<Optimization> {
    return this.resumeOptimizerService.applyBatchSuggestions(
      optimizationId,
      req.user.id,
      body.suggestionIds
    );
  }

  /**
   * Reject a suggestion
   * POST /api/v1/interview-ai/optimizations/:id/suggestions/:suggestionId/reject
   */
  @Post('optimizations/:id/suggestions/:suggestionId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectSuggestion(
    @Request() req: any,
    @Param('id') optimizationId: string,
    @Param('suggestionId') suggestionId: string
  ): Promise<Optimization> {
    return this.resumeOptimizerService.rejectSuggestion(
      optimizationId,
      req.user.id,
      suggestionId
    );
  }
}
