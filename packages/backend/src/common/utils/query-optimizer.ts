/**
 * Query Optimization Utilities
 * Provides best practices for database queries to improve performance
 * Requirement 10: System Performance & Availability
 */

/**
 * Pagination helper for large result sets
 * Prevents loading all records into memory
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getPaginationParams(options: PaginationOptions): {
  skip: number;
  take: number;
} {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20)); // Cap at 100 items per page

  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Select only necessary fields to reduce data transfer
 * Useful for list endpoints where full data is not needed
 */
export function getSelectFields(
  includeFields: string[]
): Record<string, boolean> {
  const select: Record<string, boolean> = {};
  for (const field of includeFields) {
    select[field] = true;
  }
  return select;
}

/**
 * Build efficient where clause for filtering
 * Avoids unnecessary conditions
 */
export function buildWhereClause(
  filters: Record<string, any>
): Record<string, any> {
  const where: Record<string, any> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      where[key] = value;
    }
  }

  return where;
}

/**
 * Batch operations to reduce database round trips
 * Useful for bulk updates or deletes
 */
export async function batchOperation<T>(
  items: T[],
  batchSize: number,
  operation: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await operation(batch);
  }
}

/**
 * Query result caching metadata
 * Helps determine if results should be cached
 */
export interface CacheMetadata {
  ttl: number; // Time to live in seconds
  key: string; // Cache key
  shouldCache: boolean; // Whether to cache this result
}

export function getCacheMetadata(
  operation: string,
  params: Record<string, any>
): CacheMetadata {
  // Determine cache TTL based on operation type
  const ttlMap: Record<string, number> = {
    list_resumes: 300, // 5 minutes
    list_jobs: 300, // 5 minutes
    get_templates: 3600, // 1 hour
    list_optimizations: 600, // 10 minutes
  };

  const ttl = ttlMap[operation] || 600;

  // Generate cache key
  const key = `${operation}:${JSON.stringify(params)}`;

  // Determine if should cache (don't cache if has user-specific filters)
  const shouldCache = !params.userId || operation.includes('template');

  return { ttl, key, shouldCache };
}

/**
 * Index recommendations for common queries
 * These should be created in database migrations
 */
export const INDEX_RECOMMENDATIONS = {
  resumes: [
    'CREATE INDEX idx_resumes_user_id ON resumes(user_id)',
    'CREATE INDEX idx_resumes_user_id_created_at ON resumes(user_id, created_at DESC)',
    'CREATE INDEX idx_resumes_is_primary ON resumes(is_primary)',
  ],
  jobs: [
    'CREATE INDEX idx_jobs_user_id ON jobs(user_id)',
    'CREATE INDEX idx_jobs_user_id_created_at ON jobs(user_id, created_at DESC)',
  ],
  optimizations: [
    'CREATE INDEX idx_optimizations_user_id ON optimizations(user_id)',
    'CREATE INDEX idx_optimizations_resume_id ON optimizations(resume_id)',
    'CREATE INDEX idx_optimizations_job_id ON optimizations(job_id)',
    'CREATE INDEX idx_optimizations_user_id_created_at ON optimizations(user_id, created_at DESC)',
  ],
  generated_pdfs: [
    'CREATE INDEX idx_generated_pdfs_user_id ON generated_pdfs(user_id)',
    'CREATE INDEX idx_generated_pdfs_expires_at ON generated_pdfs(expires_at)',
  ],
};

/**
 * Query performance monitoring
 * Logs slow queries for optimization
 */
export class QueryPerformanceMonitor {
  private static readonly SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second

  static async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      if (duration > this.SLOW_QUERY_THRESHOLD_MS) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Query failed: ${queryName} after ${duration}ms`, error);
      throw error;
    }
  }
}
