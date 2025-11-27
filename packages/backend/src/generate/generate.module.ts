import { Module } from '@nestjs/common';
import { GenerateService } from './generate.service';
import { GenerateController } from './generate.controller';
import { TemplatesController } from './templates.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { QuotaModule } from '../quota/quota.module';

@Module({
  imports: [PrismaModule, StorageModule, QuotaModule],
  providers: [GenerateService],
  controllers: [GenerateController, TemplatesController],
  exports: [GenerateService],
})
export class GenerateModule {}
