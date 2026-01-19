# IntervAI - Quick Reference Guide

## 📚 Documentation Index

### Architecture & Design

- [System Architecture](./architecture/system-architecture.md) - Complete system overview with diagrams
- [Code Quality Improvements](./architecture/code-quality-improvements.md) - Bug fixes and improvements
- [Agent Design](../packages/backend/src/agent/DESIGN.md) - AI Agent architecture
- [Implementation Summary](./architecture/implementation-summary.md) - Feature implementation details

### Module Documentation

#### Backend Modules

- [Agent Module](../packages/backend/src/agent/README.md) - LangChain AI agents
- [AI Providers](../packages/backend/src/ai-providers/README.md) - Multi-provider AI integration
- [Payment Module](../packages/backend/src/payment/README.md) - Stripe/Paddle integration
- [Interview Module](../packages/backend/src/interview/README.md) - Mock interview system
- [Resume Module](../packages/backend/src/resume/README.md) - Resume management
- [Storage Module](../packages/backend/src/storage/README.md) - File storage abstraction

#### Frontend Directories

- [Services](../packages/frontend/src/services/README.md) - API client services
- [Stores](../packages/frontend/src/stores/README.md) - Zustand state management
- [Pages](../packages/frontend/src/pages/README.md) - Page components
- [Components](../packages/frontend/src/components/README.md) - Reusable UI components

### Deployment & Operations

- [Production Deployment](./deployment/production-deployment.md) - Deployment guide
- [Production Operations](./deployment/production-operations.md) - Operations manual
- [CI/CD Setup](./deployment/ci-cd-setup.md) - Continuous integration
- [Monitoring Setup](../packages/backend/docs/MONITORING_SETUP.md) - Prometheus + Grafana

### Development

- [Quick Start](./development/quick-start.md) - Getting started guide
- [Branch Protection](./development/branch-protection.md) - Git workflow
- [Workflows](./development/workflows.md) - Development workflows

## 🚀 Quick Start Commands

### Development Setup

```bash
# Install dependencies
pnpm install

# Setup environment
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# Start databases
docker-compose up -d postgres redis

# Run migrations
cd packages/backend
pnpm prisma migrate dev

# Seed database
pnpm prisma db seed

# Start development servers
pnpm dev
```

### Common Tasks

#### Backend

```bash
cd packages/backend

# Run tests
pnpm test

# Run specific test
pnpm test interview.service.spec.ts

# Generate Prisma client
pnpm prisma generate

# Create migration
pnpm prisma migrate dev --name migration_name

# View database
pnpm prisma studio

# Build
pnpm build

# Start production
pnpm start:prod
```

#### Frontend

```bash
cd packages/frontend

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build
pnpm build

# Preview production build
pnpm preview

# Lint
pnpm lint

# Type check
pnpm type-check
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# Production deployment
cd deployment
docker-compose -f docker-compose.prod.yml up -d
```

## 🏗️ Project Structure

```
ai-resume/
├── packages/
│   ├── backend/              # NestJS backend
│   │   ├── src/
│   │   │   ├── agent/        # AI agents
│   │   │   ├── ai-providers/ # LLM integration
│   │   │   ├── interview/    # Mock interviews
│   │   │   ├── resume/       # Resume management
│   │   │   ├── payment/      # Payment processing
│   │   │   ├── user/         # User management
│   │   │   └── ...
│   │   ├── prisma/           # Database schema
│   │   └── test/             # Tests
│   └── frontend/             # React frontend
│       ├── src/
│       │   ├── pages/        # Page components
│       │   ├── components/   # UI components
│       │   ├── services/     # API services
│       │   ├── stores/       # State management
│       │   └── ...
│       └── public/           # Static assets
├── docs/                     # Documentation
├── deployment/               # Deployment configs
└── docker-compose.yml        # Development setup
```

## 🔑 Key Concepts

### Backend Architecture

#### Module Pattern

```typescript
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

#### Service Pattern

```typescript
@Injectable()
export class FeatureService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  async operation() {
    // Business logic
  }
}
```

#### Transaction Pattern

```typescript
async criticalOperation() {
  return this.prisma.$transaction(async (tx) => {
    // Step 1: External API
    const result = await externalService.call();

    // Step 2: Update database
    await tx.model.update({ ... });

    return result;
  });
}
```

### Frontend Architecture

#### Store Pattern (Zustand)

```typescript
export const useFeatureStore = create<FeatureState>((set) => ({
  data: null,
  loading: false,

  fetchData: async () => {
    set({ loading: true });
    const data = await featureService.getData();
    set({ data, loading: false });
  },
}));
```

#### Service Pattern

```typescript
class FeatureService {
  async getData() {
    const response = await api.get('/feature');
    return response.data;
  }
}

