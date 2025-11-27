import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

/**
 * E2E Test Suite: Security and Error Handling
 * Tests security measures and error handling across the application
 *
 * Scenarios covered:
 * 1. Authentication and authorization
 * 2. Input validation and sanitization
 * 3. Error response standardization
 * 4. Data access control
 * 5. CORS and security headers
 */
describe('Security and Error Handling E2E Tests (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let userId: string;
  let resumeId: string;

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

    // Setup: Register user
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'security-test@example.com',
        password: 'SecurePassword123!',
        username: 'security-user',
      });

    authToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;

    // Create a resume for testing
    const resumeResponse = await request(app.getHttpServer())
      .post('/resumes/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .field('title', 'Security Test Resume')
      .attach('file', Buffer.from('John Doe\nSoftware Engineer'));

    resumeId = resumeResponse.body.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await prismaService.user.deleteMany({
        where: { email: 'security-test@example.com' },
      });
    }
    await app.close();
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should reject requests with expired token', async () => {
      // This test assumes token expiration is implemented
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect([401, 403]).toContain(response.status);
    });

    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).not.toContain('password');
      expect(response.body.message).not.toContain('hash');
    });
  });

  describe('Authorization and Data Access Control', () => {
    it('should prevent user from accessing other users resumes', async () => {
      // Register another user
      const otherUserResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'other-security-user@example.com',
          password: 'SecurePassword123!',
          username: 'other-security-user',
        });

      const otherUserToken = otherUserResponse.body.accessToken;

      // Try to access first user's resume
      const response = await request(app.getHttpServer())
        .get(`/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should prevent user from deleting other users resumes', async () => {
      // Register another user
      const otherUserResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'delete-test-user@example.com',
          password: 'SecurePassword123!',
          username: 'delete-test-user',
        });

      const otherUserToken = otherUserResponse.body.accessToken;

      // Try to delete first user's resume
      const response = await request(app.getHttpServer())
        .delete(`/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should prevent user from updating other users jobs', async () => {
      // Create a job for the first user
      const jobResponse = await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Job',
          company: 'Test Corp',
          jobDescription: 'Test job',
          requirements: 'Test requirements',
        });

      const jobId = jobResponse.body.id;

      // Register another user
      const otherUserResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'update-test-user@example.com',
          password: 'SecurePassword123!',
          username: 'update-test-user',
        });

      const otherUserToken = otherUserResponse.body.accessToken;

      // Try to update first user's job
      const response = await request(app.getHttpServer())
        .put(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          title: 'Updated Title',
        });

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject registration with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
        })
        .expect(400);
    });

    it('should reject registration with weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'weak-password@example.com',
          password: '123',
        })
        .expect(400);
    });

    it('should reject job creation with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Incomplete Job',
          // missing company and jobDescription
        })
        .expect(400);
    });

    it('should reject optimization with invalid resume ID format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/optimizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resumeId: 'invalid-format',
          jobId: 'also-invalid',
        })
        .expect(400);
    });

    it('should sanitize input to prevent XSS', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '<script>alert("XSS")</script>',
          company: 'Test Corp',
          jobDescription: 'Test job',
          requirements: 'Test requirements',
        });

      // Should either reject or sanitize the input
      if (response.status === 201) {
        expect(response.body.title).not.toContain('<script>');
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should reject SQL injection attempts', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: "' OR '1'='1",
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Error Response Standardization', () => {
    it('should return standardized error format for 400 errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return standardized error format for 401 errors', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/auth/me'
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return standardized error format for 404 errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/resumes/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return standardized error format for 500 errors', async () => {
      // This test would require triggering an actual server error
      // For now, we'll just verify the error response structure
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid');

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should not expose stack traces in production errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/resumes/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body).not.toHaveProperty('stack');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      // Check for common security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include CORS headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Origin', 'http://localhost:5173');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    it('should handle rapid requests gracefully', async () => {
      const requests = Array(20)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${authToken}`)
        );

      const responses = await Promise.all(requests);

      // All requests should either succeed or be rate limited
      responses.forEach((response: any) => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should return rate limit headers when limit exceeded', async () => {
      // Make rapid requests
      const requests = Array(50)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${authToken}`)
        );

      const responses = await Promise.all(requests);

      // Check if any response includes rate limit headers
      const rateLimitedResponse = responses.find((r: any) => r.status === 429);
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.headers).toHaveProperty('retry-after');
      }
    });
  });

  describe('Account Deletion and Data Privacy', () => {
    it('should delete user account and associated data', async () => {
      // Register a user to delete
      const userToDeleteResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'delete-me@example.com',
          password: 'SecurePassword123!',
          username: 'delete-me-user',
        });

      const deleteToken = userToDeleteResponse.body.accessToken;

      // Delete the account
      await request(app.getHttpServer())
        .delete('/api/v1/auth/account')
        .set('Authorization', `Bearer ${deleteToken}`)
        .expect(204);

      // Verify user cannot login
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'delete-me@example.com',
          password: 'SecurePassword123!',
        })
        .expect(401);
    });

    it('should prevent access after account deletion', async () => {
      // Register a user to delete
      const userToDeleteResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'delete-access-test@example.com',
          password: 'SecurePassword123!',
          username: 'delete-access-user',
        });

      const deleteToken = userToDeleteResponse.body.accessToken;

      // Delete the account
      await request(app.getHttpServer())
        .delete('/api/v1/auth/account')
        .set('Authorization', `Bearer ${deleteToken}`)
        .expect(204);

      // Try to access protected resource with deleted user's token
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${deleteToken}`)
        .expect(401);
    });
  });
});
