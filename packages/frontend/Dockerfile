# Stage 1: Prune
FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV SHARP_BINARY_HOST=https://npmmirror.com/mirrors/sharp
ENV SHARP_LIBVIPS_BINARY_HOST=https://npmmirror.com/mirrors/sharp-libvips
ENV SASS_BINARY_SITE=https://npmmirror.com/mirrors/node-sass
ENV PYTHON_MIRROR=https://npmmirror.com/mirrors/python
ENV NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
ENV ESBUILD_BINARY_SITE=https://npmmirror.com/mirrors/esbuild

RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm@9
COPY . .
RUN pnpm dlx turbo prune --scope=@resume-optimizer/frontend --docker

# Stage 2: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm@9
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

ENV SHARP_BINARY_HOST=https://npmmirror.com/mirrors/sharp
ENV SHARP_LIBVIPS_BINARY_HOST=https://npmmirror.com/mirrors/sharp-libvips
ENV SASS_BINARY_SITE=https://npmmirror.com/mirrors/node-sass
ENV PYTHON_MIRROR=https://npmmirror.com/mirrors/python
ENV NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node

RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm run build --filter=@resume-optimizer/frontend...

# Stage 3: Runtime
FROM nginx:alpine
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
