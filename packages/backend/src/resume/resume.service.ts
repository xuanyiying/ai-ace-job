import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIEngine } from '../ai/ai.engine';
import { Sanitizer } from '../common/utils/sanitizer';
import { Resume, ParseStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private prisma: PrismaService,
    private aiEngine: AIEngine
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

    // Validate file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      throw new BadRequestException(
        `Unsupported file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}. Received: ${fileExtension}`
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const filename = `${timestamp}-${randomString}${fileExtension}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file to disk
    fs.writeFileSync(filepath, file.buffer);

    // Sanitize inputs
    const sanitizedTitle = Sanitizer.sanitizeString(title || file.originalname);
    const sanitizedFilename = Sanitizer.sanitizeFilename(file.originalname);

    // Create resume record in database
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title: sanitizedTitle,
        originalFilename: sanitizedFilename,
        fileUrl: `/uploads/${filename}`,
        fileType: fileExtension.substring(1), // Remove leading dot
        fileSize: file.size,
        parseStatus: ParseStatus.PENDING,
      },
    });

    return resume;
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

    // Delete file from disk if it exists
    if (resume.fileUrl) {
      const filepath = path.join(process.cwd(), resume.fileUrl);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
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
   * Caches results for performance optimization (Requirement 10.1, 10.3)
   */
  async parseResume(resumeId: string, userId: string): Promise<any> {
    const resume = await this.getResume(resumeId, userId);

    // Return cached parsed data if already completed
    if (resume.parseStatus === ParseStatus.COMPLETED && resume.parsedData) {
      return resume.parsedData;
    }

    try {
      // Update status to processing
      await this.prisma.resume.update({
        where: { id: resumeId },
        data: { parseStatus: ParseStatus.PROCESSING },
      });

      // Read file from disk
      const filepath = path.join(process.cwd(), resume.fileUrl || '');
      if (!fs.existsSync(filepath)) {
        throw new Error(`Resume file not found at ${filepath}`);
      }

      const fileBuffer = fs.readFileSync(filepath);
      const fileType = resume.fileType || 'txt';

      // Extract text from file
      const textContent = await this.aiEngine.extractTextFromFile(
        fileBuffer,
        fileType
      );

      // Parse content using AI engine (with multi-provider support)
      const parsedData = await this.aiEngine.parseResumeContent(textContent);

      // Update resume with parsed data
      const updatedResume = await this.prisma.resume.update({
        where: { id: resumeId },
        data: {
          parsedData: parsedData as any,
          parseStatus: ParseStatus.COMPLETED,
        },
      });

      return updatedResume.parsedData;
    } catch (error) {
      this.logger.error(`Error parsing resume ${resumeId}:`, error);

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
