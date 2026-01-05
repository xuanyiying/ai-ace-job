import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionUtils } from './encryption.util';

/**
 * Encryption Service
 * NestJS wrapper for EncryptionUtils to manage API key encryption/decryption
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: string;

  constructor(private configService: ConfigService) {
    this.encryptionKey =
      this.configService.get<string>('ENCRYPTION_KEY') ||
      'default-encryption-key-change-in-production';
  }

  /**
   * Encrypt data using the system encryption key
   * @param text Plaintext to encrypt
   * @returns Encrypted string
   */
  encrypt(text: string): string {
    try {
      if (!text) return text;
      return EncryptionUtils.encrypt(text, this.encryptionKey);
    } catch (error) {
      this.logger.error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data using the system encryption key
   * @param encryptedText Encrypted string
   * @returns Decrypted plaintext
   */
  decrypt(encryptedText: string): string {
    try {
      if (!encryptedText) return encryptedText;
      return EncryptionUtils.decrypt(encryptedText, this.encryptionKey);
    } catch (error) {
      this.logger.warn(`Decryption failed, returning original text: ${error instanceof Error ? error.message : String(error)}`);
      return encryptedText;
    }
  }

  /**
   * Check if a string is encrypted
   * @param text Text to check
   * @returns boolean
   */
  isEncrypted(text: string): boolean {
    return EncryptionUtils.isEncrypted(text);
  }
}
