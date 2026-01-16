import { Module, forwardRef } from '@nestjs/common';
import { ResumeService } from './services/resume.service';
import { ResumeOptimizerService } from './services/resume-optimizer.service';
import { PdfGenerationService } from './services/pdf-generation.service';
import { ResumeController } from './controllers/resume.controller';
import { ResumeOptimizerController } from './controllers/resume-optimizer.controller';
import { PdfGenerationController } from './controllers/pdf-generation.controller';
import { TemplatesController } from './controllers/templates.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AIModule } from '../ai/ai.module';
import { AIQueueModule } from '../ai/queue/ai-queue.module';
import { StorageModule } from '../storage/storage.module';
import { QuotaModule } from '../quota/quota.module';
import { AIProvidersModule } from '../ai-providers/ai-providers.module';

@Module({
  imports: [
    PrismaModule,
    AIModule,
    StorageModule,
    forwardRef(() => AIQueueModule),
    QuotaModule,
    AIProvidersModule,
  ],
  providers: [ResumeService, ResumeOptimizerService, PdfGenerationService],
  controllers: [
    ResumeController,
    ResumeOptimizerController,
    PdfGenerationController,
    TemplatesController,
  ],
  exports: [ResumeService, ResumeOptimizerService, PdfGenerationService],
})
export class ResumeModule {}
