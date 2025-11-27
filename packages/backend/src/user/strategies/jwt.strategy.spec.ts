import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: PrismaService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      return null;
    }),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user when valid payload and active user', async () => {
      const payload = { sub: 'user-id-123' };
      const user = {
        id: 'user-id-123',
        email: 'test@example.com',
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await strategy.validate(payload);

      expect(result).toEqual(user);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-123' },
      });
    });

    it('should throw UnauthorizedException when payload has no sub', async () => {
      const payload = {};

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload')
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const payload = { sub: 'non-existent-user' };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('User not found')
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const payload = { sub: 'user-id-123' };
      const user = {
        id: 'user-id-123',
        email: 'test@example.com',
        isActive: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('User account is inactive')
      );
    });
  });
});
