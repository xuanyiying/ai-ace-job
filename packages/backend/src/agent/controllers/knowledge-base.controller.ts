/**
 * Knowledge Base Controller
 * Admin-only API for managing the RAG knowledge base
 * Supports PDF, Word, and TXT document uploads
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Logger,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../user/guards/jwt-auth.guard';
import { RAGService } from '../services/rag.service';
import {
  UploadDocumentDto,
  QueryKnowledgeBaseDto,
  DocumentResponseDto,
  QueryResponseDto,
  KnowledgeBaseStatsDto,
  DocumentCategory,
} from '../dto/knowledge-base.dto';
import { AdminGuard } from '@/user/guards/admin.guard';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@Controller('api/admin/knowledge-base')
@UseGuards(JwtAuthGuard, AdminGuard)
export class KnowledgeBaseController {
  private readonly logger = new Logger(KnowledgeBaseController.name);

  constructor(private ragService: RAGService) {}

  /**
   * Upload a document to the knowledge base
   * POST /api/admin/knowledge-base/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document to the knowledge base' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        category: {
          type: 'string',
          enum: Object.values(DocumentCategory),
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
        title: {
          type: 'string',
        },
      },
      required: ['file'],
    },
  })
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({
            fileType:
              /(pdf|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|plain)/,
          }),
        ],
      })
    )
    file: Express.Multer.File,
    @Body() dto: UploadDocumentDto
  ): Promise<DocumentResponseDto> {
    try {
      this.logger.log(`Uploading document: ${file.originalname}`);

      const result = await this.ragService.ingestDocument(
        file.buffer,
        file.originalname,
        {
          category: dto.category,
          tags: dto.tags,
          title: dto.title,
        }
      );

      return {
        id: result.documentId,
        title: result.title,
        fileName: result.fileName,
        documentType: result.documentType,
        category:
          (result.category as DocumentCategory) || DocumentCategory.GENERAL,
        tags: result.tags,
        chunkCount: result.chunkCount,
        wordCount: result.wordCount,
        createdAt: result.createdAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload document: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to upload document',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * List all documents in the knowledge base
   * GET /api/admin/knowledge-base/documents
   */
  @Get('documents')
  @ApiOperation({ summary: 'List all documents in the knowledge base' })
  async listDocuments(
    @Query('category') category?: DocumentCategory
  ): Promise<DocumentResponseDto[]> {
    try {
      const documents = await this.ragService.listDocuments(category);

      return documents.map((doc) => ({
        id: doc.documentId,
        title: doc.title,
        fileName: doc.fileName,
        documentType: doc.documentType,
        category:
          (doc.category as DocumentCategory) || DocumentCategory.GENERAL,
        tags: doc.tags,
        chunkCount: doc.chunkCount,
        wordCount: doc.wordCount,
        createdAt: doc.createdAt,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to list documents: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to list documents',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete a document from the knowledge base
   * DELETE /api/admin/knowledge-base/documents/:id
   */
  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document from the knowledge base' })
  async deleteDocument(
    @Param('id') id: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const deleted = await this.ragService.deleteDocument(id);

      if (!deleted) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: `Document with ID ${id} not found`,
          },
          HttpStatus.NOT_FOUND
        );
      }

      return {
        success: true,
        message: `Document ${id} deleted successfully`,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete document: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to delete document',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get knowledge base statistics
   * GET /api/admin/knowledge-base/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get knowledge base statistics' })
  async getStats(): Promise<KnowledgeBaseStatsDto> {
    try {
      const stats = await this.ragService.getStatistics();

      return {
        totalDocuments: stats.totalDocuments,
        totalChunks: stats.totalChunks,
        documentsByCategory: stats.documentsByCategory,
        lastUpdated: stats.lastUpdated,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get stats: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to get knowledge base statistics',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Query the knowledge base
   * POST /api/admin/knowledge-base/query
   */
  @Post('query')
  @ApiOperation({ summary: 'Query the knowledge base with RAG' })
  async queryKnowledgeBase(
    @Body() dto: QueryKnowledgeBaseDto
  ): Promise<QueryResponseDto> {
    try {
      const topK = dto.topK || 5;
      let results;

      if (dto.category) {
        results = await this.ragService.searchByCategory(
          dto.query,
          dto.category,
          topK
        );
      } else {
        results = await this.ragService.retrieve(dto.query, topK);
      }

      let answer: string | undefined;

      if (dto.generateAnswer) {
        const ragResult = await this.ragService.retrieveAndGenerate(
          dto.query,
          'admin',
          topK
        );
        answer = ragResult.answer;
      }

      return {
        results: results.map((r) => ({
          id: r.id,
          content: r.content,
          similarity: r.similarity,
          metadata: r.metadata,
        })),
        answer,
        totalResults: results.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to query knowledge base: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to query knowledge base',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Clear the entire knowledge base
   * DELETE /api/admin/knowledge-base/clear
   */
  @Delete('clear')
  @ApiOperation({ summary: 'Clear the entire knowledge base (dangerous!)' })
  async clearKnowledgeBase(): Promise<{ success: boolean; message: string }> {
    try {
      await this.ragService.clearKnowledgeBase();

      return {
        success: true,
        message: 'Knowledge base cleared successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to clear knowledge base: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to clear knowledge base',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