export const featureService = new FeatureService();
```

#### Component Pattern

```typescript
export const FeatureComponent: React.FC = () => {
  const { data, loading, fetchData } = useFeatureStore();

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Loading />;
  return <div>{data}</div>;
};
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# AI Providers
OPENAI_API_KEY=sk-...
QWEN_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...
GEMINI_API_KEY=...

# Storage
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads

# Payment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Frontend (.env)

```bash
# API
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# Features
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_SENTRY=false
```

## 📊 Database

### Common Prisma Commands

```bash
# Generate client
pnpm prisma generate

# Create migration
pnpm prisma migrate dev --name add_field

# Apply migrations
pnpm prisma migrate deploy

# Reset database
pnpm prisma migrate reset

# Seed database
pnpm prisma db seed

# Open Prisma Studio
pnpm prisma studio
```

### Schema Location

- Schema: `packages/backend/prisma/schema.prisma`
- Migrations: `packages/backend/prisma/migrations/`
- Seeds: `packages/backend/prisma/seeds/`

## 🧪 Testing

### Backend Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:cov

# Run specific test file
pnpm test interview.service.spec.ts

# Run in watch mode
pnpm test:watch

# Run e2e tests
pnpm test:e2e
```

### Frontend Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run specific test
pnpm test FeatureComponent.test.tsx
```

## 🐛 Debugging

### Backend Debugging

```bash
# Start with debug mode
pnpm start:debug

# View logs
tail -f packages/backend/logs/combined.log

# Check Redis
redis-cli
> KEYS *
> GET key_name
```

### Frontend Debugging

```bash
# Start with source maps
pnpm dev

# Check build output
pnpm build
pnpm preview
```

### Database Debugging

```bash
# Connect to PostgreSQL
psql -U postgres -d ai_resume

# View tables
\dt

# Describe table
\d table_name

# Run query
SELECT * FROM "User" LIMIT 10;
```

## 🚨 Common Issues

### Issue: Port already in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Issue: Database connection failed

```bash
# Check PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Check connection
psql -U postgres -h localhost
```

### Issue: Redis connection failed

```bash
# Check Redis is running
docker-compose ps

# Restart Redis
docker-compose restart redis

# Test connection
redis-cli ping
```

### Issue: Prisma client out of sync

```bash
# Regenerate Prisma client
cd packages/backend
pnpm prisma generate
```

### Issue: Module not found

```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Clear build cache
rm -rf dist
pnpm build
```

## 📈 Performance Tips

### Backend

1. Use database indexes for frequently queried fields
2. Implement Redis caching for expensive operations
3. Use Bull queues for async processing
4. Enable Prisma query logging in development
5. Monitor with Prometheus + Grafana

### Frontend

1. Use React.memo for expensive components
2. Implement virtual scrolling for long lists
3. Lazy load routes and components
4. Optimize images (WebP, lazy loading)
5. Use CDN for static assets

## 🔐 Security Checklist

- [ ] Environment variables not committed
- [ ] API keys rotated regularly
- [ ] HTTPS enabled in production
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection (CSP headers)
- [ ] File upload validation
- [ ] JWT tokens with expiration

## 📞 Support

### Documentation

- [System Architecture](./architecture/system-architecture.md)
- [Code Quality](./architecture/code-quality-improvements.md)
- [Deployment Guide](./deployment/production-deployment.md)

### Resources

- NestJS: https://docs.nestjs.com
- Prisma: https://www.prisma.io/docs
- React: https://react.dev
- LangChain: https://js.langchain.com/docs

### Getting Help

1. Check documentation in `docs/` directory
2. Review module README files
3. Check GitHub issues
4. Contact team lead

## 🎯 Next Steps

### For New Developers

1. Read [Quick Start Guide](./development/quick-start.md)
2. Review [System Architecture](./architecture/system-architecture.md)
3. Set up development environment
4. Run the application locally
5. Make your first contribution

### For Experienced Developers

1. Review [Code Quality Improvements](./architecture/code-quality-improvements.md)
2. Check [Implementation Summary](./architecture/implementation-summary.md)
3. Explore module-specific documentation
4. Review open issues and PRs
5. Start contributing

---

**Last Updated**: 2026-01-17
**Version**: 1.0.0
