/**
 * Vector Database Service
 * Manages vector storage and similarity search using ChromaDB
 * Requirements: 9.2, 9.3
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, Collection } from 'chromadb';
import { EmbeddingService } from './embedding.service';
import { v4 as uuidv4 } from 'uuid';

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimilaritySearchResult {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  similarity: number;
}

@Injectable()
export class VectorDbService implements OnModuleInit {
  private readonly logger = new Logger(VectorDbService.name);
  private client: ChromaClient;
  private collection: Collection;
  private readonly collectionName = 'resume-optimizer-vectors';

  constructor(
    private configService: ConfigService,
    private embeddingService: EmbeddingService
  ) {}

  async onModuleInit() {
    try {
      const chromaUrl = this.configService.get<string>(
        'CHROMA_DB_URL',
        'http://chromadb:8000'
      );
      this.client = new ChromaClient({ path: chromaUrl });

      // Initialize collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
      });

      this.logger.log(
        `Connected to ChromaDB at ${chromaUrl}, collection: ${this.collectionName}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to connect to ChromaDB: ${error instanceof Error ? error.message : String(error)}`
      );
      // We don't throw here to allow app to start even if vector DB is temporarily modifying
    }
  }

  /**
   * Add documents to vector database
   * Generates embeddings and stores them
   * Property 33: Embedding Storage Completeness
   * Validates: Requirements 9.2
   */
  async addDocuments(
    documents: Array<{ content: string; metadata?: Record<string, unknown> }>
  ): Promise<VectorDocument[]> {
    try {
      const results: VectorDocument[] = [];
      const ids: string[] = [];
      const embeddings: number[][] = [];
      const metadatas: Record<string, any>[] = [];
      const contents: string[] = [];
      const now = new Date();

      for (const doc of documents) {
        // Generate embedding for document
        const embedding = await this.embeddingService.generateEmbedding(
          doc.content
        );

        const id = uuidv4();

        // Prepare data for batch insertion
        ids.push(id);
        embeddings.push(embedding);

        // Add timestamps to metadata
        const metadata = {
          ...(doc.metadata || {}),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        metadatas.push(metadata);

        contents.push(doc.content);

        results.push({
          id,
          content: doc.content,
          embedding,
          metadata: doc.metadata || {},
          createdAt: now,
          updatedAt: now,
        });
      }

      if (ids.length > 0) {
        await this.collection.add({
          ids,
          embeddings,
          metadatas,
          documents: contents,
        });

        this.logger.debug(`Added ${ids.length} documents to vector database`);
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to add documents: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Perform similarity search using ChromaDB
   * Property 34: Top-K Retrieval Accuracy
   * Property 35: Similarity Score Inclusion
   * Validates: Requirements 9.3, 9.5
   */
  async similaritySearch(
    query: string,
    k: number = 5
  ): Promise<SimilaritySearchResult[]> {
    try {
      // Generate embedding for query
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(query);

      // Perform search
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: k,
      });

      const searchResults: SimilaritySearchResult[] = [];

      if (results.ids && results.ids.length > 0 && results.ids[0]) {
        const resultIds = results.ids[0];
        const resultDistances = results.distances?.[0] || [];
        const resultDocuments = results.documents?.[0] || [];
        const resultMetadatas = results.metadatas?.[0] || [];

        for (let i = 0; i < resultIds.length; i++) {
          // Chroma returns distance (default L2), convert to similarity likely
          // But usually we just return what we get or normalize.
          // The previous implementation used: similarity = 1 / (1 + distance) for L2
          const distance = resultDistances[i] ?? 0;
          const similarity = 1 / (1 + distance);

          searchResults.push({
            id: resultIds[i],
            content: resultDocuments[i] || '',
            metadata: resultMetadatas[i] || {},
            similarity,
          });
        }
      }

      this.logger.debug(
        `Similarity search completed: found ${searchResults.length} results for query`
      );

      return searchResults;
    } catch (error) {
      this.logger.error(
        `Failed to perform similarity search: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<VectorDocument | null> {
    try {
      const result = await this.collection.get({
        ids: [id],
        include: ['embeddings', 'metadatas', 'documents'] as any,
      });

      if (!result.ids || result.ids.length === 0) {
        return null;
      }

      const metadata = result.metadatas?.[0] || {};
      const createdAtStr = metadata.createdAt as string;
      const updatedAtStr = metadata.updatedAt as string;

      return {
        id: result.ids[0],
        content: result.documents?.[0] || '',
        embedding: result.embeddings?.[0] || [],
        metadata,
        createdAt: createdAtStr ? new Date(createdAtStr) : new Date(),
        updatedAt: updatedAtStr ? new Date(updatedAtStr) : new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get document: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Delete document by ID
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.collection.delete({
        ids: [id],
      });

      this.logger.debug(`Deleted document from vector database: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete document: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    id: string,
    metadata: Record<string, unknown>
  ): Promise<VectorDocument> {
    try {
      // Need to fetch existing data to preserve content and embedding if we only update metadata
      // Chroma update requires id.

      const existing = await this.getDocument(id);
      if (!existing) {
        throw new Error(`Document with id ${id} not found`);
      }

      const now = new Date();
      const newMetadata = {
        ...existing.metadata,
        ...metadata,
        updatedAt: now.toISOString(),
      };

      await this.collection.update({
        ids: [id],
        metadatas: [newMetadata],
      });

      return {
        ...existing,
        metadata: newMetadata,
        updatedAt: now,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update document metadata: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  /**
   * Clear all documents from vector database
   */
  async clear(): Promise<void> {
    try {
      // Chroma doesn't have a direct clear, typically we delete the collection and recreate, or delete all items?
      // Delete all is cleaner.
      // We can also just get all IDs and delete.
      const peek = await this.collection.peek({ limit: 10000 }); // limit?
      if (peek.ids && peek.ids.length > 0) {
        await this.collection.delete({
          ids: peek.ids,
        });
      }
      this.logger.debug('Cleared all documents from vector database');
    } catch (error) {
      // If getting all IDs is too heavy, we can delete collection and recreate
      try {
        await this.client.deleteCollection({ name: this.collectionName });
        this.collection = await this.client.createCollection({
          name: this.collectionName,
        });
        this.logger.debug('Recreated collection to clear documents');
      } catch (innerError) {
        this.logger.error(
          `Failed to clear vector database: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    }
  }

  /**
   * Get total document count
   */
  async getDocumentCount(): Promise<number> {
    try {
      return await this.collection.count();
    } catch (error) {
      this.logger.error(
        `Failed to get document count: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }
}
