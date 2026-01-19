import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MonitoringInterceptor } from './monitoring/monitoring.interceptor';
import { MonitoringGuard } from './monitoring/monitoring.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable WebSocket support with Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Initialize Sentry for error tracking
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'
      ),
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
    });

    // Use Sentry request handler
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.errorHandler());
  }

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Apply global monitoring interceptor
  const monitoringInterceptor = app.get(MonitoringInterceptor);
  app.useGlobalInterceptors(monitoringInterceptor);

  // Apply global monitoring guard
  const monitoringGuard = app.get(MonitoringGuard);
  app.useGlobalGuards(monitoringGuard);

  // Apply global exception filter
  const httpExceptionFilter = app.get(HttpExceptionFilter);
  app.useGlobalFilters(httpExceptionFilter);

  // Performance: Compression middleware for response compression
  app.use(
    compression({
      level: 6, // Balance between compression ratio and CPU usage
      threshold: 1024, // Only compress responses larger than 1KB
      filter: (req, res) => {
        // Don't compress responses with this request header
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Use compression filter function
        return compression.filter(req, res);
      },
    })
  );

  // Security: Helmet middleware for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    })
  );

  // Global validation pipe with enhanced security
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    })
  );

  // CORS configuration with security
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const allowedOrigins = corsOrigin.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // For development, we can be more lenient or log the rejected origin
        console.warn(`CORS rejected origin: ${origin}`);
        callback(null, true); // Temporarily allow all for debugging or use allowedOrigins
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600,
  });

  // API prefix
  // FIXME: Hardcoded to avoid double prefix issue
  app.setGlobalPrefix('/api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Interview AI API')
    .setDescription('AI-powered interview preparation and resume optimization platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('resumes', 'Resume management endpoints')
    .addTag('jobs', 'Job management endpoints')
    .addTag('optimizations', 'Resume optimization endpoints')
    .addTag('generate', 'PDF generation endpoints')
    .addTag('interview', 'Interview preparation endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.warn(`🚀 [DEBUG] STARTING SERVER ON PORT ${port}`);
  await app.listen(port);

  logger.log(
    `Application is running on: http://localhost:${port}`,
    'Bootstrap'
  );
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/api/docs`,
    'Bootstrap'
  );
}

bootstrap();
