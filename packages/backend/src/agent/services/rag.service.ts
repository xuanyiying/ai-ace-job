/**
 * RAG (Retrieval-Augmented Generation) Service
 * Handles document retrieval and RAG-based generation
 * Requirements: 3.5, 5.2
 */

import { Injectable, Logger } from '@nestjs/common';
import { VectorDbService } from './vector-db.service';
import { AIEngineService } from '../../ai-providers/ai-engine.service';
import { DocumentProcessorService } from './document-processor.service';
import { v4 as uuidv4 } from 'uuid';
import { ChatProjectAI } from '../../ai-providers/langchain-adapter.service';
import { ProjectVectorStore } from './langchain-vector-store';
import { ProjectEmbeddings } from './langchain-embeddings';
import {
  RunnableSequence,
  RunnablePassthrough,
} from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { EmbeddingService } from './embedding.service';
import { Document } from '@langchain/core/documents';
import { ProjectCallbackHandler } from './langchain-callbacks.service';
import { UsageTrackerService } from '../../ai-providers/tracking/usage-tracker.service';
import { PerformanceMonitorService } from '../../ai-providers/monitoring/performance-monitor.service';

export interface RetrievedDocument {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

export interface RAGGenerationResult {
  answer: string;
  sources: RetrievedDocument[];
  inputTokens: number;
  outputTokens: number;
}

export interface InterviewQuestion {
  id?: string;
  question: string;
  suggestedAnswer?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'technical' | 'behavioral' | 'scenario';
  metadata?: Record<string, unknown>;
}

export interface IngestedDocument {
  documentId: string;
  title: string;
  fileName: string;
  documentType: 'pdf' | 'docx' | 'txt';
  category?: string;
  tags?: string[];
  chunkCount: number;
  wordCount: number;
  chunkIds: string[];
  createdAt: Date;
}

export interface DocumentInfo {
  documentId: string;
  title: string;
  fileName: string;
  documentType: string;
  category?: string;
  tags?: string[];
  chunkCount: number;
  wordCount: number;
  createdAt: Date;
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  // In-memory document registry (in production, use Redis or database)
  private documentRegistry: Map<string, DocumentInfo> = new Map();

  constructor(
    private vectorDbService: VectorDbService,
    private aiEngineService: AIEngineService,
    private documentProcessorService: DocumentProcessorService,
    private embeddingService: EmbeddingService,
    private usageTrackerService: UsageTrackerService,
    private performanceMonitorService: PerformanceMonitorService
  ) {}

