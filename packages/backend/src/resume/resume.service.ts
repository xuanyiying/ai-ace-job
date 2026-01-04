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

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
    // Validate file exists
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum limit of 10MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      );
    }

    // Validate file MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file format. Allowed formats: PDF, DOCX, TXT. Received: ${file.mimetype}`
      );
    }

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
      this.logger.log(`Starting parsing for resume ${resumeId} (type: ${resume.fileType})`);
      
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

      // Wait for job completion (up to 30 seconds)
      // This preserves the synchronous API feel for fast operations
      try {
        this.logger.debug(`Waiting for job ${job.id} to finish...`);
        const result = await job.finished();
        this.logger.log(`Job ${job.id} completed successfully`);
        // Include extracted text in the response
        return {
          ...(result as Record<string, any>),
          extractedText: textContent,
        };
      } catch (error) {
        // If waiting times out or job fails, we still return the current status
        // The frontend can poll for updates if needed
        this.logger.warn(
          `Job ${job.id} queued but not finished immediately: ${error instanceof Error ? error.message : String(error)}`
        );
        return {
          message: 'Processing started',
          jobId: job.id,
          extractedText: textContent,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error parsing resume ${resumeId}: ${errorMessage}`, error);

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
