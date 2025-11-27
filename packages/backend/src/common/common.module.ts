import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

@Module({
  providers: [
    // Register all exception filters
    // AllExceptionsFilter catches all unhandled exceptions
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // HttpExceptionFilter handles HTTP exceptions specifically
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [],
})
export class CommonModule {}
