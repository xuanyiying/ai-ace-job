import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { OssFactory } from './providers/oss.factory';
import { OssService } from './providers/oss.interface';
import { FileType, OssType, StorageFile } from './interfaces/storage.interface';
import { Storage } from '@prisma/client';
import { OssConfigService } from './config/oss.config';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';
import { UploadFileData, GetFilesParams } from './interfaces/storage.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private ossService: OssService;

  constructor(
    private prisma: PrismaService,
    private ossConfigService: OssConfigService
  ) {
    const config = this.ossConfigService.getConfig();
    this.ossService = OssFactory.getInstance(config);
  }

  /**
   * Upload a single file
   */
  async uploadFile(data: UploadFileData): Promise<StorageFile> {
    // Properly encode Chinese filename
    const originalName = Buffer.from(data.originalName, 'latin1').toString(
      'utf-8'
    );
    this.logger.log(`Starting file upload: ${originalName}`);

    // Validate file type
    this.validateFileType(data.fileType, data.mimetype);

    // Prepare file data
    let fileData: Buffer | Readable;
    let fileHash: string;

    if (data.buffer) {
      fileData = data.buffer;
      fileHash = crypto.createHash('md5').update(data.buffer).digest('hex');
    } else if (data.path) {
      fileData = fs.createReadStream(data.path);
      const buffer = fs.readFileSync(data.path);
      fileHash = crypto.createHash('md5').update(buffer).digest('hex');
    } else {
      throw new Error('File path or buffer is required');
    }

    // Check for duplicate files
    const existingFile = await this.prisma.storage.findFirst({
      where: { hashMd5: fileHash },
    });

    if (existingFile) {
      this.logger.log(`Duplicate file found: ${existingFile.id}`);
      return this.mapStorageToFile(existingFile);
    }

    // Determine folder
    const folder = this.getFolderByType(data.fileType);

    // Upload to OSS
    this.logger.log(`Uploading to OSS: ${originalName}`);
    const uploadResult = await this.ossService.uploadFile(
      fileData,
      originalName,
      data.mimetype,
      folder
    );

    // Create file record in database
    const file = await this.prisma.storage.create({
      data: {
        filename: path.basename(uploadResult.key),
        originalName: originalName,
        mimeType: data.mimetype,
        fileSize: data.size,
        fileUrl: uploadResult.url,
        filePath: uploadResult.key,
        hashMd5: fileHash,
        fileType: data.fileType,
        userId: data.userId,
        ossType: OssType.MINIO,
        isPublic: false,
        category: data.category,
      },
    });

    this.logger.log(`File uploaded successfully: ${file.id}`);
    return this.mapStorageToFile(file);
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(filesData: UploadFileData[]) {
    const results: StorageFile[] = [];
    const errors: Array<{ index: number; filename: string; error: string }> =
      [];

    for (let i = 0; i < filesData.length; i++) {
      try {
        const file = await this.uploadFile(filesData[i]);
        results.push(file);
      } catch (error) {
        errors.push({
          index: i,
          filename: filesData[i].originalName,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    return {
      success: results,
      errors,
      total: filesData.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  /**
   * Get file list
   */
  async getFiles(params: GetFilesParams) {
    const {
      page,
      pageSize,
      userId,
      fileType,
      keyword,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (fileType) where.fileType = fileType;
    if (keyword) {
      where.OR = [
        { filename: { contains: keyword } },
        { originalName: { contains: keyword } },
      ];
    }

    const [files, total] = await Promise.all([
      this.prisma.storage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.storage.count({ where }),
    ]);

    return {
      files: files.map((f) => this.mapStorageToFile(f)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get file by ID
   */
  async getFileById(id: string): Promise<StorageFile> {
    const file = await this.prisma.storage.findUnique({
      where: { id },
    });

    if (!file) {
      throw new Error('File not found');
    }

    return this.mapStorageToFile(file);
  }

  /**
   * Delete file
   */
  async deleteFile(id: string, userId: string): Promise<void> {
    const file = await this.prisma.storage.findUnique({
      where: { id },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.userId !== userId) {
      throw new Error('Permission denied');
    }

    // Delete from OSS
    await this.ossService.deleteFile(file.filePath);
    if (file.thumbnailUrl) {
      await this.ossService.deleteFile(file.thumbnailUrl);
    }

    // Delete from database
    await this.prisma.storage.delete({
      where: { id },
    });

    this.logger.log(`File deleted: ${id}`);
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(ids: string[], userId: string) {
    const files = await this.prisma.storage.findMany({
      where: { id: { in: ids } },
    });

    const results: string[] = [];
    const errors: Array<{ id: string; filename: string; error: string }> = [];

    for (const file of files) {
      try {
        if (file.userId !== userId) {
          errors.push({
            id: file.id,
            filename: file.originalName,
            error: 'Permission denied',
          });
          continue;
        }

        await this.ossService.deleteFile(file.filePath);
        if (file.thumbnailUrl) {
          await this.ossService.deleteFile(file.thumbnailUrl).catch(() => {});
        }

        await this.prisma.storage.delete({
          where: { id: file.id },
        });

        results.push(file.id);
      } catch (error) {
        errors.push({
          id: file.id,
          filename: file.originalName,
          error: error instanceof Error ? error.message : 'Delete failed',
        });
      }
    }

    return {
      success: results,
      errors,
      total: ids.length,
      successCount: results.length,
      errorCount: errors.length,
    };
  }

  /**
   * Download file
   */
  async downloadFile(id: string, userId?: string) {
    const file = await this.prisma.storage.findUnique({
      where: { id },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (userId && file.userId !== userId) {
      throw new Error('Permission denied');
    }

    const buffer = await this.ossService.downloadFile(file.filePath);

    return {
      buffer,
      filename: file.originalName,
      mimetype: file.mimeType,
      size: file.fileSize,
    };
  }

  /**
   * Get file statistics
   */
  async getFileStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, images, videos, totalSize] = await Promise.all([
      this.prisma.storage.count({ where }),
      this.prisma.storage.count({
        where: { ...where, fileType: FileType.IMAGE },
      }),
      this.prisma.storage.count({
        where: { ...where, fileType: FileType.VIDEO },
      }),
      this.prisma.storage.aggregate({
        where,
        _sum: { fileSize: true },
      }),
    ]);

    const size = totalSize._sum?.fileSize || 0;

    return {
      total,
      byType: { images, videos },
      totalSize: size,
      totalSizeFormatted: this.formatFileSize(size),
    };
  }

  /**
   * Update file
   */
  async updateFile(
    id: string,
    data: Partial<StorageFile>,
    userId: string
  ): Promise<StorageFile> {
    const file = await this.prisma.storage.findUnique({
      where: { id },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.userId !== userId) {
      throw new Error('Permission denied');
    }

    const updated = await this.prisma.storage.update({
      where: { id },
      data: {
        originalName: data.originalName,
        isPublic: data.isPublic,
      },
    });

    return this.mapStorageToFile(updated);
  }

  /**
   * Cleanup expired files
   */
  async cleanupExpiredFiles(
    maxAgeMs: number = 90 * 24 * 60 * 60 * 1000
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeMs);

    const expiredFiles = await this.prisma.storage.findMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    let deletedCount = 0;

    for (const file of expiredFiles) {
      try {
        await this.ossService.deleteFile(file.filePath);
        if (file.thumbnailUrl) {
          await this.ossService.deleteFile(file.thumbnailUrl).catch(() => {});
        }
        await this.prisma.storage.delete({
          where: { id: file.id },
        });
        deletedCount++;
      } catch (error) {
        this.logger.error(`Failed to delete expired file: ${file.id}`, error);
      }
    }

    this.logger.log(`Cleanup completed: ${deletedCount} files deleted`);
    return deletedCount;
  }

  /**
   * Private helper methods
   */

  private validateFileType(fileType: FileType, mimetype: string): void {
    const typeMap = {
      [FileType.IMAGE]: ['image/'],
      [FileType.VIDEO]: ['video/'],
      [FileType.DOCUMENT]: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ],
      [FileType.AUDIO]: ['audio/'],
    };

    const allowed = typeMap[fileType] || [];
    const isValid = allowed.some((type) => mimetype.startsWith(type));

    if (!isValid) {
      throw new Error(`Invalid file type: ${mimetype} for ${fileType}`);
    }
  }

  private getFolderByType(type: FileType): string {
    const folders = {
      [FileType.IMAGE]: 'images',
      [FileType.VIDEO]: 'videos',
      [FileType.DOCUMENT]: 'documents',
      [FileType.AUDIO]: 'audio',
      [FileType.OTHER]: 'other',
    };
    return folders[type] || 'other';
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private mapStorageToFile(file: Storage): StorageFile {
    return {
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      url: file.fileUrl,
      fileType: file.fileType as unknown as FileType,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      userId: file.userId,
      category: file.category || undefined,
      isPublic: file.isPublic,
      thumbnailUrl: file.thumbnailUrl || undefined,
    };
  }
}
