# Production Deployment Guide

## Overview

This document provides a comprehensive guide for deploying the IntervAI MVP in a production environment. It covers infrastructure requirements, security configuration, deployment steps, and post-deployment validation.

## Infrastructure Requirements

### 1. Server Configuration
- **Operating System**: Ubuntu 22.04 LTS or higher
- **CPU**: 4 Cores (Recommended)
- **RAM**: 8GB (Recommended)
- **Disk**: 50GB SSD (Recommended)
- **Network**: 100Mbps+ connection with public IP

### 2. Software Requirements
- **Node.js**: v18.x or v20.x (LTS)
- **Docker**: v24.x or higher
- **Docker Compose**: v2.x or higher
- **Nginx**: v1.18 or higher (for reverse proxy and SSL)
- **PostgreSQL**: v14.x or higher
- **Redis**: v6.x or higher

### 3. Cloud Services (Optional but Recommended)
- **Object Storage**: AWS S3 or Alibaba Cloud OSS for resume and artifact storage
- **CDN**: Cloudflare or Alibaba Cloud CDN for static asset delivery
- **Managed Database**: AWS RDS or Alibaba Cloud ApsaraDB for high availability

---

## Security Configuration

### 1. SSL/TLS Certificate
We use Let's Encrypt for free, automated SSL certificates.

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain Certificate
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

### 2. Firewall Setup (UFW)
Only expose necessary ports.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### 3. Environment Secrets
Never commit `.env` files to version control. Use a secure method to inject secrets (e.g., GitHub Secrets, Vault, or manually created `.env.production` file).

Critical secrets:
- `DATABASE_URL`: PostgreSQL connection string (encrypted at rest)
- `REDIS_URL`: Redis connection string (encrypted at rest)
- `JWT_SECRET`: Secure random string for token signing
- `AI_PROVIDER_API_KEY`: API key for LLM services (GPT, Gemini, etc.)
- `ENCRYPTION_KEY`: 32-byte key for sensitive data encryption

---

## Deployment Steps

### 1. Repository Setup
```bash
git clone https://github.com/your-org/ai-resume.git
cd ai-resume
```

### 2. Environment Configuration
Create `/etc/ai-resume/.env.production` with appropriate values.

### 3. Nginx Configuration
Create `/etc/nginx/sites-available/ai-resume` and link to `sites-enabled`.

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000; # Frontend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001; # Backend API
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Docker Deployment
Use Docker Compose for orchestrated deployment.

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

---

## Database Management

### 1. PostgreSQL Configuration
Ensure data is encrypted at rest and backups are automated.

### 2. Redis Configuration
Enable persistence (RDB or AOF) and set a secure password.

### 3. Backups
Implement daily automated backups for PostgreSQL.

```bash
# Example backup script
pg_dump $DATABASE_URL > /backups/db_$(date +%F).sql
# Sync to object storage
aws s3 cp /backups/db_$(date +%F).sql s3://your-backup-bucket/
```

---

## Monitoring & Logging

### 1. Health Checks
Implement a `/health` endpoint in the backend and monitor it.

### 2. Logging
Use a centralized logging solution (e.g., ELK stack or Grafana Loki). Docker logs can be viewed with:

```bash
docker-compose -f docker-compose.prod.yml logs -f --tail 100
```

### 3. Performance Monitoring
Use tools like Prometheus and Grafana for system and application metrics.

---

## Troubleshooting

### 1. Service Fails to Start
Check logs: `docker-compose logs <service-name>`
Verify environment variables: `docker-compose exec <service-name> env`

### 2. Database Connection Issues
Verify `DATABASE_URL` is correct and PostgreSQL is reachable from the container.

### 3. SSL Errors
Check Certbot status: `sudo certbot certificates`
Check Nginx configuration: `sudo nginx -t`
