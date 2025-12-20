import { Module } from '@nestjs/common';
import { AILogger } from './ai-logger';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * AI Logging Module
 * Provides comprehensive logging services for AI provider operations
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */
@Module({
  imports: [PrismaModule],
  providers: [AILogger],
  exports: [AILogger],
})
export class AILoggingModule {}
