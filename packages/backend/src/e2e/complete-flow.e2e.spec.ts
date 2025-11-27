import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E Test Suite: Complete User Flow
 * Tests the entire user journey from registration to PDF generation
 *
 * Scenarios covered:
 * 1. User registration and login
 * 2. Resume upload and parsing
 * 3. Job creation and parsing
 * 4. Resume-job matching and optimization
 * 5. PDF generation
 * 6. Error handling and edge cases
 */
describe('Complete User Flow E2E Tests (e2e)', () => {
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
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await prismaService.user.deleteMany({
        where: { email: 'e2e-test@example.com' },
      });
    }
    await app.close();
  });

  describe('Scenario 1: User Registration and Authentication', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'e2e-test@example.com',
          password: 'SecurePassword123!',
          username: 'e2e-testuser',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('e2e-test@example.com');
      expect(response.body.user.subscriptionTier).toBe('FREE');

      authToken = response.body.accessToken;
      userId = response.body.user.id;
    });

    it('should reject duplicate email registration', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'e2e-test@example.com',
          password: 'AnotherPassword123!',
          username: 'another-user',
        })
        .expect(409);
    });

    it('should login with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'e2e-test@example.com',
          password: 'SecurePassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe('e2e-test@example.com');
    });

    it('should reject login with incorrect password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'e2e-test@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should get current user info with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBe('e2e-test@example.com');
      expect(response.body.id).toBe(userId);
    });

    it('should reject request without authentication token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });
  });

  describe('Scenario 2: Resume Upload and Parsing', () => {
    it('should upload a resume file successfully', async () => {
      const testFilePath = path.join(
        __dirname,
        '../../../test-data/sample-resume.txt'
      );

      // Create test file if it doesn't exist
      if (!fs.existsSync(testFilePath)) {
        const testDir = path.dirname(testFilePath);
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
        fs.writeFileSync(
          testFilePath,
          `
John Doe
john@example.com
+1-234-567-8900

PROFESSIONAL SUMMARY
Experienced Software Engineer with 5+ years in full-stack development.

EXPERIENCE
Senior Software Engineer | Tech Corp | 2020-Present
- Led development of microservices architecture
- Improved system performance by 40%
- Mentored 3 junior developers

Software Engineer | StartUp Inc | 2018-2020
- Built REST APIs using Node.js and Express
- Implemented CI/CD pipelines

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2018

SKILLS
JavaScript, TypeScript, Node.js, React, PostgreSQL, Docker, AWS
        `
        );
      }

      const response = await request(app.getHttpServer())
        .post('/resumes/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'My Resume')
        .attach('file', testFilePath)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('My Resume');
      expect(response.body.userId).toBe(userId);
      expect(response.body.parseStatus).toBe('PENDING');

      resumeId = response.body.id;
    });

    it('should reject file upload without authentication', async () => {
      const testFilePath = path.join(
        __dirname,
        '../../../test-data/sample-resume.txt'
      );

      await request(app.getHttpServer())
        .post('/resumes/upload')
        .field('title', 'My Resume')
        .attach('file', testFilePath)
        .expect(401);
    });

    it('should list user resumes', async () => {
      const response = await request(app.getHttpServer())
        .get('/resumes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].userId).toBe(userId);
    });

    it('should get specific resume details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(resumeId);
      expect(response.body.title).toBe('My Resume');
    });

    it('should set resume as primary', async () => {
      const response = await request(app.getHttpServer())
        .put(`/resumes/${resumeId}/primary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.isPrimary).toBe(true);
    });
  });

  describe('Scenario 3: Job Creation and Parsing', () => {
    it('should create a job successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          jobType: 'Full-time',
          salaryRange: '$150,000 - $200,000',
          jobDescription: `
We are looking for a Senior Software Engineer to join our team.

Responsibilities:
- Design and implement scalable microservices
- Lead technical discussions and code reviews
- Mentor junior developers
- Collaborate with product team on feature development

Requirements:
- 5+ years of software development experience
- Strong knowledge of Node.js and TypeScript
- Experience with Docker and Kubernetes
- AWS or cloud platform experience
- Strong communication skills
          `,
          requirements: `
- 5+ years of software development experience
- Strong knowledge of Node.js and TypeScript
- Experience with Docker and Kubernetes
- AWS or cloud platform experience
          `,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Senior Software Engineer');
      expect(response.body.company).toBe('Tech Corp');
      expect(response.body.userId).toBe(userId);

      jobId = response.body.id;
    });

    it('should list user jobs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get specific job details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(jobId);
      expect(response.body.title).toBe('Senior Software Engineer');
    });
  });

  describe('Scenario 4: Resume-Job Matching and Optimization', () => {
    it('should create optimization task', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/optimizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resumeId,
          jobId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.resumeId).toBe(resumeId);
      expect(response.body.jobId).toBe(jobId);
      expect(response.body.status).toBe('PENDING');

      optimizationId = response.body.id;
    });

    it('should get optimization details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/optimizations/${optimizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(optimizationId);
      expect(response.body.resumeId).toBe(resumeId);
    });

    it('should handle optimization with invalid resume ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/optimizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resumeId: 'invalid-resume-id',
          jobId,
        })
        .expect(404);
    });

    it('should handle optimization with invalid job ID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/optimizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resumeId,
          jobId: 'invalid-job-id',
        })
        .expect(404);
    });
  });

  describe('Scenario 5: PDF Generation', () => {
    it('should generate PDF from resume', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/generate/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          optimizationId,
          templateId: 'classic',
          resumeData: {
            personalInfo: {
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+1-234-567-8900',
              location: 'San Francisco, CA',
            },
            experience: [
              {
                company: 'Tech Corp',
                position: 'Senior Software Engineer',
                startDate: '2020-01-01',
                description: ['Led development of microservices architecture'],
              },
            ],
            education: [
              {
                institution: 'University of Technology',
                degree: 'Bachelor of Science',
                field: 'Computer Science',
                startDate: '2014-01-01',
                endDate: '2018-05-31',
              },
            ],
            skills: ['JavaScript', 'TypeScript', 'Node.js', 'React'],
          },
          options: {
            fontSize: 11,
            colorTheme: 'blue',
            includePhoto: false,
            margin: 'normal',
            visibleSections: [
              'personalInfo',
              'experience',
              'education',
              'skills',
            ],
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('fileUrl');
    });

    it('should list templates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get template details', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/templates/classic')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
    });
  });

  describe('Scenario 6: Error Handling and Edge Cases', () => {
    it('should handle invalid token format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);
    });

    it('should handle missing required fields in registration', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'incomplete@example.com',
          // missing password
        })
        .expect(400);
    });

    it('should handle invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
        })
        .expect(400);
    });

    it('should handle weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'weak-password@example.com',
          password: '123', // too weak
        })
        .expect(400);
    });

    it('should handle accessing non-existent resume', async () => {
      await request(app.getHttpServer())
        .get('/resumes/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle accessing non-existent job', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/jobs/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should prevent unauthorized access to other users data', async () => {
      // Register another user
      const otherUserResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'other-user@example.com',
          password: 'SecurePassword123!',
          username: 'other-user',
        })
        .expect(201);

      const otherUserToken = otherUserResponse.body.accessToken;

      // Try to access first user's resume with other user's token
      await request(app.getHttpServer())
        .get(`/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });
  });

  describe('Scenario 7: Performance and Response Times', () => {
    it('should return user info within 2 seconds', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000);
    });

    it('should list resumes within 2 seconds', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/resumes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000);
    });

    it('should create job within 2 seconds', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Performance Test Job',
          company: 'Test Corp',
          jobDescription: 'Test job for performance measurement',
          requirements: 'Test requirements',
        })
        .expect(201);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000);
    });
  });

  describe('Scenario 8: Account Management', () => {
    it('should export user data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/data/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('resumes');
      expect(response.body).toHaveProperty('jobs');
      expect(response.body).toHaveProperty('exportedAt');
    });

    it('should update subscription tier', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/auth/subscription')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tier: 'PRO',
        })
        .expect(200);

      expect(response.body.subscriptionTier).toBe('PRO');
    });

    it('should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});
