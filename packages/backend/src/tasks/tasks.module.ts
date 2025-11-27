import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupTask } from './cleanup.task';
import { GenerateModule } from '../generate/generate.module';
import { StorageModule } from '../storage/storage.module';
import { RedisModule } from '../redis/redis.module';
import { BackupModule } from '../backup/backup.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    GenerateModule,
    StorageModule,
    RedisModule,
    BackupModule,
  ],
  providers: [CleanupTask],
})
export class TasksModule {}
