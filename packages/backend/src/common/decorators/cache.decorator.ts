import { Logger } from '@nestjs/common';

/**
 * Decorator for caching method results in Redis
 * Useful for expensive operations like AI calls and resume parsing
 */
export function Cacheable(options: {
  ttl?: number; // Time to live in seconds (default: 3600)
  keyPrefix?: string; // Prefix for cache key
  keyGenerator?: (...args: any[]) => string; // Custom key generator
}) {
  const ttl = options.ttl || 3600;
  const keyPrefix = options.keyPrefix || 'cache';
  const logger = new Logger('CacheDecorator');

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Get RedisService from this context
      const redisService = (this as any).redisService;
      if (!redisService) {
        logger.warn(
          `RedisService not found in ${target.constructor.name}.${propertyKey}. Skipping cache.`
        );
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      let cacheKey: string;
      if (options.keyGenerator) {
        cacheKey = options.keyGenerator(...args);
      } else {
        // Default key generation from method name and arguments
        const argString = JSON.stringify(args)
          .substring(0, 100)
          .replace(/[^a-zA-Z0-9]/g, '');
        cacheKey = `${keyPrefix}:${propertyKey}:${argString}`;
      }

      try {
        // Try to get from cache
        const cached = await redisService.get(cacheKey);
        if (cached) {
          logger.debug(`Cache hit for key: ${cacheKey}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn(`Failed to get from cache: ${error}`);
      }

      // Call original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      try {
        await redisService.set(cacheKey, JSON.stringify(result), ttl);
      } catch (error) {
        logger.warn(`Failed to cache result: ${error}`);
      }

      return result;
    };

    return descriptor;
  };
}
