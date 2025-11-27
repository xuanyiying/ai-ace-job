import { BadRequestException } from '@nestjs/common';
import {
  FileUploadValidator,
  FILE_UPLOAD_CONFIG,
} from './file-upload.validator';

describe('FileUploadValidator', () => {
  const createMockFile = (
    overrides?: Partial<Express.Multer.File>
  ): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'resume.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024 * 100, // 100KB
    destination: './uploads',
    filename: 'resume.pdf',
    path: './uploads/resume.pdf',
    buffer: Buffer.from('%PDF-1.4'), // PDF signature
    stream: null as any,
    ...overrides,
  });

  describe('validateFileSize', () => {
    it('should accept file within size limit', () => {
      const file = createMockFile({ size: 1024 * 1024 }); // 1MB
      expect(() => FileUploadValidator.validateFileSize(file)).not.toThrow();
    });

    it('should reject file exceeding size limit', () => {
      const file = createMockFile({
        size: FILE_UPLOAD_CONFIG.MAX_FILE_SIZE + 1,
      });
      expect(() => FileUploadValidator.validateFileSize(file)).toThrow(
        BadRequestException
      );
    });

    it('should reject missing file', () => {
      expect(() => FileUploadValidator.validateFileSize(null as any)).toThrow(
        BadRequestException
      );
    });
  });

  describe('validateMimeType', () => {
    it('should accept PDF files', () => {
      const file = createMockFile({ mimetype: 'application/pdf' });
      expect(() => FileUploadValidator.validateMimeType(file)).not.toThrow();
    });

    it('should accept DOCX files', () => {
      const file = createMockFile({
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      expect(() => FileUploadValidator.validateMimeType(file)).not.toThrow();
    });

    it('should accept TXT files', () => {
      const file = createMockFile({ mimetype: 'text/plain' });
      expect(() => FileUploadValidator.validateMimeType(file)).not.toThrow();
    });

    it('should reject unsupported MIME types', () => {
      const file = createMockFile({ mimetype: 'application/exe' });
      expect(() => FileUploadValidator.validateMimeType(file)).toThrow(
        BadRequestException
      );
    });
  });

  describe('validateFileExtension', () => {
    it('should accept .pdf extension', () => {
      expect(() =>
        FileUploadValidator.validateFileExtension('resume.pdf')
      ).not.toThrow();
    });

    it('should accept .docx extension', () => {
      expect(() =>
        FileUploadValidator.validateFileExtension('resume.docx')
      ).not.toThrow();
    });

    it('should accept .txt extension', () => {
      expect(() =>
        FileUploadValidator.validateFileExtension('resume.txt')
      ).not.toThrow();
    });

    it('should reject unsupported extensions', () => {
      expect(() =>
        FileUploadValidator.validateFileExtension('resume.exe')
      ).toThrow(BadRequestException);
    });

    it('should be case insensitive', () => {
      expect(() =>
        FileUploadValidator.validateFileExtension('resume.PDF')
      ).not.toThrow();
    });
  });

  describe('validateFileContent', () => {
    it('should accept valid PDF with correct signature', () => {
      const pdfSignature = Buffer.from('%PDF');
      const file = createMockFile({
        mimetype: 'application/pdf',
        buffer: pdfSignature,
      });
      expect(() => FileUploadValidator.validateFileContent(file)).not.toThrow();
    });

    it('should reject PDF with invalid signature', () => {
      const file = createMockFile({
        mimetype: 'application/pdf',
        buffer: Buffer.from('INVALID'),
      });
      expect(() => FileUploadValidator.validateFileContent(file)).toThrow(
        BadRequestException
      );
    });

    it('should accept valid DOCX with ZIP signature', () => {
      const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK..
      const file = createMockFile({
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: zipSignature,
      });
      expect(() => FileUploadValidator.validateFileContent(file)).not.toThrow();
    });

    it('should reject file with null bytes', () => {
      const file = createMockFile({
        buffer: Buffer.from('hello\0world'),
      });
      expect(() => FileUploadValidator.validateFileContent(file)).toThrow(
        BadRequestException
      );
    });
  });

  describe('validateFile', () => {
    it('should pass comprehensive validation for valid PDF', () => {
      const pdfSignature = Buffer.from('%PDF');
      const file = createMockFile({
        mimetype: 'application/pdf',
        originalname: 'resume.pdf',
        size: 1024 * 500, // 500KB
        buffer: pdfSignature,
      });
      expect(() => FileUploadValidator.validateFile(file)).not.toThrow();
    });

    it('should fail if any validation step fails', () => {
      const file = createMockFile({
        size: FILE_UPLOAD_CONFIG.MAX_FILE_SIZE + 1, // Exceeds size limit
      });
      expect(() => FileUploadValidator.validateFile(file)).toThrow(
        BadRequestException
      );
    });

    it('should validate all aspects of the file', () => {
      const file = createMockFile({
        mimetype: 'application/pdf',
        originalname: 'resume.pdf',
        size: 1024 * 100,
        buffer: Buffer.from('%PDF'),
      });
      expect(() => FileUploadValidator.validateFile(file)).not.toThrow();
    });
  });
});
