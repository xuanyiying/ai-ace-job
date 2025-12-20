/**
 * AI Providers Module
 * NestJS module for AI provider integration
 * Requirements: 2.1, 2.2
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { ModelConfigService } from './config';
import { PromptTemplateManager } from '@/ai-providers/config';
import { PromptVersionManager } from '@/ai-providers/config';
import { AIProviderFactory } from '@/ai-providers/factory';
import { UsageTrackerService } from '@/ai-providers/tracking';
import { PerformanceMonitorService } from '@/ai-providers/monitoring';
import { SecurityService } from '@/ai-providers/security';
import { AILogger } from '@/ai-providers/logging/ai-logger';
import { AIEngineService } from '@/ai-providers/ai-engine.service';
import { AIController } from '@/ai-providers/ai.controller';
import { PromptAdminController } from '@/ai-providers/prompt-admin.controller';
import { ModelAdminController } from '@/ai-providers/model-admin.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { loggerConfig } from '@/logger/logger.config';

@Module({
  imports: [ConfigModule, PrismaModule, WinstonModule.forRoot(loggerConfig)],
  controllers: [AIController, PromptAdminController, ModelAdminController],
  providers: [
    ModelConfigService,
    AIProviderFactory,
    PromptTemplateManager,
    PromptVersionManager,
    UsageTrackerService,
    PerformanceMonitorService,
    SecurityService,
    AILogger,
    AIEngineService,
  ],
  exports: [
    ModelConfigService,
    AIProviderFactory,
    PromptTemplateManager,
    PromptVersionManager,
    UsageTrackerService,
    PerformanceMonitorService,
    SecurityService,
    AILogger,
    AIEngineService,
  ],
})
export class AIProvidersModule {}
