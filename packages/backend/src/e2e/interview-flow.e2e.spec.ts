import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

/**
 * E2E Test Suite: Interview Preparation Flow
 * Tests the interview question generation and preparation export
 *
 * Scenarios covered:
 * 1. Interview question generation
 * 2. Question retrieval and filtering
 * 3. Interview prep export
 * 4. Error handling
 */
describe('Interview Preparation Flow E2E Tests (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let userId: string;
  let resumeId: string;
  let jobId: string;
  let optimizationId: string;

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

    // Setup: Register user and create resume/job/optimization
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'interview-e2e@example.com',
        password: 'SecurePassword123!',
        username: 'interview-user',
      });

    authToken = registerResponse.body.accessToken;
    userId = registerResponse.body.user.id;

    // Create resume
    const resumeResponse = await request(app.getHttpServer())
      .post('/resumes/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .field('title', 'Interview Test Resume')
      .attach(
        'file',
        Buffer.from('John Doe\nSoftware Engineer\n5 years experience')
      );

    resumeId = resumeResponse.body.id;

    // Create job
    const jobResponse = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        jobDescription: 'We are hiring a senior engineer',
        requirements: 'Node.js, TypeScript, AWS',
      });

    jobId = jobResponse.body.id;

    // Create optimization
    const optimizationResponse = await request(app.getHttpServer())
      .post('/api/v1/optimizations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        resumeId,
        jobId,
      });

    optimizationId = optimizationResponse.body.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await prismaService.user.deleteMany({
        where: { email: 'interview-e2e@example.com' },
      });
    }
    await app.close();
  });

  describe('Interview Question Generation', () => {
    it('should generate interview questions', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/interview/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          optimizationId,
          count: 10,
        })
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(10);
      expect(response.body.length).toBeLessThanOrEqual(15);

      // Verify question structure
      response.body.forEach((question: any) => {
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('question');
        expect(question).toHaveProperty('questionType');
        expect(question).toHaveProperty('suggestedAnswer');
        expect(question).toHaveProperty('tips');
        expect(question).toHaveProperty('difficulty');
      });
    });

    it('should include different question types', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/interview/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          optimizationId,
          count: 12,
        })
        .expect(201);

      const questionTypes = response.body.map((q: any) => q.questionType);
      const hasMultipleTypes = new Set(questionTypes).size > 1;

      expect(hasMultipleTypes).toBe(true);
    });

    it('should include difficulty levels', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/interview/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          optimizationId,
          count: 12,
        })
        .expect(201);

      const difficulties = response.body.map((q: any) => q.difficulty);
      const validDifficulties = ['easy', 'medium', 'hard'];

      difficulties.forEach((difficulty: string) => {
        expect(validDifficulties).toContain(difficulty);
      });
    });

    it('should reject generation without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/interview/questions`)
        .send({
          optimizationId,
          count: 10,
        })
        .expect(401);
    });

    it('should reject generation with invalid optimization ID', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/interview/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          optimizationId: 'invalid-id',
          count: 10,
        })
        .expect(404);
    });

    it('should handle invalid count parameter', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/interview/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          optimizationId,
          count: -5,
        })
        .expect(400);
    });
  });

  describe('Interview Question Retrieval', () => {
    it('should retrieve generated questions', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/interview/questions/${optimizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject retrieval without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/interview/questions/${optimizationId}`)
        .expect(401);
    });

    it('should return 404 for non-existent optimization', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/interview/questions/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Interview Preparation Export', () => {
    it('should export interview preparation as PDF', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/interview/export/${optimizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('fileUrl');
      expect(response.body).toHaveProperty('fileName');
    });

    it('should reject export without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/interview/export/${optimizationId}`)
        .expect(401);
    });

    it('should return 404 for non-existent optimization export', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/interview/export/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should export within performance threshold', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get(`/api/v1/interview/export/${optimizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(10000); // 10 seconds
    });
  });

  describe('Interview Flow Performance', () => {
    it('should generate questions within 30 seconds', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post(`/api/v1/interview/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          optimizationId,
          count: 10,
        })
        .expect(201);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(30000);
    });

    it('should retrieve questions within 2 seconds', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get(`/api/v1/interview/questions/${optimizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000);
    });
  });
});
