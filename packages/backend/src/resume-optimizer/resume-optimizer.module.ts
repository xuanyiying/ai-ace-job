/**
 * Resume Optimizer Module
 * NestJS module for unified resume optimization functionality
 */

import { Module } from '@nestjs/common';
import { ResumeOptimizerGateway } from './resume-optimizer.gateway';
import { ResumeOptimizerService } from './resume-optimizer.service';
import { ResumeOptimizerController } from './resume-optimizer.controller';
import { AIProvidersModule } from '@/ai-providers/ai-providers.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { QuotaModule } from '@/quota/quota.module';

@Module({
  imports: [AIProvidersModule, PrismaModule, QuotaModule],
  providers: [ResumeOptimizerService, ResumeOptimizerGateway],
  controllers: [ResumeOptimizerController],
  exports: [ResumeOptimizerService],
})
export class ResumeOptimizerModule {}
