# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/backend/package.json packages/backend/
COPY packages/backend/tsconfig.json packages/backend/

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/prisma ./packages/backend/prisma
COPY packages/backend/nest-cli.json ./packages/backend/

# Build application
WORKDIR /app/packages/backend
RUN pnpm run build

# Generate Prisma client
RUN pnpm run prisma:generate

# Stage 2: Runtime stage
FROM node:18-alpine

WORKDIR /app

# Install runtime dependencies only
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/backend/package.json packages/backend/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma

# Copy environment file template
COPY packages/backend/.env.example ./packages/backend/.env.example

WORKDIR /app/packages/backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "dist/main"]
