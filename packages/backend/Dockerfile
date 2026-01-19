# Stage 1: Prune
FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm@9
COPY . .
RUN pnpm dlx turbo prune --scope=@interview-ai/backend --docker

# Stage 2: Build
# Stage 2: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++ openssl
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-factor 2 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm install -g pnpm@9
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Set Prisma binary mirror to speed up download
ENV PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
# Add more mirrors for other binaries
ENV SHARP_BINARY_HOST=https://npmmirror.com/mirrors/sharp
ENV SHARP_LIBVIPS_BINARY_HOST=https://npmmirror.com/mirrors/sharp-libvips
ENV SASS_BINARY_SITE=https://npmmirror.com/mirrors/node-sass
ENV PYTHON_MIRROR=https://npmmirror.com/mirrors/python
ENV NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV SENTRYCLI_CDNURL=https://npmmirror.com/mirrors/sentry-cli/
ENV ESBUILD_BINARY_SITE=https://npmmirror.com/mirrors/esbuild

RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --no-frozen-lockfile --ignore-scripts

COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
RUN cd packages/backend && pnpm prisma generate
RUN pnpm run build --filter=@interview-ai/backend...

# Deploy the package with production dependencies to a specific directory
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN pnpm deploy --filter=@interview-ai/backend --prod /app/deploy

# Copy built artifacts and other necessary files to the deploy directory
RUN cp -r packages/backend/dist /app/deploy/dist && \
    cp -r packages/backend/prisma /app/deploy/prisma && \
    cp packages/backend/.env.example /app/deploy/.env.example

# Generate Prisma Client in the deploy directory to ensure correct paths
RUN npm install -g prisma@5.22.0 && \
    cd /app/deploy && \
    prisma generate

# Stage 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Install Chromium
RUN apk add --no-cache chromium

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy the fully prepared deploy directory
COPY --from=builder --chown=nestjs:nodejs /app/deploy /app

USER nestjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "dist/main"]
