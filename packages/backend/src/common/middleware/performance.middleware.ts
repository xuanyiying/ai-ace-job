import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * Performance Monitoring Middleware
 * Tracks API response times and logs slow requests
 * Requirement 10: System Performance & Availability
 * Requirement 12.5: Structured logging
 */
@Injectable()
export class PerformanceMiddleware implements NestMiddleware {
  private readonly slowRequestThreshold = 2000; // 2 seconds

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    const slowRequestThreshold = this.slowRequestThreshold;
    const logger = this.logger;

    // Capture the original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data: any) {
      const duration = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      // Structured performance metrics
      const metrics = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        memory: `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`,
        timestamp: new Date().toISOString(),
      };

      // Log slow requests
      if (duration > slowRequestThreshold) {
        logger.warn('Slow request detected', metrics);
      } else {
        logger.debug('Request performance metrics', metrics);
      }

      // Add performance headers
      res.set('X-Response-Time', `${duration}ms`);
      res.set('X-Memory-Used', `${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  }
}

/**
 * Request size limiting middleware
 * Prevents large payloads from consuming resources
 */
@Injectable()
export class RequestSizeLimitMiddleware implements NestMiddleware {
  private readonly maxSize = 10 * 1024 * 1024; // 10MB

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;

      if (size > this.maxSize) {
        this.logger.warn('Request size exceeded', {
          size: `${(size / 1024 / 1024).toFixed(2)}MB`,
          maxSize: `${(this.maxSize / 1024 / 1024).toFixed(2)}MB`,
          timestamp: new Date().toISOString(),
        });
        res.status(413).json({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request payload exceeds maximum allowed size',
          },
        });
      }
    });

    next();
  }
}

/**
 * Cache control headers middleware
 * Sets appropriate cache headers for different response types
 */
@Injectable()
export class CacheControlMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Set cache control headers based on route
    if (req.path.includes('/api/v1/templates')) {
      // Templates can be cached for longer
      res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
    } else if (req.path.includes('/api/v1/')) {
      // API responses should not be cached by default
      res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else {
      // Static assets can be cached
      res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    }

    next();
  }
}
