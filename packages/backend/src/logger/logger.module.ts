import { Module } from '@nestjs/common';
import { ErrorLoggerService } from './error-logger.service';

/**
 * Logger Module
 * Provides structured logging services for the application
 * Requirement 12.5: Structured logging system
 */
@Module({
  providers: [ErrorLoggerService],
  exports: [ErrorLoggerService],
})
export class LoggerModule {}
