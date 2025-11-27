import { Module } from '@nestjs/common';
import { OptimizationService } from './optimization.service';
import { OptimizationController } from './optimization.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { QuotaModule } from '../quota/quota.module';

@Module({
  imports: [PrismaModule, AIModule, QuotaModule],
  providers: [OptimizationService],
  controllers: [OptimizationController],
  exports: [OptimizationService],
})
export class OptimizationModule {}
