# Production Deployment Guide

## Overview

This document provides a comprehensive guide for deploying the IntervAI MVP in a production environment.

## Infrastructure Requirements

### 1. Server Configuration
- **OS**: Ubuntu 22.04 LTS or higher
- **CPU**: 4 Cores (Recommended)
- **RAM**: 8GB (Recommended)
- **Disk**: 50GB SSD (Recommended)

### 2. Software Requirements
- **Node.js**: v18.x or v20.x (LTS)
- **Docker**: v24.x or higher
- **Docker Compose**: v2.x or higher
- **Nginx**: v1.18 or higher

## Security Configuration

### 1. SSL/TLS Certificate
Use Let's Encrypt with Certbot for automated SSL.

```bash
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

### 2. Firewall Setup (UFW)
Only expose necessary ports (SSH, HTTP, HTTPS).

### 3. Environment Secrets
Critical secrets: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `AI_PROVIDER_API_KEY`, `ENCRYPTION_KEY`.

## Deployment Steps

1. **Repository Setup**: Clone the repository.
2. **Environment Configuration**: Create `.env.production`.
3. **Nginx Configuration**: Configure reverse proxy for frontend and backend.
4. **Docker Deployment**: Use `docker-compose -f docker-compose.prod.yml up -d`.

## Database Management

- **PostgreSQL**: Ensure encryption at rest and automated daily backups.
- **Redis**: Enable persistence and set a secure password.

## Monitoring & Logging

- **Health Checks**: Monitor `/health` endpoint.
- **Logging**: Use centralized logging (e.g., Grafana Loki).
- **Performance**: Use Prometheus and Grafana for metrics.
