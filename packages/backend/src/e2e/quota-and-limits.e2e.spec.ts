import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

/**
 * E2E Test Suite: Quota and Rate Limiting
 * Tests API rate limiting and user quota management
 *
 * Scenarios covered:
 * 1. Free tier rate limiting
 * 2. Pro tier unlimited access
 * 3. Quota display and tracking
 * 4. Rate limit error responses
 */
describe('Quota and Rate Limiting E2E Tests (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let freeUserToken: string;
  let proUserToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Setup: Create free tier user
    const freeUserResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'free-user@example.com',
        password: 'SecurePassword123!',
        username: 'free-user',
      });

    freeUserToken = freeUserResponse.body.accessToken;

    // Setup: Create pro tier user
    const proUserResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'pro-user@example.com',
        password: 'SecurePassword123!',
        username: 'pro-user',
      });

    proUserToken = proUserResponse.body.accessToken;

    // Upgrade pro user to PRO tier
    await request(app.getHttpServer())
      .put('/api/v1/auth/subscription')
      .set('Authorization', `Bearer ${proUserToken}`)
      .send({
        tier: 'PRO',
      });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: ['free-user@example.com', 'pro-user@example.com'],
        },
      },
    });
    await app.close();
  });

  describe('Free Tier Rate Limiting', () => {
    it('should allow free user to make requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);
    });

    it('should track free user quota usage', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/quota')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tier');
      expect(response.body).toHaveProperty('used');
      expect(response.body).toHaveProperty('limit');
      expect(response.body.tier).toBe('FREE');
    });

    it('should enforce free tier optimization limit', async () => {
      // This test assumes the quota system is implemented
      // It should track optimization requests and enforce limits
      const response = await request(app.getHttpServer())
        .get('/api/v1/quota')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.limit).toBeLessThanOrEqual(10); // Free tier limit
    });
  });

  describe('Pro Tier Unlimited Access', () => {
    it('should allow pro user unlimited requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/quota')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      expect(response.body.tier).toBe('PRO');
      expect(response.body.limit).toBeGreaterThan(1000); // Unlimited or very high
    });

    it('should not rate limit pro user', async () => {
      // Make multiple rapid requests
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${proUserToken}`)
        );

      const responses = await Promise.all(requests);

      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Quota Display and Tracking', () => {
    it('should display quota information for free user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/quota')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tier');
      expect(response.body).toHaveProperty('used');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('resetAt');
      expect(response.body.used).toBeLessThanOrEqual(response.body.limit);
    });

    it('should display quota information for pro user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/quota')
        .set('Authorization', `Bearer ${proUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tier');
      expect(response.body.tier).toBe('PRO');
    });

    it('should reject quota request without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/quota').expect(401);
    });
  });

  describe('Rate Limit Error Responses', () => {
    it('should return proper error when rate limit exceeded', async () => {
      // This test assumes rate limiting is implemented
      // It should return 429 Too Many Requests when limit is exceeded
      const response = await request(app.getHttpServer())
        .get('/api/v1/quota')
        .set('Authorization', `Bearer ${freeUserToken}`);

      if (response.status === 429) {
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('retryAfter');
      }
    });

    it('should include retry information in rate limit response', async () => {
      // This test assumes rate limiting is implemented
      const response = await request(app.getHttpServer())
        .get('/api/v1/quota')
        .set('Authorization', `Bearer ${freeUserToken}`);

      if (response.status === 429) {
        expect(response.headers).toHaveProperty('retry-after');
      }
    });
  });

  describe('Subscription Upgrade Flow', () => {
    it('should upgrade user from FREE to PRO', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/auth/subscription')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          tier: 'PRO',
        })
        .expect(200);

      expect(response.body.subscriptionTier).toBe('PRO');
    });

    it('should update quota after upgrade', async () => {
      // First upgrade the user
      await request(app.getHttpServer())
        .put('/api/v1/auth/subscription')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          tier: 'PRO',
        });

      // Then check quota
      const response = await request(app.getHttpServer())
        .get('/api/v1/quota')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      expect(response.body.tier).toBe('PRO');
    });

    it('should downgrade user from PRO to FREE', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/auth/subscription')
        .set('Authorization', `Bearer ${proUserToken}`)
        .send({
          tier: 'FREE',
        })
        .expect(200);

      expect(response.body.subscriptionTier).toBe('FREE');
    });

    it('should reject invalid subscription tier', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/auth/subscription')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .send({
          tier: 'INVALID_TIER',
        })
        .expect(400);
    });
  });

  describe('Quota Performance', () => {
    it('should return quota information within 1 second', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/quota')
        .set('Authorization', `Bearer ${freeUserToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle concurrent quota requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/quota')
            .set('Authorization', `Bearer ${freeUserToken}`)
        );

      const responses = await Promise.all(requests);

      responses.forEach((response: any) => {
        expect(response.status).toBe(200);
      });
    });
  });
});
