import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import * as fs from 'fs';

jest.mock('fs');

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
    jest.clearAllMocks();
  });

  describe('uploadPDF', () => {
    it('should upload PDF file successfully', async () => {
      const fileName = 'resume-opt-1-123456.pdf';
      const buffer = Buffer.from('PDF content');

      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.uploadPDF(fileName, buffer);

      expect(result).toBe(`/uploads/pdfs/${fileName}`);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should throw error if upload fails', async () => {
      const fileName = 'resume-opt-1-123456.pdf';
      const buffer = Buffer.from('PDF content');

      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });

      await expect(service.uploadPDF(fileName, buffer)).rejects.toThrow();
    });
  });

  describe('downloadPDF', () => {
    it('should download PDF file successfully', async () => {
      const fileName = 'resume-opt-1-123456.pdf';
      const buffer = Buffer.from('PDF content');

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(buffer);

      const result = await service.downloadPDF(fileName);

      expect(result).toEqual(buffer);
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it('should throw error if file not found', async () => {
      const fileName = 'resume-opt-1-123456.pdf';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.downloadPDF(fileName)).rejects.toThrow(
        'File not found'
      );
    });

    it('should throw error if read fails', async () => {
      const fileName = 'resume-opt-1-123456.pdf';

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read failed');
      });

      await expect(service.downloadPDF(fileName)).rejects.toThrow();
    });
  });

  describe('deletePDF', () => {
    it('should delete PDF file successfully', async () => {
      const fileName = 'resume-opt-1-123456.pdf';

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await service.deletePDF(fileName);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should not throw error if file not found', async () => {
      const fileName = 'resume-opt-1-123456.pdf';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.deletePDF(fileName)).resolves.not.toThrow();
    });

    it('should throw error if delete fails', async () => {
      const fileName = 'resume-opt-1-123456.pdf';

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Delete failed');
      });

      await expect(service.deletePDF(fileName)).rejects.toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', () => {
      const fileName = 'resume-opt-1-123456.pdf';

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = service.fileExists(fileName);

      expect(result).toBe(true);
    });

    it('should return false if file does not exist', () => {
      const fileName = 'resume-opt-1-123456.pdf';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = service.fileExists(fileName);

      expect(result).toBe(false);
    });
  });

  describe('getFileSize', () => {
    it('should return file size in bytes', () => {
      const fileName = 'resume-opt-1-123456.pdf';
      const fileSize = 1024000;

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ size: fileSize });

      const result = service.getFileSize(fileName);

      expect(result).toBe(fileSize);
    });

    it('should throw error if file not found', () => {
      const fileName = 'resume-opt-1-123456.pdf';

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => service.getFileSize(fileName)).toThrow('File not found');
    });

    it('should throw error if stat fails', () => {
      const fileName = 'resume-opt-1-123456.pdf';

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('Stat failed');
      });

      expect(() => service.getFileSize(fileName)).toThrow();
    });
  });

  describe('cleanupExpiredFiles', () => {
    it('should delete files older than maxAgeMs', async () => {
      const now = Date.now();
      const oldFileTime = now - 100 * 24 * 60 * 60 * 1000; // 100 days old

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'old-file.pdf',
        'new-file.pdf',
      ]);
      (fs.statSync as jest.Mock)
        .mockReturnValueOnce({ mtimeMs: oldFileTime }) // old-file.pdf
        .mockReturnValueOnce({ mtimeMs: now }); // new-file.pdf
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      const result = await service.cleanupExpiredFiles(
        90 * 24 * 60 * 60 * 1000
      );

      expect(result).toBe(1);
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    });

    it('should return 0 if no files to delete', async () => {
      const now = Date.now();

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['new-file.pdf']);
      (fs.statSync as jest.Mock).mockReturnValue({ mtimeMs: now });

      const result = await service.cleanupExpiredFiles(
        90 * 24 * 60 * 60 * 1000
      );

      expect(result).toBe(0);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should return 0 if upload directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.cleanupExpiredFiles(
        90 * 24 * 60 * 60 * 1000
      );

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read directory failed');
      });

      await expect(
        service.cleanupExpiredFiles(90 * 24 * 60 * 60 * 1000)
      ).rejects.toThrow();
    });
  });
});
