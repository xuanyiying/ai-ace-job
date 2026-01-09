import { VectorStore } from '@langchain/core/vectorstores';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { VectorDbService } from './vector-db.service';

/**
 * Project Vector Store Adapter for LangChain
 * Adapts our custom VectorDbService to LangChain's VectorStore interface.
 */
export class ProjectVectorStore extends VectorStore {
  _vectorstoreType(): string {
    return 'project-vector-store';
  }

  constructor(
    public readonly embeddings: Embeddings,
    private readonly vectorDb: VectorDbService
  ) {
    super(embeddings, {});
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Document[]): Promise<void | string[]> {
    const docs = documents.map((doc) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
    }));
    const results = await this.vectorDb.addDocuments(docs);
    return results.map((r) => r.id);
  }

  /**
   * Add vectors directly (not supported by our current VectorDbService easily)
   */
  async addVectors(
    vectors: number[][],
    documents: Document[]
  ): Promise<void | string[]> {
    throw new Error('addVectors not supported. Use addDocuments.');
  }

  /**
   * Perform similarity search
   */
  async similaritySearch(
    query: string,
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<Document[]> {
    const results = await this.vectorDb.similaritySearch(query, k);

    let filteredResults = results;
    if (filter) {
      filteredResults = results.filter((r) => {
        return Object.entries(filter).every(
          ([key, value]) => r.metadata?.[key] === value
        );
      });
    }

    return filteredResults.map(
      (r) =>
        new Document({
          pageContent: r.content,
          metadata: { ...r.metadata, score: r.similarity },
        })
    );
  }

  /**
   * Similarity search with score
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<[Document, number][]> {
    const results = await this.vectorDb.similaritySearch(query, k);

    let filteredResults = results;
    if (filter) {
      filteredResults = results.filter((r) => {
        return Object.entries(filter).every(
          ([key, value]) => r.metadata?.[key] === value
        );
      });
    }

    return filteredResults.map((r) => [
      new Document({
        pageContent: r.content,
        metadata: { ...r.metadata },
      }),
      r.similarity,
    ]);
  }

  /**
   * Search specifically by vector
   */
  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: Record<string, any>
  ): Promise<[Document, number][]> {
    const results = await this.vectorDb.similaritySearchByVector(query, k);

    let filteredResults = results;
    if (filter) {
      filteredResults = results.filter((r) => {
        return Object.entries(filter).every(
          ([key, value]) => r.metadata?.[key] === value
        );
      });
    }

    return filteredResults.map((r) => [
      new Document({
        pageContent: r.content,
        metadata: { ...r.metadata, id: r.id },
      }),
      r.similarity,
    ]);
  }

  /**
   * Delete vectors from store
   */
  async delete(params: {
    ids?: string[];
    filter?: Record<string, any>;
  }): Promise<void> {
    if (params.ids) {
      for (const id of params.ids) {
        await this.vectorDb.deleteDocument(id);
      }
    } else if (params.filter) {
      // Bulk deletion by filter is not directly supported by current VectorDbService.
      // In production, we'd need to query IDs first then delete them.
      throw new Error('Delete by filter not yet implemented in adapter.');
    }
  }

  /**
   * static fromTexts implementation
   */
  static async fromTexts(
    texts: string[],
    metadatas: object[] | object,
    embeddings: Embeddings,
    dbConfig: { vectorDb: VectorDbService }
  ): Promise<ProjectVectorStore> {
    const docs = texts.map((text, i) => {
      const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
      return new Document({ pageContent: text, metadata });
    });
    const store = new ProjectVectorStore(embeddings, dbConfig.vectorDb);
    await store.addDocuments(docs);
    return store;
  }

  /**
   * static fromDocuments implementation
   */
  static async fromDocuments(
    documents: Document[],
    embeddings: Embeddings,
    dbConfig: { vectorDb: VectorDbService }
  ): Promise<ProjectVectorStore> {
    const store = new ProjectVectorStore(embeddings, dbConfig.vectorDb);
    await store.addDocuments(documents);
    return store;
  }
}
