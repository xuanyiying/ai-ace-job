# Resume Optimizer Backend

NestJS backend service for the Resume Optimizer platform.

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your database and Redis configuration
```

3. Initialize Prisma and create database:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

4. (Optional) Seed initial data:

```bash
npx prisma db seed
```

### Running the Application

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm run start:prod
```

## API Documentation

Once the application is running, visit:

- Swagger UI: http://localhost:3000/api/docs

## Feature Documentation

- [Resume Parsing Guide](./docs/RESUME_PARSING_GUIDE.md) - Details on supported formats and parsing logic.

## Health Check

Check service health:

```bash
curl http://localhost:3000/api/v1/health
```

## Infrastructure Components

### Database (PostgreSQL + Prisma)

- ORM: Prisma
- Database: PostgreSQL 15+
- Schema location: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`

### Cache (Redis)

- Client: ioredis
- Used for: API response caching, rate limiting, session storage

### Logging (Winston)

- Structured JSON logging
- Log files:
  - `logs/combined.log` - All logs
  - `logs/error.log` - Error logs only
  - `logs/exceptions.log` - Uncaught exceptions
  - `logs/rejections.log` - Unhandled promise rejections

### API Documentation (Swagger)

- Auto-generated OpenAPI 3.0 documentation
- Interactive API testing interface
- Available at `/api/docs`

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```
