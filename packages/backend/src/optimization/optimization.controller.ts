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
import { OptimizationService } from './optimization.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import type { Optimization } from '@prisma/client';

@Controller('optimizations')
@UseGuards(JwtAuthGuard)
export class OptimizationController {
  constructor(private optimizationService: OptimizationService) {}

  /**
   * Create a new optimization
   * POST /api/v1/optimizations
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOptimization(
    @Request() req: any,
    @Body() body: { resumeId: string; jobId: string }
  ): Promise<Optimization> {
    return this.optimizationService.createOptimization(
      req.user.id,
      body.resumeId,
      body.jobId
    );
  }

  /**
   * List all optimizations for the user
   * GET /api/v1/optimizations
   */
  @Get()
  async listOptimizations(@Request() req: any): Promise<Optimization[]> {
    return this.optimizationService.listOptimizations(req.user.id);
  }

  /**
   * Get an optimization by ID
   * GET /api/v1/optimizations/:id
   */
  @Get(':id')
  async getOptimization(
    @Request() req: any,
    @Param('id') optimizationId: string
  ): Promise<Optimization> {
    return this.optimizationService.getOptimization(
      optimizationId,
      req.user.id
    );
  }

  /**
   * Apply a single suggestion
   * POST /api/v1/optimizations/:id/suggestions/:suggestionId/accept
   */
  @Post(':id/suggestions/:suggestionId/accept')
  @HttpCode(HttpStatus.OK)
  async applySuggestion(
    @Request() req: any,
    @Param('id') optimizationId: string,
    @Param('suggestionId') suggestionId: string
  ): Promise<Optimization> {
    return this.optimizationService.applySuggestion(
      optimizationId,
      req.user.id,
      suggestionId
    );
  }

  /**
   * Apply multiple suggestions in batch
   * POST /api/v1/optimizations/:id/suggestions/accept-batch
   */
  @Post(':id/suggestions/accept-batch')
  @HttpCode(HttpStatus.OK)
  async applyBatchSuggestions(
    @Request() req: any,
    @Param('id') optimizationId: string,
    @Body() body: { suggestionIds: string[] }
  ): Promise<Optimization> {
    return this.optimizationService.applyBatchSuggestions(
      optimizationId,
      req.user.id,
      body.suggestionIds
    );
  }

  /**
   * Reject a suggestion
   * POST /api/v1/optimizations/:id/suggestions/:suggestionId/reject
   */
  @Post(':id/suggestions/:suggestionId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectSuggestion(
    @Request() req: any,
    @Param('id') optimizationId: string,
    @Param('suggestionId') suggestionId: string
  ): Promise<Optimization> {
    return this.optimizationService.rejectSuggestion(
      optimizationId,
      req.user.id,
      suggestionId
    );
  }
}
