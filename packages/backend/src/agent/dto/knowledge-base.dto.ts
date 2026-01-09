/**
 * Knowledge Base DTOs
 * Data Transfer Objects for knowledge base operations
 */

import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentCategory {
  INTERVIEW_QUESTIONS = 'interview_questions',
  CAREER_ADVICE = 'career_advice',
  INDUSTRY_KNOWLEDGE = 'industry_knowledge',
  RESUME_TIPS = 'resume_tips',
  GENERAL = 'general',
}

/**
 * DTO for document upload
 */
export class UploadDocumentDto {
  @ApiPropertyOptional({
    description: 'Category for the document',
    enum: DocumentCategory,
    default: DocumentCategory.GENERAL,
  })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({
    description: 'Tags for the document',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description:
      'Custom title for the document (uses filename if not provided)',
  })
  @IsOptional()
  @IsString()
  title?: string;
}

/**
 * DTO for querying the knowledge base
 */
export class QueryKnowledgeBaseDto {
  @ApiProperty({
    description: 'The query text to search for',
    example: 'How to prepare for a technical interview?',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    default: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  topK?: number;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: DocumentCategory,
  })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({
    description: 'Whether to generate an answer using RAG',
    default: false,
  })
  @IsOptional()
  generateAnswer?: boolean;
}

/**
 * Response DTO for document info
 */
export class DocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  id: string;

  @ApiProperty({ description: 'Document title' })
  title: string;

  @ApiProperty({ description: 'Original file name' })
  fileName: string;

  @ApiProperty({ description: 'Document type', enum: ['pdf', 'docx', 'txt'] })
  documentType: string;

  @ApiProperty({ description: 'Document category', enum: DocumentCategory })
  category: DocumentCategory;

  @ApiPropertyOptional({ description: 'Tags associated with the document' })
  tags?: string[];

  @ApiProperty({ description: 'Number of chunks' })
  chunkCount: number;

  @ApiProperty({ description: 'Word count' })
  wordCount: number;

  @ApiProperty({ description: 'Upload date' })
  createdAt: Date;
}

/**
 * Response DTO for knowledge base query
 */
export class QueryResponseDto {
  @ApiProperty({
    description: 'Retrieved documents',
    type: [Object],
  })
  results: Array<{
    id: string;
    content: string;
    similarity: number;
    metadata?: Record<string, unknown>;
  }>;

  @ApiPropertyOptional({
    description: 'Generated answer (if generateAnswer was true)',
  })
  answer?: string;

  @ApiProperty({ description: 'Total results found' })
  totalResults: number;
}

/**
 * Response DTO for knowledge base statistics
 */
export class KnowledgeBaseStatsDto {
  @ApiProperty({ description: 'Total number of documents' })
  totalDocuments: number;

  @ApiProperty({ description: 'Total number of chunks' })
  totalChunks: number;

  @ApiProperty({ description: 'Documents by category' })
  documentsByCategory: Record<string, number>;

  @ApiProperty({ description: 'Last update date' })
  lastUpdated?: Date;
}
