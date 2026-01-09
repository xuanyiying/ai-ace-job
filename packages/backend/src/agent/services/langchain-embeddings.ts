import { Embeddings, EmbeddingsParams } from '@langchain/core/embeddings';
import { EmbeddingService } from './embedding.service';

/**
 * Project Embeddings Adapter for LangChain
 * Adapts our custom EmbeddingService to LangChain's Embeddings interface.
 */
export class ProjectEmbeddings extends Embeddings {
  constructor(
    params: EmbeddingsParams,
    private readonly embeddingService: EmbeddingService
  ) {
    super(params ?? {});
  }

  /**
   * Embed a batch of documents
   */
  async embedDocuments(documents: string[]): Promise<number[][]> {
    try {
      const results = await this.embeddingService.generateEmbeddings(documents);
      return results.map((r) => r.embedding);
    } catch (error) {
      console.error('Failed to embed documents in LangChain adapter:', error);
      throw error;
    }
  }

  /**
   * Embed a single query
   */
  async embedQuery(document: string): Promise<number[]> {
    try {
      return await this.embeddingService.generateEmbedding(document);
    } catch (error) {
      console.error('Failed to embed query in LangChain adapter:', error);
      throw error;
    }
  }
}
