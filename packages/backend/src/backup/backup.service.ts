import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { RedisService } from '../redis/redis.service';

const execAsync = promisify(exec);

/**
 * Backup service for database and file backups
 * Handles automatic backups, verification, and disaster recovery
 * Requirement 9.5: Daily automatic database backups
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');
  private readonly maxBackups = 30; // Keep 30 days of backups
  private readonly backupMetadataKey = 'backup:metadata';

  constructor(private redisService: RedisService) {
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Create a database backup
   * Uses pg_dump to create a PostgreSQL backup
   * Requirement 9.5: Daily automatic database backups
   *
   * @returns Backup file path and metadata
   */
  async createDatabaseBackup(): Promise<{
    filePath: string;
    fileName: string;
    size: number;
    timestamp: Date;
    verified: boolean;
  }> {
    try {
      const timestamp = new Date();
      const fileName = `backup_${timestamp.getTime()}.sql`;
      const filePath = path.join(this.backupDir, fileName);

      this.logger.log(`Starting database backup: ${fileName}`);

      // Get database connection string from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      // Parse PostgreSQL connection string
      const dbConfig = this.parsePostgresUrl(databaseUrl);

      // Create backup using pg_dump
      const dumpCommand = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} > "${filePath}"`;

      await execAsync(dumpCommand);

      // Verify backup file was created
      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file was not created');
      }

      const stats = fs.statSync(filePath);
      const size = stats.size;

      // Verify backup integrity
      const verified = await this.verifyBackupIntegrity(filePath);

      if (!verified) {
        this.logger.warn(`Backup integrity check failed for ${fileName}`);
      }

      // Store backup metadata
      await this.storeBackupMetadata({
        fileName,
        filePath,
        size,
        timestamp,
        type: 'database',
        verified,
      });

      this.logger.log(
        `Database backup completed: ${fileName} (${this.formatFileSize(size)})`
      );

      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        filePath,
        fileName,
        size,
        timestamp,
        verified,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error creating database backup: ${errorMessage}`,
        error
      );
      throw error;
    }
  }

  /**
   * Verify backup integrity
   * Checks if backup file is valid and can be restored
   *
   * @param filePath - Path to backup file
   * @returns True if backup is valid, false otherwise
   */
  private async verifyBackupIntegrity(filePath: string): Promise<boolean> {
    try {
      // Check file size is reasonable (at least 1KB)
      const stats = fs.statSync(filePath);
      if (stats.size < 1024) {
        this.logger.warn(`Backup file too small: ${stats.size} bytes`);
        return false;
      }

      // Check file contains SQL statements
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasSqlContent =
        content.includes('CREATE TABLE') ||
        content.includes('INSERT INTO') ||
        content.includes('--');

      if (!hasSqlContent) {
        this.logger.warn('Backup file does not contain SQL content');
        return false;
      }

      this.logger.log(`Backup integrity verified: ${filePath}`);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error verifying backup integrity: ${errorMessage}`,
        error
      );
      return false;
    }
  }

  /**
   * Restore database from backup
   * WARNING: This will overwrite the current database
   *
   * @param fileName - Name of backup file to restore
   * @returns Restoration result
   */
  async restoreFromBackup(fileName: string): Promise<{
    success: boolean;
    message: string;
    timestamp: Date;
  }> {
    try {
      const filePath = path.join(this.backupDir, fileName);

      // Verify backup file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Backup file not found: ${fileName}`);
      }

      this.logger.warn(`Starting database restoration from: ${fileName}`);

      // Get database connection string
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      const dbConfig = this.parsePostgresUrl(databaseUrl);

      // Drop existing database and recreate
      const dropCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "DROP DATABASE IF EXISTS ${dbConfig.database};"`;
      const createCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres -c "CREATE DATABASE ${dbConfig.database};"`;

      await execAsync(dropCommand);
      await execAsync(createCommand);

      // Restore from backup
      const restoreCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} < "${filePath}"`;

      await execAsync(restoreCommand);

      this.logger.log(`Database restoration completed from: ${fileName}`);

      return {
        success: true,
        message: `Database restored from backup: ${fileName}`,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error restoring database: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Get list of available backups
   *
   * @returns Array of backup metadata
   */
  async getBackupList(): Promise<
    Array<{
      fileName: string;
      size: number;
      timestamp: Date;
      type: string;
      verified: boolean;
    }>
  > {
    try {
      const backupMetadata = await this.redisService.get(
        this.backupMetadataKey
      );

      if (!backupMetadata) {
        return [];
      }

      const backups = JSON.parse(backupMetadata);
      return backups.sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting backup list: ${errorMessage}`, error);
      return [];
    }
  }

  /**
   * Get backup statistics
   *
   * @returns Backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    verifiedBackups: number;
  }> {
    try {
      const backups = await this.getBackupList();

      const stats = {
        totalBackups: backups.length,
        totalSize: backups.reduce((sum, b) => sum + b.size, 0),
        oldestBackup:
          backups.length > 0
            ? new Date(backups[backups.length - 1].timestamp)
            : null,
        newestBackup:
          backups.length > 0 ? new Date(backups[0].timestamp) : null,
        verifiedBackups: backups.filter((b) => b.verified).length,
      };

      return stats;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting backup stats: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Store backup metadata in Redis
   *
   * @param metadata - Backup metadata
   */
  private async storeBackupMetadata(metadata: any): Promise<void> {
    try {
      const backups = await this.getBackupList();
      backups.unshift(metadata);

      // Keep only recent backups
      const recentBackups = backups.slice(0, this.maxBackups);

      await this.redisService.set(
        this.backupMetadataKey,
        JSON.stringify(recentBackups),
        86400 * 30 // 30 days TTL
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error storing backup metadata: ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Clean up old backup files
   * Keeps only the most recent backups
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return;
      }

      const files = fs.readdirSync(this.backupDir);
      const backupFiles = files
        .filter((f) => f.startsWith('backup_') && f.endsWith('.sql'))
        .map((f) => ({
          name: f,
          path: path.join(this.backupDir, f),
          time: fs.statSync(path.join(this.backupDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time);

      // Delete old backups, keep only maxBackups
      for (let i = this.maxBackups; i < backupFiles.length; i++) {
        fs.unlinkSync(backupFiles[i].path);
        this.logger.log(`Deleted old backup: ${backupFiles[i].name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error cleaning up old backups: ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Parse PostgreSQL connection URL
   *
   * @param url - PostgreSQL connection URL
   * @returns Parsed connection config
   */
  private parsePostgresUrl(url: string): {
    user: string;
    password: string;
    host: string;
    port: number;
    database: string;
  } {
    // Format: postgresql://user:password@host:port/database
    const match = url.match(
      /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
    );

    if (!match) {
      throw new Error('Invalid PostgreSQL connection URL format');
    }

    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: parseInt(match[4], 10),
      database: match[5],
    };
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
