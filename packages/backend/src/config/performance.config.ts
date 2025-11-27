/**
 * Performance Configuration
 * Requirement 10: System Performance & Availability
 *
 * Configures caching, compression, and optimization settings
 */

export interface PerformanceConfig {
  // Cache settings
  cache: {
    enabled: boolean;
    ttl: number; // Default TTL in seconds
    maxSize: number; // Max cache size in MB
  };

  // Compression settings
  compression: {
    enabled: boolean;
    level: number; // 1-9, higher = more compression but slower
    threshold: number; // Minimum response size to compress (bytes)
  };

  // Database settings
  database: {
    connectionPoolSize: number;
    queryTimeout: number; // milliseconds
    enableSlowQueryLogging: boolean;
    slowQueryThreshold: number; // milliseconds
  };

  // API settings
  api: {
    requestTimeout: number; // milliseconds
    maxRequestSize: string; // e.g., '10mb'
    enableResponseCaching: boolean;
  };

  // AI/External service settings
  externalServices: {
    requestTimeout: number; // milliseconds
    retryAttempts: number;
    retryDelay: number; // milliseconds
    circuitBreakerThreshold: number; // failure count before opening circuit
  };
}

export const getPerformanceConfig = (env: string): PerformanceConfig => {
  const isDevelopment = env === 'development';
  const isProduction = env === 'production';

  return {
    cache: {
      enabled: !isDevelopment,
      ttl: isProduction ? 3600 : 300, // 1 hour in prod, 5 min in dev
      maxSize: isProduction ? 500 : 100, // MB
    },

    compression: {
      enabled: isProduction,
      level: isProduction ? 6 : 3, // Balance between compression and speed
      threshold: 1024, // Only compress responses > 1KB
    },

    database: {
      connectionPoolSize: isProduction ? 20 : 5,
      queryTimeout: isProduction ? 30000 : 60000, // 30s in prod, 60s in dev
      enableSlowQueryLogging: true,
      slowQueryThreshold: isProduction ? 1000 : 5000, // 1s in prod, 5s in dev
    },

    api: {
      requestTimeout: isProduction ? 30000 : 60000, // 30s in prod, 60s in dev
      maxRequestSize: '10mb',
      enableResponseCaching: isProduction,
    },

    externalServices: {
      requestTimeout: isProduction ? 30000 : 60000,
      retryAttempts: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
    },
  };
};

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitoringConfig {
  enabled: boolean;
  metricsInterval: number; // milliseconds
  slowQueryThreshold: number; // milliseconds
  slowApiThreshold: number; // milliseconds
}

export const getPerformanceMonitoringConfig = (
  env: string
): PerformanceMonitoringConfig => {
  return {
    enabled: true,
    metricsInterval: 60000, // 1 minute
    slowQueryThreshold: env === 'production' ? 1000 : 5000,
    slowApiThreshold: env === 'production' ? 2000 : 10000,
  };
};

/**
 * Cache key patterns for different operations
 */
export const CACHE_KEYS = {
  // Resume caching
  RESUME_PARSE: 'resume:parse:',
  RESUME_LIST: 'resume:list:',
  RESUME_GET: 'resume:get:',

  // Job caching
  JOB_PARSE: 'job:parse:',
  JOB_LIST: 'job:list:',
  JOB_GET: 'job:get:',

  // Optimization caching
  OPTIMIZATION_MATCH_SCORE: 'optimization:match_score:',
  OPTIMIZATION_SUGGESTIONS: 'optimization:suggestions:',

  // Template caching
  TEMPLATE_LIST: 'template:list',
  TEMPLATE_GET: 'template:get:',

  // AI response caching
  AI_RESPONSE: 'ai:response:',
};

/**
 * Default cache TTLs for different operations
 */
export const CACHE_TTLS = {
  // Short-lived cache (5 minutes)
  SHORT: 300,

  // Medium-lived cache (30 minutes)
  MEDIUM: 1800,

  // Long-lived cache (1 hour)
  LONG: 3600,

  // Very long-lived cache (24 hours)
  VERY_LONG: 86400,
};
