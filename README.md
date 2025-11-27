# Resume Optimizer MVP

AI-powered resume optimization SaaS platform.

## Project Structure

This is a monorepo containing:

- `packages/backend` - NestJS backend service
- `packages/frontend` - React + Vite frontend application

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL 15+
- Redis 7+

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment files and update with your values:

```bash
# Backend
cp packages/backend/.env.example packages/backend/.env

# Frontend
cp packages/frontend/.env.example packages/frontend/.env
```

### 3. Run Development Servers

```bash
# Run both frontend and backend
npm run dev

# Or run individually
npm run dev:backend
npm run dev:frontend
```

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both packages
- `npm run test` - Run tests in all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier

## Technology Stack

### Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- JWT Authentication
- OpenAI API

### Frontend

- React 18
- TypeScript
- Vite
- Ant Design
- Zustand
- Axios

## Production Deployment

For production deployment instructions, see:

- **[Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)** - Complete deployment guide
- **[Infrastructure Checklist](INFRASTRUCTURE_CHECKLIST.md)** - Configuration checklist
- **[Production Operations](PRODUCTION_OPERATIONS.md)** - Operations quick reference

### Quick Production Deployment

```bash
# 1. Configure environment
cp .env.production .env.production.local
nano .env.production.local

# 2. Deploy application
./scripts/deploy-production.sh

# 3. Setup SSL/TLS
./scripts/setup-ssl.sh
```

### Production Features

- ✅ PostgreSQL with SSL/TLS encryption
- ✅ Redis with password authentication
- ✅ AWS S3 / Aliyun OSS object storage
- ✅ Nginx load balancer with SSL termination
- ✅ Automated daily backups
- ✅ Health checks and monitoring
- ✅ Rate limiting and security headers
- ✅ Horizontal scaling support

## Docker Deployment

### Development

```bash
docker-compose up -d
```

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## License

Private
