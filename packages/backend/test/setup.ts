/**
 * Jest setup file for global test configuration
 * Polyfills for Node.js test environment
 */

// Polyfill for File API (required by undici/cheerio in tests)
if (typeof global.File === 'undefined') {
  global.File = class File {
    constructor(
      public parts: BlobPart[],
      public name: string,
      public options?: FilePropertyBag
    ) {}
  } as any;
}

// Polyfill for FormData if needed
if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
    private data: Map<string, any> = new Map();

    append(key: string, value: any) {
      this.data.set(key, value);
    }

    get(key: string) {
      return this.data.get(key);
    }
  } as any;
}
