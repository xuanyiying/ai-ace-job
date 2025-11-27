import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JobService } from './job.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import type { Job } from '@prisma/client';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobController {
  constructor(private jobService: JobService) {}

  /**
   * Create a new job
   * POST /api/v1/jobs
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createJob(@Request() req: any, @Body() jobData: any): Promise<Job> {
    return this.jobService.createJob(req.user.id, jobData);
  }

  /**
   * Get all jobs for the current user
   * GET /api/v1/jobs
   */
  @Get()
  async listJobs(@Request() req: any): Promise<Job[]> {
    return this.jobService.listJobs(req.user.id);
  }

  /**
   * Get a specific job by ID
   * GET /api/v1/jobs/:id
   */
  @Get(':id')
  async getJob(@Request() req: any, @Param('id') jobId: string): Promise<Job> {
    return this.jobService.getJob(jobId, req.user.id);
  }

  /**
   * Update a job
   * PUT /api/v1/jobs/:id
   */
  @Put(':id')
  async updateJob(
    @Request() req: any,
    @Param('id') jobId: string,
    @Body() jobData: any
  ): Promise<Job> {
    return this.jobService.updateJob(jobId, req.user.id, jobData);
  }

  /**
   * Delete a job
   * DELETE /api/v1/jobs/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteJob(
    @Request() req: any,
    @Param('id') jobId: string
  ): Promise<void> {
    await this.jobService.deleteJob(jobId, req.user.id);
  }

  /**
   * Fetch job information from a URL
   * POST /api/v1/jobs/fetch-from-url
   */
  @Post('fetch-from-url')
  async fetchJobFromUrl(@Body() body: { url: string }): Promise<any> {
    return this.jobService.fetchJobFromUrl(body.url);
  }

  /**
   * Parse job description
   * POST /api/v1/jobs/parse
   */
  @Post('parse')
  async parseJobDescription(
    @Body() body: { description: string }
  ): Promise<any> {
    return this.jobService.parseJobDescription(body.description);
  }
}
