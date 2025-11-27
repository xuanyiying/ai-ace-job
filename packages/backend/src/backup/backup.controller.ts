import { Controller, Get, Post, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BackupService } from './backup.service';

/**
 * Backup controller for managing database backups
 * Provides endpoints for backup operations and disaster recovery
 * Requirement 9.5: Database backup management
 */
@ApiTags('backup')
@Controller('backup')
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(private backupService: BackupService) {}

  /**
   * Create a new database backup
   * POST /api/v1/backup/create
   */
  @Post('create')
  @ApiOperation({ summary: 'Create a new database backup' })
  @ApiResponse({
    status: 201,
    description: 'Backup created successfully',
    schema: {
      example: {
        filePath: '/backups/backup_1234567890.sql',
        fileName: 'backup_1234567890.sql',
        size: 1024000,
        timestamp: '2024-01-15T10:30:00Z',
        verified: true,
      },
    },
  })
  async createBackup() {
    try {
      this.logger.log('Creating database backup...');
      const result = await this.backupService.createDatabaseBackup();
      this.logger.log(`Backup created successfully: ${result.fileName}`);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error creating backup: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Get list of available backups
   * GET /api/v1/backup/list
   */
  @Get('list')
  @ApiOperation({ summary: 'Get list of available backups' })
  @ApiResponse({
    status: 200,
    description: 'List of backups',
    schema: {
      example: [
        {
          fileName: 'backup_1234567890.sql',
          size: 1024000,
          timestamp: '2024-01-15T10:30:00Z',
          type: 'database',
          verified: true,
        },
      ],
    },
  })
  async getBackupList() {
    try {
      this.logger.log('Fetching backup list...');
      const backups = await this.backupService.getBackupList();
      this.logger.log(`Found ${backups.length} backups`);
      return backups;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching backup list: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Get backup statistics
   * GET /api/v1/backup/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get backup statistics' })
  @ApiResponse({
    status: 200,
    description: 'Backup statistics',
    schema: {
      example: {
        totalBackups: 30,
        totalSize: 30720000,
        oldestBackup: '2023-12-16T10:30:00Z',
        newestBackup: '2024-01-15T10:30:00Z',
        verifiedBackups: 30,
      },
    },
  })
  async getBackupStats() {
    try {
      this.logger.log('Fetching backup statistics...');
      const stats = await this.backupService.getBackupStats();
      this.logger.log('Backup statistics retrieved');
      return stats;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error fetching backup stats: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   * WARNING: This will overwrite the current database
   * POST /api/v1/backup/restore/:fileName
   */
  @Post('restore/:fileName')
  @ApiOperation({
    summary: 'Restore database from backup',
    description: 'WARNING: This will overwrite the current database',
  })
  @ApiResponse({
    status: 200,
    description: 'Database restored successfully',
    schema: {
      example: {
        success: true,
        message: 'Database restored from backup: backup_1234567890.sql',
        timestamp: '2024-01-15T10:30:00Z',
      },
    },
  })
  async restoreBackup(@Param('fileName') fileName: string) {
    try {
      this.logger.warn(`Restoring database from backup: ${fileName}`);
      const result = await this.backupService.restoreFromBackup(fileName);
      this.logger.log('Database restoration completed');
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error restoring backup: ${errorMessage}`, error);
      throw error;
    }
  }
}
