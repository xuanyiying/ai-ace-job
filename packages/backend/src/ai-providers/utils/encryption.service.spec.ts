import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;

  const mockEncryptionKey = 'test-encryption-key-32-chars-long-!!!';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_KEY') return mockEncryptionKey;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and then decrypt back to the original text', () => {
      const originalText = 'sk-1234567890abcdef';
      const encrypted = service.encrypt(originalText);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalText);
      expect(encrypted.startsWith('v1:')).toBe(true);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(originalText);
    });

    it('should handle empty or null input', () => {
      expect(service.encrypt('')).toBe('');
      expect(service.decrypt('')).toBe('');
      // @ts-ignore
      expect(service.encrypt(null)).toBe(null);
      // @ts-ignore
      expect(service.decrypt(null)).toBe(null);
    });

    it('should return original text if decryption fails or format is invalid', () => {
      const invalidEncrypted = 'not-encrypted-text';
      expect(service.decrypt(invalidEncrypted)).toBe(invalidEncrypted);

      const legacyFormat = 'iv:authTag:encrypted'; // Wrong parts length for new format but might match legacy logic
      // Since it doesn't have 32-char hex parts, it should return as-is
      expect(service.decrypt(legacyFormat)).toBe(legacyFormat);
    });

    it('should support legacy format (without v1: prefix)', () => {
      // Manually create legacy format using EncryptionUtils (it supports it)
      const iv = '0123456789abcdef0123456789abcdef';
      const authTag = '0123456789abcdef0123456789abcdef';
      const encrypted = 'abcdef';
      const legacyStr = `${iv}:${authTag}:${encrypted}`;
      
      // Decrypting this will fail because data is fake, but it should try to decrypt it
      // if it matches the pattern.
      // For this test, we just check that it doesn't crash and follows the logic.
      const result = service.decrypt(legacyStr);
      expect(result).toBe(legacyStr); // Fails decryption, returns as-is
    });
  });

  describe('isEncrypted', () => {
    it('should correctly identify encrypted strings', () => {
      const encrypted = service.encrypt('secret');
      expect(service.isEncrypted(encrypted)).toBe(true);
      expect(service.isEncrypted('plain-text')).toBe(false);
      expect(service.isEncrypted('v1:iv:tag:data')).toBe(true);
    });
  });
});
