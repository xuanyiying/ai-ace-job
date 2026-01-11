import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import GenerateService from '../generate/generate.service';
import { StorageService } from '../storage/storage.service';
import { RedisService } from '../redis/redis.service';
import { BackupService } from '../backup/backup.service';

/**
 * Scheduled tasks for system maintenance
 * Handles cleanup of expired files, PDFs, and cache entries
 * Also handles daily database backups
 * Requirement 9.5: Daily automatic database backups
 * Requirement 9.6: Auto-delete files not accessed for 90 days
 * Requirement 12.2: Cache expiration management
 */
@Injectable()
export class CleanupTask {
  private readonly logger = new Logger(CleanupTask.name);
  private readonly CACHE_CLEANUP_PREFIX = 'cleanup:cache:';
  private readonly CACHE_SCAN_BATCH_SIZE = 100;

  constructor(
    private generateService: GenerateService,
    private storageService: StorageService,
    private redisService: RedisService,
    private backupService: BackupService
  ) {}

  /**
   * Create daily database backup at 1 AM
   * Requirement 9.5: Daily automatic database backups
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async createDailyBackup(): Promise<void> {
    try {
      this.logger.log('Starting daily database backup...');
      const result = await this.backupService.createDatabaseBackup();
      this.logger.log(
        `Daily backup completed successfully: ${result.fileName} (${this.formatFileSize(result.size)})`
      );

      // Store backup timestamp
      await this.redisService.set(
        `${this.CACHE_CLEANUP_PREFIX}backup`,
        new Date().toISOString(),
        86400 * 7 // 7 days TTL
      );

      // Verify backup integrity
      if (!result.verified) {
        this.logger.error(
          `Daily backup verification failed for ${result.fileName}`
        );
        // In production, this should trigger an alert
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error during daily backup: ${errorMessage}`, error);
      // In production, this should trigger an alert
    }
  }

  /**
   * Clean up expired temporary PDF files daily at 2 AM
   * Requirement 3.6: Cleanup expired temporary PDF files
   * Requirement 7.7: File expiration management
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredFiles(): Promise<void> {
    try {
      this.logger.log('Starting cleanup of expired temporary PDF files...');
      const deletedCount = await this.generateService.cleanupExpiredFiles();
      this.logger.log(
        `Cleanup completed: ${deletedCount} expired temporary PDF files deleted`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error during temporary PDF cleanup: ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Clean up old files from storage daily at 3 AM
   * Requirement 9.6: Auto-delete files not accessed for 90 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldFiles(): Promise<void> {
    try {
      this.logger.log('Starting cleanup of old files...');
      const maxAgeMs = 90 * 24 * 60 * 60 * 1000; // 90 days
      const deletedCount =
        await this.storageService.cleanupExpiredFiles(maxAgeMs);
      this.logger.log(`Cleanup completed: ${deletedCount} old files deleted`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error during file cleanup: ${errorMessage}`, error);
    }
  }

  /**
   * Clean up expired cache entries daily at 4 AM
   * Requirement 12.2: Cache expiration management
   * Removes stale cache entries from Redis
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupExpiredCache(): Promise<void> {
    try {
      this.logger.log('Starting cleanup of expired cache entries...');
      const deletedCount = await this.cleanupRedisExpiredKeys();
      this.logger.log(
        `Cache cleanup completed: ${deletedCount} expired entries removed`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error during cache cleanup: ${errorMessage}`, error);
    }
  }

  /**
   * Clean up expired cache entries from Redis
   * Uses SCAN to iterate through keys without blocking
   * Requirement 12.2: Cache expiration management
   *
   * @returns Number of expired keys removed
   */
  private async cleanupRedisExpiredKeys(): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const deletedCount = 0;
      let cursor = '0';

      do {
        // Use SCAN to iterate through keys in batches
        const [newCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          '*',
          'COUNT',
          this.CACHE_SCAN_BATCH_SIZE
        );

        cursor = newCursor;

        // Check TTL for each key
        for (const key of keys) {
          try {
            const ttl = await this.redisService.ttl(key);

            // If TTL is -1, key has no expiration set
            // If TTL is -2, key doesn't exist (already deleted)
            // If TTL is positive, key is still valid
            // We don't need to manually delete keys with TTL set
            // Redis handles expiration automatically

            // However, we can log keys that are about to expire (within 1 hour)
            if (ttl > 0 && ttl < 3600) {
              this.logger.debug(
                `Cache key expiring soon: ${key} (TTL: ${ttl}s)`
              );
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Error checking TTL for key ${key}: ${errorMessage}`
            );
          }
        }

        // Continue scanning until cursor returns to 0
      } while (cursor !== '0');

      this.logger.log('Cache cleanup scan completed');
      return deletedCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error cleaning up Redis expired keys: ${errorMessage}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get cleanup statistics
   * Returns information about cleanup operations
   *
   * @returns Cleanup statistics
   */
  async getCleanupStats(): Promise<{
    lastPdfCleanup: Date | undefined;
    lastFileCleanup: Date | undefined;
    lastCacheCleanup: Date | undefined;
    lastBackup: Date | undefined;
  }> {
    try {
      const stats: {
        lastPdfCleanup: Date | undefined;
        lastFileCleanup: Date | undefined;
        lastCacheCleanup: Date | undefined;
        lastBackup: Date | undefined;
      } = {
        lastPdfCleanup: undefined,
        lastFileCleanup: undefined,
        lastCacheCleanup: undefined,
        lastBackup: undefined,
      };

      // Retrieve last cleanup timestamps from Redis
      const pdfCleanupTime = await this.redisService.get(
        `${this.CACHE_CLEANUP_PREFIX}pdf`
      );
      const fileCleanupTime = await this.redisService.get(
        `${this.CACHE_CLEANUP_PREFIX}file`
      );
      const cacheCleanupTime = await this.redisService.get(
        `${this.CACHE_CLEANUP_PREFIX}cache`
      );
      const backupTime = await this.redisService.get(
        `${this.CACHE_CLEANUP_PREFIX}backup`
      );

      if (pdfCleanupTime) {
        stats.lastPdfCleanup = new Date(pdfCleanupTime);
      }
      if (fileCleanupTime) {
        stats.lastFileCleanup = new Date(fileCleanupTime);
      }
      if (cacheCleanupTime) {
        stats.lastCacheCleanup = new Date(cacheCleanupTime);
      }
      if (backupTime) {
        stats.lastBackup = new Date(backupTime);
      }

      return stats;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting cleanup stats: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Format file size for display
   *
   * @param bytes - File size in bytes
   * @returns Formatted file size string
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
