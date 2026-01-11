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
    'text/markdown',
    'text/x-markdown',
    'application/x-pdf',
    'application/msword',
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.docx', '.txt', '.md', '.markdown'],
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
    console.log(
      `[DEBUG] Validating file: ${file.originalname}, mimetype: ${file.mimetype}`
    );

    // Extract base MIME type (e.g., 'text/plain; charset=utf-8' -> 'text/plain')
    const baseMimeType = file.mimetype.split(';')[0].trim().toLowerCase();

    if (!FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(baseMimeType)) {
      // Allow application/octet-stream if the extension is allowed
      const extension = file.originalname
        .substring(file.originalname.lastIndexOf('.'))
        .toLowerCase();

      if (
        baseMimeType === 'application/octet-stream' &&
        FILE_UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(extension)
      ) {
        return;
      }

      throw new BadRequestException(
        `File type "${file.mimetype}" not allowed. Allowed types: ${FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`
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
    const extension = file.originalname
      .substring(file.originalname.lastIndexOf('.'))
      .toLowerCase();
    const baseMimeType = file.mimetype.split(';')[0].trim().toLowerCase();

    // PDF signature
    if (
      baseMimeType === 'application/pdf' ||
      baseMimeType === 'application/x-pdf' ||
      (baseMimeType === 'application/octet-stream' && extension === '.pdf')
    ) {
      const pdfSignature = Buffer.from('%PDF');
      if (!buffer.subarray(0, 4).equals(pdfSignature)) {
        throw new BadRequestException('Invalid PDF file format');
      }
    }

    // DOCX signature (ZIP file)
    if (
      baseMimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      (baseMimeType === 'application/octet-stream' && extension === '.docx')
    ) {
      const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK..
      if (!buffer.subarray(0, 4).equals(zipSignature)) {
        throw new BadRequestException('Invalid DOCX file format');
      }
    }

    // Check for null bytes only in text files
    const isTextFile =
      ['text/plain', 'text/markdown', 'text/x-markdown'].includes(
        baseMimeType
      ) ||
      (baseMimeType === 'application/octet-stream' &&
        ['.txt', '.md', '.markdown'].includes(extension));

    if (isTextFile && buffer.includes(0x00)) {
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