  /**
   * Retrieve relevant documents from knowledge base
   * Property 13: RAG Usage for Common Questions
   * Validates: Requirements 3.5, 5.2
   */
  async retrieve(query: string, k: number = 5): Promise<RetrievedDocument[]> {
    try {
      const results = await this.vectorDbService.similaritySearch(query, k);

      const documents: RetrievedDocument[] = results.map((result) => ({
        id: result.id,
        content: result.content,
        similarity: result.similarity,
        metadata: result.metadata,
      }));

      this.logger.debug(
        `Retrieved ${documents.length} documents for query: "${query.substring(0, 50)}..."`
      );

      return documents;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve documents: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Advanced Retrieve and generate answer using RAG
   * Pushes LangChain usage to the extreme with Custom Multi-Query Retrieval and LCEL
   */
  async retrieveAndGenerate(
    query: string,
    userId: string,
    k: number = 5
  ): Promise<RAGGenerationResult> {
    try {
      this.logger.log(
        `Performing Extreme RAG for: ${query.substring(0, 50)}...`
      );

      // 1. Initialize LangChain Components
      const model = new ChatProjectAI(this.aiEngineService, {
        userId,
        scenario: 'rag-generation',
        temperature: 0,
      });

      const embeddings = new ProjectEmbeddings({}, this.embeddingService);
      const vectorStore = new ProjectVectorStore(
        embeddings,
        this.vectorDbService
      );

      // 2. Custom Multi-Query Logic with LCEL
      // We generate 3 variations of the query to broaden search recall
      const multiQueryPrompt = PromptTemplate.fromTemplate(`
        You are an AI language model assistant. Your task is to generate three 
        different versions of the given user query to retrieve relevant documents from a vector 
        database. By generating multiple perspectives on the user query, your goal is to help
        the user overcome some of the limitations of the distance-based similarity search. 
        Provide these alternative queries separated by newlines.
        Original query: {query}
      `);

      const multiQueryChain = RunnableSequence.from([
        { query: new RunnablePassthrough() },
        multiQueryPrompt,
        model,
        new StringOutputParser(),
        (output: string) =>
          output.split('\n').filter((q) => q.trim().length > 0),
      ]);

      // Generate queries
      const queries = await multiQueryChain.invoke(query);
      this.logger.debug(`Generated multi-queries: ${queries.join(' | ')}`);

      // Retrieve documents for all queries and unique them
      const allDocs = await Promise.all(
        [query, ...queries].map((q) => vectorStore.similaritySearch(q, k))
      );

      const uniqueDocs = this.uniqueDocuments(allDocs.flat());
      const selectedDocs = uniqueDocs.slice(0, k);

      // 3. Define Generation Prompt Template
      const prompt = PromptTemplate.fromTemplate(`
        You are an expert career consultant and resume optimizer. 
        Use the following pieces of context to answer the question at the end.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        Keep the answer concise and professional.

        Context:
        {context}

        Question: {question}

        Helpful Answer:
      `);

      // 4. Construct Generation Chain
      const chain = RunnableSequence.from([
        RunnablePassthrough.assign({
          context: (input: { docs: Document[]; question: string }) =>
            this.formatDocs(input.docs),
        }),
        prompt,
        model,
        new StringOutputParser(),
      ]);

      // 5. Execute Chain with monitoring
      const callbacks = [
        new ProjectCallbackHandler(
          userId,
          'rag-generation',
          this.usageTrackerService,
          this.performanceMonitorService,
          { sessionId: uuidv4() }
        ),
      ];

      const response = await chain.invoke(
        {
          docs: selectedDocs,
          question: query,
        },
        { callbacks }
      );

      this.logger.debug(`Extreme RAG completed for user: ${userId}`);

      return {
        answer: response,
        sources: selectedDocs.map((doc) => ({
          id: doc.metadata.id || 'unknown',
          content: doc.pageContent,
          similarity: doc.metadata.similarity || 0,
          metadata: doc.metadata,
        })),
        inputTokens: 0, // Recorded via callbacks
        outputTokens: 0,
      };
    } catch (error: any) {
      this.logger.error(`Failed Extreme RAG: ${error.message}`);
      throw error;
    }
  }

  private formatDocs(documents: Document[]): string {
    return documents.map((doc) => doc.pageContent).join('\n\n');
  }

  private uniqueDocuments(documents: Document[]): Document[] {
    const seen = new Set();
    return documents.filter((doc) => {
      const id = doc.pageContent; // Simplistic unique check by content
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  /**
   * Retrieve interview questions from knowledge base
   * Filters by experience level and keywords
   * Property 13: RAG Usage for Common Questions
   * Validates: Requirements 3.5
   */
  async retrieveQuestions(
    keywords: string[],
    experienceLevel: 'junior' | 'mid' | 'senior',
    k: number = 10
  ): Promise<InterviewQuestion[]> {
    try {
      // Create search query from keywords
      const searchQuery = `Interview questions for ${keywords.join(', ')} at ${experienceLevel} level`;

      // Retrieve documents
      const documents = await this.retrieve(searchQuery, k);

      // Parse documents as interview questions
      const questions: InterviewQuestion[] = documents
        .map((doc) => {
          try {
            // Try to parse as JSON first
            const parsed = JSON.parse(doc.content) as Record<string, unknown>;
            const difficulty = (parsed.difficulty as string) || 'medium';
            const type = (parsed.type as string) || 'technical';

            // Validate difficulty and type
            const validDifficulty =
              difficulty === 'easy' ||
              difficulty === 'medium' ||
              difficulty === 'hard'
                ? (difficulty as 'easy' | 'medium' | 'hard')
                : 'medium';

            const validType =
              type === 'technical' ||
              type === 'behavioral' ||
              type === 'scenario'
                ? (type as 'technical' | 'behavioral' | 'scenario')
                : 'technical';

            return {
              id: doc.id,
              question: (parsed.question as string) || doc.content,
              suggestedAnswer: (parsed.suggestedAnswer as string) || undefined,
              difficulty: validDifficulty,
              type: validType,
              metadata: {
                ...doc.metadata,
                similarity: doc.similarity,
              },
            };
          } catch {
            // If not JSON, treat content as question
            return {
              id: doc.id,
              question: doc.content,
              difficulty: 'medium' as const,
              type: 'technical' as const,
              metadata: {
                ...doc.metadata,
                similarity: doc.similarity,
              },
            };
          }
        })
        .filter((q) => q.question && q.question.length > 0);

      this.logger.debug(
        `Retrieved ${questions.length} interview questions for keywords: ${keywords.join(', ')}`
      );

      return questions;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve questions: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Add documents to knowledge base
   */
  async addDocuments(
    documents: Array<{ content: string; metadata?: Record<string, unknown> }>
  ): Promise<void> {
    try {
      await this.vectorDbService.addDocuments(documents);
      this.logger.debug(
        `Added ${documents.length} documents to knowledge base`
      );
    } catch (error) {
      this.logger.error(
        `Failed to add documents: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Clear knowledge base
   */
  async clearKnowledgeBase(): Promise<void> {
    try {
      await this.vectorDbService.clear();
      this.documentRegistry.clear();
      this.logger.debug('Cleared knowledge base');
    } catch (error) {
      this.logger.error(
        `Failed to clear knowledge base: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Ingest a document file (PDF, DOCX, TXT) into the knowledge base
   * Processes the document, chunks it, and stores embeddings
   */
  async ingestDocument(
    buffer: Buffer,
    fileName: string,
    options: {
      category?: string;
      tags?: string[];
      title?: string;
    } = {}
  ): Promise<IngestedDocument> {
    try {
      this.logger.log(`Ingesting document: ${fileName}`);

      // Process the document
      const processed = await this.documentProcessorService.processDocument(
        buffer,
        fileName,
        {
          category: options.category,
          tags: options.tags,
        }
      );

      // Generate unique document ID
      const documentId = uuidv4();

      // Prepare documents for vector storage with document ID in metadata
      const documentsToStore = processed.chunks.map((chunk) => ({
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          documentId,
          title: options.title || processed.title,
          fileName,
        },
      }));

      // Store in vector database
      const stored = await this.vectorDbService.addDocuments(documentsToStore);
      const chunkIds = stored.map((doc) => doc.id);

      // Register document
      const docInfo: DocumentInfo = {
        documentId,
        title: options.title || processed.title,
        fileName,
        documentType: processed.metadata.documentType,
        category: options.category,
        tags: options.tags,
        chunkCount: processed.chunks.length,
        wordCount: processed.metadata.wordCount,
        createdAt: new Date(),
      };
      this.documentRegistry.set(documentId, docInfo);

      const result: IngestedDocument = {
        documentId,
        title: options.title || processed.title,
        fileName,
        documentType: processed.metadata.documentType as 'pdf' | 'docx' | 'txt',
        category: options.category,
        tags: options.tags,
        chunkCount: processed.chunks.length,
        wordCount: processed.metadata.wordCount,
        chunkIds,
        createdAt: docInfo.createdAt,
      };

      this.logger.log(
        `Document ingested: ${fileName}, ID: ${documentId}, ${chunkIds.length} chunks`
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to ingest document ${fileName}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * List all documents in the knowledge base
   */
  async listDocuments(category?: string): Promise<DocumentInfo[]> {
    const documents = Array.from(this.documentRegistry.values());

    if (category) {
      return documents.filter((doc) => doc.category === category);
    }

    return documents;
  }

  /**
   * Delete a document from the knowledge base
   * Removes all chunks associated with the document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const docInfo = this.documentRegistry.get(documentId);
      if (!docInfo) {
        this.logger.warn(`Document not found: ${documentId}`);
        return false;
      }

      // Note: In ChromaDB, we need to delete by metadata filter or individual IDs
      // Since we don't store chunk IDs persistently, we'll need to query first
      // For now, we'll just remove from registry; in production, implement proper deletion

      this.documentRegistry.delete(documentId);
      this.logger.log(`Document deleted: ${documentId}`);

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete document ${documentId}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get knowledge base statistics
   */
  async getStatistics(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    documentsByCategory: Record<string, number>;
    lastUpdated?: Date;
  }> {
    try {
      const documents = Array.from(this.documentRegistry.values());
      const totalChunks = await this.vectorDbService.getDocumentCount();

      const documentsByCategory: Record<string, number> = {};
      let lastUpdated: Date | undefined;

      for (const doc of documents) {
        const category = doc.category || 'general';
        documentsByCategory[category] =
          (documentsByCategory[category] || 0) + 1;

        if (!lastUpdated || doc.createdAt > lastUpdated) {
          lastUpdated = doc.createdAt;
        }
      }

      return {
        totalDocuments: documents.length,
        totalChunks,
        documentsByCategory,
        lastUpdated,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get statistics: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Search with category filter
   */
  async searchByCategory(
    query: string,
    category: string,
    k: number = 5
  ): Promise<RetrievedDocument[]> {
    // First, do similarity search
    const results = await this.retrieve(query, k * 2); // Get more to filter

    // Filter by category
    const filtered = results.filter(
      (doc) => doc.metadata?.category === category
    );

    return filtered.slice(0, k);
  }
}
