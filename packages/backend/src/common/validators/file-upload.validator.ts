import { BadRequestException } from '@nestjs/common';

/**
 * File upload validation configuration
 */
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.txt'],
};

/**
 * Validates uploaded file for security and format compliance
 */
export class FileUploadValidator {
  /**
   * Validate file size
   */
  static validateFileSize(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${FILE_UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`
      );
    }
  }

  /**
   * Validate file MIME type
   */
  static validateMimeType(file: Express.Multer.File): void {
    if (!FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not allowed. Allowed types: ${FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`
      );
    }
  }

  /**
   * Validate file extension
   */
  static validateFileExtension(filename: string): void {
    const extension = filename
      .substring(filename.lastIndexOf('.'))
      .toLowerCase();
    if (!FILE_UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
      throw new BadRequestException(
        `File extension not allowed. Allowed extensions: ${FILE_UPLOAD_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`
      );
    }
  }

  /**
   * Validate file for malicious content (basic checks)
   */
  static validateFileContent(file: Express.Multer.File): void {
    // Check for suspicious file signatures (magic bytes)
    const buffer = file.buffer;

    // PDF signature
    if (file.mimetype === 'application/pdf') {
      const pdfSignature = Buffer.from('%PDF');
      if (!buffer.subarray(0, 4).equals(pdfSignature)) {
        throw new BadRequestException('Invalid PDF file format');
      }
    }

    // DOCX signature (ZIP file)
    if (
      file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK..
      if (!buffer.subarray(0, 4).equals(zipSignature)) {
        throw new BadRequestException('Invalid DOCX file format');
      }
    }

    // Check for null bytes only in text files, not binary files like PDF or DOCX
    // Binary files naturally contain null bytes and this check is inappropriate for them
    if (file.mimetype === 'text/plain' && buffer.includes(0x00)) {
      throw new BadRequestException('File contains invalid null bytes');
    }
  }

  /**
   * Comprehensive file validation
   */
  static validateFile(file: Express.Multer.File): void {
    this.validateFileSize(file);
    this.validateMimeType(file);
    this.validateFileExtension(file.originalname);
    this.validateFileContent(file);
  }
}