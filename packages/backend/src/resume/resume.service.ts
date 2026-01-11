import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AIEngine } from '@/ai';
import { Sanitizer } from '@/common/utils/sanitizer';
import { ParseStatus, Resume } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from '@/storage/storage.service';
import { FileType } from '@/storage/interfaces/storage.interface';
import { AIQueueService } from '@/ai/queue/ai-queue.service';

import { FileUploadValidator } from '@/common/validators/file-upload.validator';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private prisma: PrismaService,
    private aiEngine: AIEngine,
    private storageService: StorageService,
    private aiQueueService: AIQueueService
  ) {}

  /**
   * Upload a resume file for a user
   * Validates file format and size
   * Stores file and creates resume record
   */
  async uploadResume(
    userId: string,
    file: any,
    title?: string
  ): Promise<Resume> {
    // TODO Use general utf-8 encoding for all platforms
    // Fix encoding for originalname if it's garbled (common issue with multer on some systems)
    if (file.originalname) {
      try {
        const originalName = file.originalname;
        const rawHex = Buffer.from(originalName).toString('hex');
        this.logger.debug(
          `Processing filename: "${originalName}" (hex: ${rawHex})`
        );

        // Check if it's a UTF-8 string mis-interpreted as Latin1
        // Most common garbling: ä¸ªäººç®å -> 个人简历
        // If it's already UTF-8, it should contain characters > 255.
        // If it's Latin1, all characters are <= 255.
        const isLatin1 = !/[^\x00-\xff]/.test(originalName);

        if (isLatin1) {
          // Attempt conversion from Latin1 (binary) to UTF-8
          const converted = Buffer.from(originalName, 'latin1').toString(
            'utf8'
          );

          // Validate if the converted string is valid UTF-8 and contains CJK characters or is different
          // A simple check: if the converted string has a different length or contains CJK
          const hasCJK = /[\u4e00-\u9fa5]/.test(converted);

          if (
            converted !== originalName &&
            (hasCJK || converted.length !== originalName.length)
          ) {
            this.logger.log(
              `Converted filename from Latin1 to UTF-8: "${originalName}" -> "${converted}"`
            );
            file.originalname = converted;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to convert filename encoding: ${message}`);
      }
    }

    this.logger.log(
      `Received file for upload: ${file?.originalname}, size: ${file?.size}, mimetype: ${file?.mimetype}`
    );

    // Validate file using central validator
    FileUploadValidator.validateFile(file);

    try {
      // Upload file to Storage Service
      const storageFile = await this.storageService.uploadFile({
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
        userId,
        fileType: FileType.DOCUMENT,
        category: 'resumes',
      });

      // Sanitize inputs
      const sanitizedTitle = Sanitizer.sanitizeString(
        title || file.originalname
      );
      const sanitizedFilename = Sanitizer.sanitizeFilename(file.originalname);
      return await this.prisma.resume.create({
        data: {
          userId,
          title: sanitizedTitle,
          originalFilename: sanitizedFilename,
          fileUrl: storageFile.url,
          fileType: path.extname(file.originalname).toLowerCase().substring(1),
          fileSize: file.size,
          parseStatus: ParseStatus.PENDING,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to upload resume: ${error.message}`, error);
      throw new BadRequestException(
        `Failed to upload resume: ${error.message}`
      );
    }
  }

  /**
   * Get a resume by ID
   * Ensures user owns the resume
   */
  async getResume(resumeId: string, userId: string): Promise<Resume> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException(`Resume with ID ${resumeId} not found`);
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this resume'
      );
    }

    return resume;
  }

  /**
   * List all resumes for a user
   */
  async listResumes(userId: string): Promise<Resume[]> {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update resume parsed data
   * Creates a new version when data is modified
   */
  async updateResume(
    resumeId: string,
    userId: string,
    data: { parsedData?: Record<string, any> }
  ): Promise<Resume> {
    const resume = await this.getResume(resumeId, userId);

    // If parsedData is provided, create a new version
    if (data.parsedData) {
      const newVersion = resume.version + 1;
      return this.prisma.resume.update({
        where: { id: resumeId },
        data: {
          parsedData: data.parsedData,
          parseStatus: ParseStatus.COMPLETED,
          version: newVersion,
        },
      });
    }

    // Otherwise just update without changing version
    return this.prisma.resume.update({
      where: { id: resumeId },
      data: {
        parseStatus: resume.parseStatus,
      },
    });
  }

  /**
   * Delete a resume
   */
  async deleteResume(resumeId: string, userId: string): Promise<void> {
    const resume = await this.getResume(resumeId, userId);

    // Delete file from storage
    if (resume.fileUrl) {
      // Check if fileUrl is a URL (OSS) or local path
      if (
        resume.fileUrl.startsWith('http://') ||
        resume.fileUrl.startsWith('https://')
      ) {
        // Delete from OSS using storage service
        const storageRecord = await this.prisma.storage.findFirst({
          where: {
            userId,
            fileUrl: resume.fileUrl,
          },
        });

        if (storageRecord) {
          await this.storageService.deleteFile(storageRecord.id, userId);
        }
      } else {
        // Legacy: Delete from local filesystem
        const filepath = path.join(process.cwd(), resume.fileUrl);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }
    }

    // Delete from database
    await this.prisma.resume.delete({
      where: { id: resumeId },
    });
  }

  /**
   * Set a resume as primary
   */
  async setPrimaryResume(resumeId: string, userId: string): Promise<Resume> {
    const resume = await this.getResume(resumeId, userId);
    if (!resume) {
      throw new NotFoundException(`Resume with ID ${resumeId} not found`);
    }

    // Unset all other resumes as primary for this user
    await this.prisma.resume.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    });

    // Set this resume as primary
    return this.prisma.resume.update({
      where: { id: resumeId },
      data: { isPrimary: true },
    });
  }

  /**
   * Parse resume file content
   * Extracts text from file and uses AI engine to parse structured data
   * Uses Queue for rate limiting and resilience
   */
  async parseResume(resumeId: string, userId: string): Promise<any> {
    const resume = await this.getResume(resumeId, userId);

    // Return cached parsed data if already completed
    if (resume.parseStatus === ParseStatus.COMPLETED && resume.parsedData) {
      const parsedData = resume.parsedData as Record<string, any>;
      return {
        ...parsedData,
        extractedText: parsedData.extractedText || null,
      };
    }

    try {
      this.logger.log(
        `Starting parsing for resume ${resumeId} (type: ${resume.fileType})`
      );

      // Update status to processing
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { parseStatus: ParseStatus.PROCESSING },
      });

      // Get file buffer from storage service
      if (!resume.fileUrl) {
        throw new Error('Resume file URL is missing');
      }

      let fileBuffer: Buffer;

      // Check if fileUrl is a URL (OSS) or local path
      if (
        resume.fileUrl.startsWith('http://') ||
        resume.fileUrl.startsWith('https://')
      ) {
        this.logger.debug(`Downloading resume from OSS: ${resume.fileUrl}`);
        // Download from OSS using storage service
        const storageRecord = await this.prisma.storage.findFirst({
          where: {
            userId,
            fileUrl: resume.fileUrl,
          },
        });

        if (!storageRecord) {
          throw new Error('Storage record not found for resume file');
        }

        const downloadResult = await this.storageService.downloadFile(
          storageRecord.id,
          userId
        );
        fileBuffer = downloadResult.buffer;
      } else {
        // Legacy: Read from local filesystem
        const filepath = path.join(process.cwd(), resume.fileUrl);
        this.logger.debug(`Reading resume from local path: ${filepath}`);
        if (!fs.existsSync(filepath)) {
          throw new Error(`Resume file not found at ${filepath}`);
        }
        fileBuffer = fs.readFileSync(filepath);
      }

      const fileType = resume.fileType || 'txt';

      // Extract text from file - pass original filename for better encoding handling
      this.logger.debug(`Extracting text from ${fileType} buffer`);
      const textContent = await this.aiEngine.extractTextFromFile(
        fileBuffer,
        fileType
      );

      // Add to queue
      this.logger.log(`Queueing resume parsing job for resume ${resumeId}`);
      const job = await this.aiQueueService.addResumeParsingJob(
        resumeId,
        userId,
        textContent
      );

      // Wait for job completion with a timeout (up to 60 seconds)
      // This preserves the synchronous API feel for fast operations
      try {
        this.logger.debug(`Waiting for job ${job.id} to finish...`);

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error('Parsing timeout, processing in background')),
            60000
          )
        );

        // Race between job completion and timeout
        const result = await Promise.race([job.finished(), timeoutPromise]);

        this.logger.log(`Job ${job.id} completed successfully`);
        // Include extracted text in the response
        return {
          ...(result as Record<string, any>),
          extractedText: textContent,
        };
      } catch (error) {
        // If waiting times out or job fails, we still return the current status
        // The frontend can poll for updates if needed
        const isTimeout =
          error instanceof Error && error.message.includes('timeout');
        this.logger.warn(
          `Job ${job.id} ${isTimeout ? 'timed out' : 'failed'}: ${error instanceof Error ? error.message : String(error)}`
        );
        return {
          message: isTimeout
            ? 'Parsing is taking longer than expected, it will continue in the background'
            : 'Processing started',
          jobId: job.id,
          parseStatus: ParseStatus.PROCESSING,
          extractedText: textContent,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error parsing resume ${resumeId}: ${errorMessage}`,
        error
      );

      // Update status to failed
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { parseStatus: ParseStatus.FAILED },
      });

      throw new BadRequestException(
        `Failed to parse resume: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
