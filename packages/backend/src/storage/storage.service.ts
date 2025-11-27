import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Storage service for managing file uploads and downloads
 * Supports both local file system and cloud storage (S3/OSS)
 * For MVP, uses local file system; can be extended for cloud storage
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'pdfs');

  constructor() {
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Upload PDF file to storage
   * Returns the file path/URL for storage
   *
   * @param fileName - Name of the file
   * @param buffer - File buffer content
   * @returns File URL/path
   */
  async uploadPDF(fileName: string, buffer: Buffer): Promise<string> {
    try {
      const filePath = path.join(this.uploadDir, fileName);

      // Write file to disk
      fs.writeFileSync(filePath, buffer);

      this.logger.log(`PDF uploaded successfully: ${fileName}`);

      // Return relative URL path
      return `/uploads/pdfs/${fileName}`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error uploading PDF: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Download PDF file from storage
   * Returns the file buffer
   *
   * @param fileName - Name of the file
   * @returns File buffer
   */
  async downloadPDF(fileName: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.uploadDir, fileName);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${fileName}`);
      }

      // Read file from disk
      const buffer = fs.readFileSync(filePath);

      this.logger.log(`PDF downloaded successfully: ${fileName}`);

      return buffer;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error downloading PDF: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Delete PDF file from storage
   *
   * @param fileName - Name of the file
   */
  async deletePDF(fileName: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, fileName);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`File not found for deletion: ${fileName}`);
        return;
      }

      // Delete file
      fs.unlinkSync(filePath);

      this.logger.log(`PDF deleted successfully: ${fileName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error deleting PDF: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Check if file exists in storage
   *
   * @param fileName - Name of the file
   * @returns True if file exists, false otherwise
   */
  fileExists(fileName: string): boolean {
    const filePath = path.join(this.uploadDir, fileName);
    return fs.existsSync(filePath);
  }

  /**
   * Get file size in bytes
   *
   * @param fileName - Name of the file
   * @returns File size in bytes
   */
  getFileSize(fileName: string): number {
    try {
      const filePath = path.join(this.uploadDir, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${fileName}`);
      }

      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting file size: ${errorMessage}`, error);
      throw error;
    }
  }

  /**
   * Clean up expired files
   * Deletes files that haven't been accessed for more than maxAgeMs
   *
   * @param maxAgeMs - Maximum age in milliseconds (default: 90 days)
   */
  async cleanupExpiredFiles(
    maxAgeMs: number = 90 * 24 * 60 * 60 * 1000
  ): Promise<number> {
    try {
      const now = Date.now();
      let deletedCount = 0;

      if (!fs.existsSync(this.uploadDir)) {
        return 0;
      }

      const files = fs.readdirSync(this.uploadDir);

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = now - stats.mtimeMs;

        if (fileAge > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
          this.logger.log(`Deleted expired file: ${file}`);
        }
      }

      this.logger.log(`Cleanup completed: ${deletedCount} files deleted`);
      return deletedCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error cleaning up expired files: ${errorMessage}`,
        error
      );
      throw error;
    }
  }
}
