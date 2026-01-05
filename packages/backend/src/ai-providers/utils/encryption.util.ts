import * as crypto from 'crypto';

/**
 * Encryption Utilities
 * Provides AES-256-GCM encryption and decryption functionality
 */
export class EncryptionUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly VERSION_PREFIX = 'v1:';

  /**
   * Format the encryption key to exactly 32 bytes
   * Requirements: Pad with zeros and truncate to 32 bytes
   * @param key The raw key string
   * @returns A 32-byte Buffer
   */
  public static formatKey(key: string): Buffer {
    const paddedKey = key.padEnd(32, '0').slice(0, 32);
    return Buffer.from(paddedKey, 'utf8');
  }

  /**
   * Encrypt a string using AES-256-GCM
   * @param text The plaintext to encrypt
   * @param key The 32-byte key (raw string)
   * @returns The encrypted string in format v1:iv:authTag:encrypted
   */
  public static encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const formattedKey = this.formatKey(key);
    const cipher = crypto.createCipheriv(this.ALGORITHM, formattedKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${this.VERSION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a string using AES-256-GCM
   * @param encryptedText The encrypted text in format v1:iv:authTag:encrypted or legacy format
   * @param key The 32-byte key (raw string)
   * @returns The decrypted plaintext
   */
  public static decrypt(encryptedText: string, key: string): string {
    let textToDecrypt = encryptedText;
    let hasVersionPrefix = false;

    if (encryptedText.startsWith(this.VERSION_PREFIX)) {
      textToDecrypt = encryptedText.substring(this.VERSION_PREFIX.length);
      hasVersionPrefix = true;
    }

    const parts = textToDecrypt.split(':');
    
    // Support legacy format (iv:authTag:encrypted) and new format (v1:iv:authTag:encrypted)
    if (parts.length !== 3) {
      return encryptedText; // Return as-is if not recognized
    }

    try {
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      const formattedKey = this.formatKey(key);

      const decipher = crypto.createDecipheriv(this.ALGORITHM, formattedKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // If decryption fails, it might be plaintext or wrong key
      return encryptedText;
    }
  }

  /**
   * Check if a string is likely encrypted
   * @param text The text to check
   * @returns True if it matches the encryption format
   */
  public static isEncrypted(text: string): boolean {
    if (text.startsWith(this.VERSION_PREFIX)) return true;
    const parts = text.split(':');
    return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
  }
}
