import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIEngine } from './ai.engine';
import { DegradationService } from './degradation.service';
import { RedisModule } from '@/redis/redis.module';
import { AIProvidersModule } from '@/ai-providers/ai-providers.module';

/**
 * AI Module
 * Provides AI services with multi-provider support
 *
 * Architecture:
 * - AIEngine: Unified service that uses AIEngineService for multi-provider AI calls
 *   - Supports 5 AI providers: OpenAI, Qwen, DeepSeek, Gemini, Ollama
 *   - Automatic model selection based on scenario
 *   - Built-in caching, retry, and monitoring
 *   - File extraction utilities (PDF, DOCX, TXT)
 *
 * - DegradationService: Provides fallback when AI services are unavailable
 *
 * - AIProvidersModule: Complete AI provider infrastructure
 *   - AIEngineService: Core multi-provider service
 *   - Provider implementations
 *   - Model selection, usage tracking, performance monitoring
 */
@Module({
  imports: [
    ConfigModule,
    RedisModule,
    AIProvidersModule, // Provides AIEngineService and all providers
  ],
  providers: [
    AIEngine, // Unified AI service with multi-provider support
    DegradationService, // Fallback service for graceful degradation
  ],
  exports: [
    AIEngine, // Export unified AI service
    DegradationService, // Export degradation service
  ],
})
export class AIModule {}
