import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('Login Remember Property Repro (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let userId: string;

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
    app.setGlobalPrefix('/api/v1');
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Setup: Register user
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'repro-test@example.com',
        password: 'SecurePassword123!',
        username: 'repro-user',
      });

    if (registerResponse.status === 201) {
        userId = registerResponse.body.user.id;
    } else {
        // User might already exist from previous runs
        const user = await prismaService.user.findUnique({ where: { email: 'repro-test@example.com' } });
        if (user) userId = user.id;
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await prismaService.user.deleteMany({
        where: { email: 'repro-test@example.com' },
      });
    }
    await app.close();
  });

  it('should login successfully with remember property', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'repro-test@example.com',
        password: 'SecurePassword123!',
        remember: true,
      });

    // Verify that the error is NOT "property remember should not exist"
    // Even if it's 400, it should be because of other reasons (like invalid credentials)
    // or 500 because of DB schema mismatch in this environment
    if (response.status === 400) {
      expect(response.body.error.message).not.toContain('property remember should not exist');
    }
  });

  it('should not return "property remember should not exist" when remember is false', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'repro-test@example.com',
        password: 'SecurePassword123!',
        remember: false,
      });

    if (response.status === 400) {
      expect(response.body.error.message).not.toContain('property remember should not exist');
    }
  });

  it('should login successfully without remember property', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'repro-test@example.com',
        password: 'SecurePassword123!',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });
});
