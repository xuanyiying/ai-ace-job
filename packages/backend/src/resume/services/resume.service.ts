import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AIEngine } from '@/ai';
import { Sanitizer } from '@/common/utils/sanitizer';
import { ParseStatus, Resume } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { StorageService } from '@/storage/storage.service';
import { FileType } from '@/storage/interfaces/storage.interface';
import { AIQueueService } from '@/ai/queue/ai-queue.service';

import { FileUploadValidator } from '@/common/validators/file-upload.validator';
import { ParsedResumeData } from '@/types';

export interface ResumeUploadResult {
  resume: Resume;
  isDuplicate: boolean;
}

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private prisma: PrismaService,
    private aiEngine: AIEngine,
    private storageService: StorageService,
    @Inject(forwardRef(() => AIQueueService))
    private aiQueueService: AIQueueService
  ) {}

  /**
   * Calculate MD5 hash of a buffer
   */
  calculateFileMd5(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Find a resume by user ID and MD5 hash
   */
  async findByUserIdAndMd5(
    userId: string,
    md5: string
  ): Promise<Resume | null> {
    return this.prisma.resume.findFirst({
      where: { userId, fileMd5: md5 } as any,
    });
  }

  /**
   * Upload a resume file for a user
   *
   * @param userId The ID of the user uploading the resume
   * @param file The uploaded file object (Express.Multer.File)
   * @param title Optional custom title for the resume
   * @param conversationId Optional ID of the conversation to associate with
   * @returns Promise containing the created resume and duplication status
   * @throws BadRequestException if file is missing or invalid
   */
  async uploadResume(
    userId: string,
    file: Express.Multer.File,
    title?: string,
    conversationId?: string
  ): Promise<ResumeUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // 1. Normalize filename encoding
    file.originalname = this.normalizeFilenameEncoding(file.originalname);

    this.logger.log(
      `Received file for upload: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`
    );

    // 2. Validate file
    FileUploadValidator.validateFile(file);

    // 3. Check for duplicates using MD5
    const fileMd5 = this.calculateFileMd5(file.buffer);
    const existingResume = await this.findByUserIdAndMd5(userId, fileMd5);

    if (existingResume) {
      this.logger.log(
        `Duplicate resume found for user ${userId} with MD5 ${fileMd5}`
      );
      return {
        resume: existingResume,
        isDuplicate: true,
      };
    }

    // 4. Save to storage and database
    try {
      const resume = await this.saveResumeToStorageAndDb(
        userId,
        file,
        fileMd5,
        title,
        conversationId
      );

      return {
        resume,
        isDuplicate: false,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload resume: ${error.message}`, error);
      throw new BadRequestException(
        `Failed to upload resume: ${error.message}`
      );
    }
  }

  /**
   * Normalizes filename encoding to UTF-8
   * Fixes common issues where UTF-8 filenames are misinterpreted as Latin1 (ISO-8859-1)
   *
   * @param originalName The original filename from the upload
   * @returns The normalized UTF-8 filename
   */
  private normalizeFilenameEncoding(originalName: string): string {
    if (!originalName) return originalName;

    try {
      // Check if it's a UTF-8 string mis-interpreted as Latin1
      // If it's Latin1, all characters are <= 255.
      const isLatin1 = !/[^\x00-\xff]/.test(originalName);

      if (isLatin1) {
        // Attempt conversion from Latin1 (binary) to UTF-8
        const converted = Buffer.from(originalName, 'latin1').toString('utf8');

        // Validate if the converted string is valid UTF-8 and contains CJK characters or is different
        const hasCJK = /[\u4e00-\u9fa5]/.test(converted);

        if (
          converted !== originalName &&
          (hasCJK || converted.length !== originalName.length)
        ) {
          this.logger.log(
            `Converted filename from Latin1 to UTF-8: "${originalName}" -> "${converted}"`
          );
          return converted;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to convert filename encoding: ${message}`);
    }

    return originalName;
  }

  /**
   * Saves the resume file to storage and creates a database record
   *
   * @param userId The ID of the user
   * @param file The file to save
   * @param fileMd5 The MD5 hash of the file
   * @param title Optional title
   * @param conversationId Optional conversation ID
   * @returns The created Resume record
   */
  private async saveResumeToStorageAndDb(
    userId: string,
    file: Express.Multer.File,
    fileMd5: string,
    title?: string,
    conversationId?: string
  ): Promise<Resume> {
    // 1. Upload file to Storage Service
    const storageFile = await this.storageService.uploadFile({
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
      userId,
      fileType: FileType.DOCUMENT,
      category: 'resumes',
    });

    // 2. Sanitize inputs
    const sanitizedTitle = Sanitizer.sanitizeString(title || file.originalname);
    const sanitizedFilename = Sanitizer.sanitizeFilename(file.originalname);

    // 3. Create database record
    return this.prisma.resume.create({
      data: {
        userId,
        title: sanitizedTitle,
        originalFilename: sanitizedFilename,
        fileUrl: storageFile.url,
        fileType: path.extname(file.originalname).toLowerCase().substring(1),
        fileSize: file.size,
        fileMd5,
        conversationId,
        parseStatus: ParseStatus.PENDING,
      } as any,
    });
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
   * Get the latest resume for a user
   * Priority:
   * 1. Primary resume (isPrimary=true)
   * 2. Most recently updated COMPLETED resume
   * 3. Most recently updated resume
   */
  async getLatestResume(userId: string): Promise<Resume | null> {
    // 1. Try to find primary resume
    const primaryResume = await this.prisma.resume.findFirst({
      where: { userId, isPrimary: true },
    });

    if (primaryResume) {
      return primaryResume;
    }

    // 2. Try to find latest completed resume
    const latestCompleted = await this.prisma.resume.findFirst({
      where: { userId, parseStatus: ParseStatus.COMPLETED },
      orderBy: { updatedAt: 'desc' },
    });

    if (latestCompleted) {
      return latestCompleted;
    }

    // 3. Just get the latest one
    return this.prisma.resume.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get the latest parsed content for a user
   */
  async getLatestParsedContent(userId: string): Promise<any | null> {
    const latestResume = await this.getLatestResume(userId);

    if (!latestResume || !latestResume.parsedData) {
      return null;
    }

    return {
      ...(latestResume.parsedData as Record<string, any>),
      extractedText: (latestResume as any).extractedText,
    };
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
   * @param conversationId - Optional conversation ID to send optimization results to
   */
  async parseResume(
    resumeId: string,
    userId: string,
    conversationId?: string
  ): Promise<any> {
    const resume = await this.getResume(resumeId, userId);

    // Return cached parsed data if already completed
    if (resume.parseStatus === ParseStatus.COMPLETED && resume.parsedData) {
      const parsedData = resume.parsedData as Record<string, any>;

      // If conversationId is provided and we have optimized content,
      // add a job to send the cached optimization to conversation
      if (conversationId && parsedData.optimizedContent) {
        this.logger.log(
          `Queueing cached optimization send for resume ${resumeId}`
        );
        await this.aiQueueService.addSendOptimizationJob(
          userId,
          conversationId,
          resumeId,
          parsedData.optimizedContent
        );
      }

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

      // Add to queue with optional conversationId
      this.logger.log(`Queueing resume parsing job for resume ${resumeId}`);
      const job = await this.aiQueueService.addResumeParsingJob(
        resumeId,
        userId,
        textContent,
        conversationId
      );

      // Wait for job completion with a timeout (up to 120 seconds)
      // This preserves the synchronous API feel for fast operations
      try {
        this.logger.debug(`Waiting for job ${job.id} to finish...`);

        // Create a timeout promise - increased to 120s for large resumes or slow AI
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error('Parsing timeout, processing in background')),
            120000
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

  /**
   * Analyze a resume and provide scoring and suggestions
   */
  async analyzeResume(resumeId: string, userId: string): Promise<any> {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (!resume.parsedData) {
      throw new BadRequestException('Resume must be parsed before analysis');
    }

    const parsedData = resume.parsedData as unknown as ParsedResumeData;
    return this.aiEngine.analyzeParsedResume(parsedData);
  }
}
