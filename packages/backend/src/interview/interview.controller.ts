import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InterviewService } from './interview.service';
import { JwtAuthGuard } from '../user/guards/jwt-auth.guard';
import { InterviewQuestion } from '@prisma/client';

@Controller('interview')
@UseGuards(JwtAuthGuard)
export class InterviewController {
  constructor(private interviewService: InterviewService) {}

  /**
   * Generate interview questions for an optimization
   * POST /api/v1/interview/questions
   */
  @Post('questions')
  @HttpCode(HttpStatus.CREATED)
  async generateQuestions(
    @Request() req: any,
    @Query('optimizationId') optimizationId: string,
    @Query('count') count?: string
  ): Promise<InterviewQuestion[]> {
    const userId = req.user.id;
    const questionCount = count ? parseInt(count, 10) : 12;

    return this.interviewService.generateQuestions(
      optimizationId,
      userId,
      questionCount
    );
  }

  /**
   * Get interview questions for an optimization
   * GET /api/v1/interview/questions/:optimizationId
   */
  @Get('questions/:optimizationId')
  async getQuestions(
    @Request() req: any,
    @Param('optimizationId') optimizationId: string
  ): Promise<InterviewQuestion[]> {
    const userId = req.user.id;

    return this.interviewService.getQuestions(optimizationId, userId);
  }

  /**
   * Export interview preparation as PDF
   * GET /api/v1/interview/export/:optimizationId
   */
  @Get('export/:optimizationId')
  async exportInterviewPrep(
    @Request() req: any,
    @Param('optimizationId') optimizationId: string
  ): Promise<{ html: string }> {
    const userId = req.user.id;

    const html = await this.interviewService.exportInterviewPrep(
      optimizationId,
      userId
    );

    return { html };
  }
}
