/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */
export class Sanitizer {
  /**
   * Sanitize string input to prevent XSS attacks
   * Removes or escapes potentially dangerous HTML/JavaScript
   */
  static sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');

    // Escape HTML special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = { ...obj };

    for (const key in sanitized) {
      if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
        const value = sanitized[key];

        if (typeof value === 'string') {
          (sanitized[key] as any) = this.sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            (sanitized[key] as any) = value.map((item: any) =>
              typeof item === 'string' ? this.sanitizeString(item) : item
            );
          } else {
            (sanitized[key] as any) = this.sanitizeObject(value);
          }
        }
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return email;
    }

    // Basic email validation and sanitization
    const sanitized = email.trim().toLowerCase();

    // Remove any HTML/script tags
    if (
      sanitized.includes('<') ||
      sanitized.includes('>') ||
      sanitized.includes(';')
    ) {
      throw new Error('Invalid email format');
    }

    return sanitized;
  }

  /**
   * Sanitize URL to prevent open redirect attacks
   */
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return url;
    }

    try {
      const urlObj = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid URL protocol');
      }
      return urlObj.toString();
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Remove potentially dangerous characters from filenames
   */
  static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return filename;
    }

    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');

    // Remove special characters except dots and hyphens
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Limit length
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255);
    }

    return sanitized;
  }
}
