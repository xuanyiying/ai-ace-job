# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/frontend/package.json packages/frontend/
COPY packages/frontend/tsconfig.json packages/frontend/
COPY packages/frontend/tsconfig.node.json packages/frontend/
COPY packages/frontend/vite.config.ts packages/frontend/

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY packages/frontend/src ./packages/frontend/src
COPY packages/frontend/index.html ./packages/frontend/

# Build application
WORKDIR /app/packages/frontend
RUN pnpm run build

# Stage 2: Runtime stage - Nginx
FROM nginx:alpine

# Copy nginx configuration
COPY packages/frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
