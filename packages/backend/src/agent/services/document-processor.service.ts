/**
 * Document Processor Service
 * Handles parsing of PDF and Word documents for RAG ingestion
 * Requirements: Document import for knowledge base
 */

import { Injectable, Logger } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

export interface DocumentChunk {
  content: string;
  metadata: {
    chunkIndex: number;
    pageNumber?: number;
    source: string;
    documentType: 'pdf' | 'docx' | 'txt';
    category?: string;
    tags?: string[];
  };
}

export interface ProcessedDocument {
  title: string;
  content: string;
  chunks: DocumentChunk[];
  metadata: {
    fileName: string;
    fileSize: number;
    pageCount?: number;
    wordCount: number;
    documentType: 'pdf' | 'docx' | 'txt';
    processedAt: Date;
  };
}

export interface DocumentProcessorOptions {
  chunkSize?: number; // Target chunk size in characters
  chunkOverlap?: number; // Overlap between chunks
  category?: string;
  tags?: string[];
}

const DEFAULT_OPTIONS: Required<
  Omit<DocumentProcessorOptions, 'category' | 'tags'>
> = {
  chunkSize: 1500, // ~375 tokens
  chunkOverlap: 200,
};

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  /**
   * Process a PDF file and extract text with chunking
   */
  async processPdf(
    buffer: Buffer,
    fileName: string,
    options: DocumentProcessorOptions = {}
  ): Promise<ProcessedDocument> {
    try {
      this.logger.log(`Processing PDF: ${fileName}`);

      const data = await pdfParse(buffer);
      const text = data.text;

      const chunks = this.chunkText(text, fileName, 'pdf', options);

      const processed: ProcessedDocument = {
        title: this.extractTitle(fileName, text),
        content: text,
        chunks,
        metadata: {
          fileName,
          fileSize: buffer.length,
          pageCount: data.numpages,
          wordCount: this.countWords(text),
          documentType: 'pdf',
          processedAt: new Date(),
        },
      };

      this.logger.log(
        `PDF processed: ${fileName}, ${chunks.length} chunks, ${processed.metadata.wordCount} words`
      );

      return processed;
    } catch (error) {
      this.logger.error(
        `Failed to process PDF ${fileName}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Process a Word document (.docx) and extract text with chunking
   */
  async processDocx(
    buffer: Buffer,
    fileName: string,
    options: DocumentProcessorOptions = {}
  ): Promise<ProcessedDocument> {
    try {
      this.logger.log(`Processing DOCX: ${fileName}`);

      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;

      if (result.messages.length > 0) {
        this.logger.warn(
          `DOCX warnings for ${fileName}: ${JSON.stringify(result.messages)}`
        );
      }

      const chunks = this.chunkText(text, fileName, 'docx', options);

      const processed: ProcessedDocument = {
        title: this.extractTitle(fileName, text),
        content: text,
        chunks,
        metadata: {
          fileName,
          fileSize: buffer.length,
          wordCount: this.countWords(text),
          documentType: 'docx',
          processedAt: new Date(),
        },
      };

      this.logger.log(
        `DOCX processed: ${fileName}, ${chunks.length} chunks, ${processed.metadata.wordCount} words`
      );

      return processed;
    } catch (error) {
      this.logger.error(
        `Failed to process DOCX ${fileName}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Process plain text content
   */
  processText(
    content: string,
    fileName: string,
    options: DocumentProcessorOptions = {}
  ): ProcessedDocument {
    const chunks = this.chunkText(content, fileName, 'txt', options);

    return {
      title: this.extractTitle(fileName, content),
      content,
      chunks,
      metadata: {
        fileName,
        fileSize: Buffer.byteLength(content, 'utf8'),
        wordCount: this.countWords(content),
        documentType: 'txt',
        processedAt: new Date(),
      },
    };
  }

  /**
   * Process any supported document type based on file extension
   */
  async processDocument(
    buffer: Buffer,
    fileName: string,
    options: DocumentProcessorOptions = {}
  ): Promise<ProcessedDocument> {
    const extension = fileName.toLowerCase().split('.').pop();

    switch (extension) {
      case 'pdf':
        return this.processPdf(buffer, fileName, options);
      case 'docx':
        return this.processDocx(buffer, fileName, options);
      case 'txt':
        return this.processText(buffer.toString('utf8'), fileName, options);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  /**
   * Chunk text into smaller pieces for embedding
   * Uses paragraph-aware chunking with overlap
   */
  private chunkText(
    text: string,
    source: string,
    documentType: 'pdf' | 'docx' | 'txt',
    options: DocumentProcessorOptions = {}
  ): DocumentChunk[] {
    const chunkSize = options.chunkSize || DEFAULT_OPTIONS.chunkSize;
    const chunkOverlap = options.chunkOverlap || DEFAULT_OPTIONS.chunkOverlap;

    // Clean and normalize text
    const cleanedText = this.cleanText(text);

    // Split by paragraphs first
    const paragraphs = cleanedText
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 0);

    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed chunk size
      if (
        currentChunk.length + paragraph.length > chunkSize &&
        currentChunk.length > 0
      ) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            chunkIndex,
            source,
            documentType,
            category: options.category,
            tags: options.tags,
          },
        });
        chunkIndex++;

        // Start new chunk with overlap from previous chunk
        const overlapText = currentChunk.slice(-chunkOverlap);
        currentChunk = overlapText + '\n\n' + paragraph;
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Don't forget the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          chunkIndex,
          source,
          documentType,
          category: options.category,
          tags: options.tags,
        },
      });
    }

    return chunks;
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return (
      text
        // Normalize whitespace
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Remove excessive whitespace
        .replace(/[ \t]+/g, ' ')
        // Remove excessive newlines (more than 2)
        .replace(/\n{3,}/g, '\n\n')
        // Trim lines
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .trim()
    );
  }

  /**
   * Extract title from file name or first line of content
   */
  private extractTitle(fileName: string, content: string): string {
    // Try to get title from first non-empty line if it looks like a title
    const firstLine = content
      .split('\n')
      .find((line) => line.trim().length > 0);

    if (firstLine && firstLine.length < 100 && !firstLine.includes('.')) {
      return firstLine.trim();
    }

    // Fall back to file name without extension
    return fileName.replace(/\.[^.]+$/, '');
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return ['pdf', 'docx', 'txt'];
  }

  /**
   * Validate file type
   */
  isSupported(fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    return this.getSupportedExtensions().includes(extension || '');
  }
}
