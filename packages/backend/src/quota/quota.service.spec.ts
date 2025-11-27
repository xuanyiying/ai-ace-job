import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionTier } from '@prisma/client';
import { QuotaService } from './quota.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

describe('QuotaService', () => {
  let service: QuotaService;
  let redisService: RedisService;
  let prismaService: PrismaService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    subscriptionTier: SubscriptionTier.FREE,
  };

  const mockProUser = {
    id: 'user-pro',
    email: 'pro@example.com',
    subscriptionTier: SubscriptionTier.PRO,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
            ttl: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
    redisService = module.get<RedisService>(RedisService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('canOptimize', () => {
    it('should return true for pro users', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockProUser as any);

      const result = await service.canOptimize('user-pro');

      expect(result).toBe(true);
    });

    it('should return true for free users under limit', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'get').mockResolvedValue('5');

      const result = await service.canOptimize('user-1');

      expect(result).toBe(true);
    });

    it('should return false for free users at limit', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'get').mockResolvedValue('10');

      const result = await service.canOptimize('user-1');

      expect(result).toBe(false);
    });

    it('should return true for free users with no quota set', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      const result = await service.canOptimize('user-1');

      expect(result).toBe(true);
    });
  });

  describe('incrementOptimizationCount', () => {
    it('should increment counter for free users', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'incr').mockResolvedValue(1);

      await service.incrementOptimizationCount('user-1');

      expect(redisService.incr).toHaveBeenCalledWith(
        'quota:optimization:user-1'
      );
      expect(redisService.expire).toHaveBeenCalledWith(
        'quota:optimization:user-1',
        3600
      );
    });

    it('should not increment counter for pro users', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockProUser as any);

      await service.incrementOptimizationCount('user-pro');

      expect(redisService.incr).not.toHaveBeenCalled();
    });
  });

  describe('canGeneratePdf', () => {
    it('should return true for pro users', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockProUser as any);

      const result = await service.canGeneratePdf('user-pro');

      expect(result).toBe(true);
    });

    it('should return true for free users under limit', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'get').mockResolvedValue('3');

      const result = await service.canGeneratePdf('user-1');

      expect(result).toBe(true);
    });

    it('should return false for free users at limit', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'get').mockResolvedValue('5');

      const result = await service.canGeneratePdf('user-1');

      expect(result).toBe(false);
    });
  });

  describe('incrementPdfCount', () => {
    it('should increment counter for free users', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'incr').mockResolvedValue(1);

      await service.incrementPdfCount('user-1');

      expect(redisService.incr).toHaveBeenCalledWith('quota:pdf:user-1');
      expect(redisService.expire).toHaveBeenCalledWith(
        'quota:pdf:user-1',
        30 * 24 * 3600
      );
    });

    it('should not increment counter for pro users', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockProUser as any);

      await service.incrementPdfCount('user-pro');

      expect(redisService.incr).not.toHaveBeenCalled();
    });
  });

  describe('getQuotaInfo', () => {
    it('should return quota info for free user', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(redisService, 'get')
        .mockResolvedValueOnce('5')
        .mockResolvedValueOnce('2');
      jest
        .spyOn(redisService, 'ttl')
        .mockResolvedValueOnce(1800)
        .mockResolvedValueOnce(86400);

      const result = await service.getQuotaInfo('user-1');

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.optimizationsUsed).toBe(5);
      expect(result.optimizationsLimit).toBe(10);
      expect(result.pdfGenerationsUsed).toBe(2);
      expect(result.pdfGenerationsLimit).toBe(5);
      expect(result.canOptimize).toBe(true);
      expect(result.canGeneratePdf).toBe(true);
    });

    it('should return unlimited quota for pro user', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockProUser as any);
      jest
        .spyOn(redisService, 'get')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      jest
        .spyOn(redisService, 'ttl')
        .mockResolvedValueOnce(-1)
        .mockResolvedValueOnce(-1);

      const result = await service.getQuotaInfo('user-pro');

      expect(result.tier).toBe(SubscriptionTier.PRO);
      expect(result.optimizationsLimit).toBe(-1);
      expect(result.pdfGenerationsLimit).toBe(-1);
      expect(result.canOptimize).toBe(true);
      expect(result.canGeneratePdf).toBe(true);
    });
  });

  describe('enforceOptimizationQuota', () => {
    it('should throw error when quota exceeded', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'get').mockResolvedValue('10');
      jest.spyOn(redisService, 'ttl').mockResolvedValue(1800);

      await expect(service.enforceOptimizationQuota('user-1')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should not throw error when quota available', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'get').mockResolvedValue('5');

      await expect(
        service.enforceOptimizationQuota('user-1')
      ).resolves.not.toThrow();
    });
  });

  describe('enforcePdfQuota', () => {
    it('should throw error when quota exceeded', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'get').mockResolvedValue('5');
      jest.spyOn(redisService, 'ttl').mockResolvedValue(86400);

      await expect(service.enforcePdfQuota('user-1')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should not throw error when quota available', async () => {
      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser as any);
      jest.spyOn(redisService, 'get').mockResolvedValue('3');

      await expect(service.enforcePdfQuota('user-1')).resolves.not.toThrow();
    });
  });
});
