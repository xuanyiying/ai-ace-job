import { Module } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { WinstonModule } from 'nest-winston';

@Module({
  imports: [MonitoringModule, WinstonModule],
  providers: [HttpExceptionFilter],
  exports: [HttpExceptionFilter],
})
export class CommonModule {}
