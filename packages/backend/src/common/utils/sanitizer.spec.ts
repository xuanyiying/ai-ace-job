import { Sanitizer } from './sanitizer';

describe('Sanitizer', () => {
  describe('sanitizeString', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const result = Sanitizer.sanitizeString(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should remove null bytes', () => {
      const input = 'hello\0world';
      const result = Sanitizer.sanitizeString(input);
      expect(result).not.toContain('\0');
      expect(result).toBe('helloworld');
    });

    it('should escape quotes', () => {
      const input = 'He said "hello"';
      const result = Sanitizer.sanitizeString(input);
      expect(result).toContain('&quot;');
    });

    it('should handle empty strings', () => {
      const result = Sanitizer.sanitizeString('');
      expect(result).toBe('');
    });

    it('should handle null input', () => {
      const result = Sanitizer.sanitizeString(null as any);
      expect(result).toBeNull();
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize valid email', () => {
      const email = 'User@Example.COM';
      const result = Sanitizer.sanitizeEmail(email);
      expect(result).toBe('user@example.com');
    });

    it('should reject email with HTML tags', () => {
      const email = '<script>@example.com';
      expect(() => Sanitizer.sanitizeEmail(email)).toThrow();
    });

    it('should reject email with semicolons', () => {
      const email = 'user;@example.com';
      expect(() => Sanitizer.sanitizeEmail(email)).toThrow();
    });

    it('should trim whitespace', () => {
      const email = '  user@example.com  ';
      const result = Sanitizer.sanitizeEmail(email);
      expect(result).toBe('user@example.com');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTPS URL', () => {
      const url = 'https://example.com/path';
      const result = Sanitizer.sanitizeUrl(url);
      expect(result).toBe(url);
    });

    it('should accept valid HTTP URL', () => {
      const url = 'http://example.com/path';
      const result = Sanitizer.sanitizeUrl(url);
      expect(result).toBe(url);
    });

    it('should reject javascript protocol', () => {
      const url = 'javascript:alert("XSS")';
      expect(() => Sanitizer.sanitizeUrl(url)).toThrow();
    });

    it('should reject data protocol', () => {
      const url = 'data:text/html,<script>alert("XSS")</script>';
      expect(() => Sanitizer.sanitizeUrl(url)).toThrow();
    });

    it('should reject invalid URL', () => {
      const url = 'not a url';
      expect(() => Sanitizer.sanitizeUrl(url)).toThrow();
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      const filename = '../../../etc/passwd';
      const result = Sanitizer.sanitizeFilename(filename);
      expect(result).not.toContain('..');
    });

    it('should remove special characters', () => {
      const filename = 'file<script>.pdf';
      const result = Sanitizer.sanitizeFilename(filename);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should preserve dots and hyphens', () => {
      const filename = 'my-resume.pdf';
      const result = Sanitizer.sanitizeFilename(filename);
      expect(result).toContain('my-resume.pdf');
    });

    it('should limit filename length', () => {
      const filename = 'a'.repeat(300) + '.pdf';
      const result = Sanitizer.sanitizeFilename(filename);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should replace spaces with underscores', () => {
      const filename = 'my resume.pdf';
      const result = Sanitizer.sanitizeFilename(filename);
      expect(result).toContain('_');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string properties', () => {
      const obj = {
        name: '<script>alert("XSS")</script>',
        email: 'user@example.com',
      };
      const result = Sanitizer.sanitizeObject(obj);
      expect(result.name).not.toContain('<script>');
      expect(result.email).toBe('user@example.com');
    });

    it('should sanitize nested objects', () => {
      const obj = {
        user: {
          name: '<img src=x onerror="alert(1)">',
        },
      };
      const result = Sanitizer.sanitizeObject(obj);
      expect(result.user.name).not.toContain('<img');
    });

    it('should sanitize array items', () => {
      const obj = {
        tags: ['<script>tag1</script>', 'tag2'],
      };
      const result = Sanitizer.sanitizeObject(obj);
      expect(result.tags[0]).not.toContain('<script>');
    });

    it('should preserve non-string values', () => {
      const obj = {
        count: 42,
        active: true,
        data: null,
      };
      const result = Sanitizer.sanitizeObject(obj);
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.data).toBeNull();
    });
  });
});
