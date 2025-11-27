import { Injectable, ForbiddenException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionTier } from '@prisma/client';

export interface QuotaInfo {
  tier: SubscriptionTier;
  optimizationsUsed: number;
  optimizationsLimit: number;
  optimizationsResetAt: Date;
  pdfGenerationsUsed: number;
  pdfGenerationsLimit: number;
  pdfGenerationsResetAt: Date;
  canOptimize: boolean;
  canGeneratePdf: boolean;
}

@Injectable()
export class QuotaService {
  // Quota limits per subscription tier
  private readonly QUOTA_LIMITS = {
    [SubscriptionTier.FREE]: {
      optimizations: 10, // 10 per hour
      pdfGenerations: 5, // 5 per month
    },
    [SubscriptionTier.PRO]: {
      optimizations: -1, // Unlimited
      pdfGenerations: -1, // Unlimited
    },
    [SubscriptionTier.ENTERPRISE]: {
      optimizations: -1, // Unlimited
      pdfGenerations: -1, // Unlimited
    },
  };

  // Time windows
  private readonly OPTIMIZATION_WINDOW = 3600; // 1 hour in seconds
  private readonly PDF_WINDOW = 30 * 24 * 3600; // 30 days in seconds

  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService
  ) {}

  /**
   * Check if user can perform an optimization
   * Requirement 11.1: Free users limited to 10 optimizations per hour
   * Requirement 11.3: Pro users have unlimited optimizations
   */
  async canOptimize(userId: string): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Pro and Enterprise users have unlimited optimizations
    if (
      user.subscriptionTier === SubscriptionTier.PRO ||
      user.subscriptionTier === SubscriptionTier.ENTERPRISE
    ) {
      return true;
    }

    // Free users: check hourly limit
    const key = `quota:optimization:${userId}`;
    const count = await this.redisService.get(key);
    const currentCount = count ? parseInt(count, 10) : 0;
    const limit = this.QUOTA_LIMITS[SubscriptionTier.FREE].optimizations;

    return currentCount < limit;
  }

  /**
   * Increment optimization counter for user
   * Requirement 11.1: Track free user optimization usage
   */
  async incrementOptimizationCount(userId: string): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Only track for free users
    if (user.subscriptionTier === SubscriptionTier.FREE) {
      const key = `quota:optimization:${userId}`;
      const count = await this.redisService.incr(key);

      // Set expiration on first increment
      if (count === 1) {
        await this.redisService.expire(key, this.OPTIMIZATION_WINDOW);
      }
    }
  }

  /**
   * Check if user can generate PDF
   * Requirement 11.2: Free users limited to 5 PDFs per month
   * Requirement 11.3: Pro users have unlimited PDFs
   */
  async canGeneratePdf(userId: string): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Pro and Enterprise users have unlimited PDF generations
    if (
      user.subscriptionTier === SubscriptionTier.PRO ||
      user.subscriptionTier === SubscriptionTier.ENTERPRISE
    ) {
      return true;
    }

    // Free users: check monthly limit
    const key = `quota:pdf:${userId}`;
    const count = await this.redisService.get(key);
    const currentCount = count ? parseInt(count, 10) : 0;
    const limit = this.QUOTA_LIMITS[SubscriptionTier.FREE].pdfGenerations;

    return currentCount < limit;
  }

  /**
   * Increment PDF generation counter for user
   * Requirement 11.2: Track free user PDF generation usage
   */
  async incrementPdfCount(userId: string): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Only track for free users
    if (user.subscriptionTier === SubscriptionTier.FREE) {
      const key = `quota:pdf:${userId}`;
      const count = await this.redisService.incr(key);

      // Set expiration on first increment
      if (count === 1) {
        await this.redisService.expire(key, this.PDF_WINDOW);
      }
    }
  }

  /**
   * Get quota information for user
   * Requirement 11.5: Display current usage and remaining quota
   */
  async getQuotaInfo(userId: string): Promise<QuotaInfo> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const tier = user.subscriptionTier;
    const limits = this.QUOTA_LIMITS[tier];

    // Get optimization count
    const optimizationKey = `quota:optimization:${userId}`;
    const optimizationCountStr = await this.redisService.get(optimizationKey);
    const optimizationsUsed = optimizationCountStr
      ? parseInt(optimizationCountStr, 10)
      : 0;
    const optimizationTtl = await this.redisService.ttl(optimizationKey);
    const optimizationsResetAt = new Date(
      Date.now() + (optimizationTtl > 0 ? optimizationTtl * 1000 : 0)
    );

    // Get PDF count
    const pdfKey = `quota:pdf:${userId}`;
    const pdfCountStr = await this.redisService.get(pdfKey);
    const pdfGenerationsUsed = pdfCountStr ? parseInt(pdfCountStr, 10) : 0;
    const pdfTtl = await this.redisService.ttl(pdfKey);
    const pdfGenerationsResetAt = new Date(
      Date.now() + (pdfTtl > 0 ? pdfTtl * 1000 : 0)
    );

    // Determine if user can perform actions
    const canOptimize =
      limits.optimizations === -1 || optimizationsUsed < limits.optimizations;
    const canGeneratePdf =
      limits.pdfGenerations === -1 ||
      pdfGenerationsUsed < limits.pdfGenerations;

    return {
      tier,
      optimizationsUsed,
      optimizationsLimit:
        limits.optimizations === -1 ? -1 : limits.optimizations,
      optimizationsResetAt,
      pdfGenerationsUsed,
      pdfGenerationsLimit:
        limits.pdfGenerations === -1 ? -1 : limits.pdfGenerations,
      pdfGenerationsResetAt,
      canOptimize,
      canGeneratePdf,
    };
  }

  /**
   * Enforce quota limit - throws exception if limit exceeded
   * Requirement 11.4: Return clear error message when limit exceeded
   */
  async enforceOptimizationQuota(userId: string): Promise<void> {
    const canOptimize = await this.canOptimize(userId);

    if (!canOptimize) {
      const quotaInfo = await this.getQuotaInfo(userId);
      throw new ForbiddenException(
        `Optimization quota exceeded. Limit: ${quotaInfo.optimizationsLimit} per hour. Resets at ${quotaInfo.optimizationsResetAt.toISOString()}`
      );
    }
  }

  /**
   * Enforce PDF generation quota - throws exception if limit exceeded
   * Requirement 11.4: Return clear error message when limit exceeded
   */
  async enforcePdfQuota(userId: string): Promise<void> {
    const canGeneratePdf = await this.canGeneratePdf(userId);

    if (!canGeneratePdf) {
      const quotaInfo = await this.getQuotaInfo(userId);
      throw new ForbiddenException(
        `PDF generation quota exceeded. Limit: ${quotaInfo.pdfGenerationsLimit} per month. Resets at ${quotaInfo.pdfGenerationsResetAt.toISOString()}`
      );
    }
  }
}
