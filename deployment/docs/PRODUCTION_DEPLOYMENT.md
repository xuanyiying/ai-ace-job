# Production Deployment Guide

This guide covers the complete production deployment of the Resume Optimizer application, including PostgreSQL database, Redis cache, object storage, SSL/TLS configuration, and load balancing.

## Requirements

This deployment satisfies the following requirements:

- **Requirement 9.1**: HTTPS/TLS encryption for all data transmission
- **Requirement 9.3**: Encrypted object storage (S3/OSS)
- **Requirement 9.5**: Automated database backups
- **Requirement 10.5**: High availability and performance optimization

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ or CentOS 8+ recommended)
- **CPU**: Minimum 4 cores (8+ recommended for production)
- **RAM**: Minimum 8GB (16GB+ recommended)
- **Storage**: Minimum 100GB SSD
- **Network**: Static IP address with ports 80 and 443 accessible

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Domain name with DNS configured
- SSL certificate (Let's Encrypt or commercial)

### Cloud Services

Choose one object storage provider:

#### Option 1: AWS S3

- AWS Account with S3 access
- IAM user with S3 permissions
- S3 bucket created with encryption enabled

#### Option 2: Aliyun OSS

- Aliyun Account with OSS access
- RAM user with OSS permissions
- OSS bucket created with encryption enabled

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
└─────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS (443)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Nginx Load Balancer                         │
│         (SSL/TLS Termination + Rate Limiting)           │
└─────────────────────────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│  Backend API     │          │  Frontend App    │
│  (NestJS)        │          │  (React)         │
│  Replicas: 2     │          │  Replicas: 2     │
└──────────────────┘          └──────────────────┘
          │
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ PostgreSQL   │  │    Redis     │  │  S3/OSS      │ │
│  │ (Primary)    │  │   (Cache)    │  │  (Storage)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Step-by-Step Deployment

### Step 1: Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/resume-optimizer.git
cd resume-optimizer

# Checkout production branch
git checkout main
```

### Step 3: Configure Environment

```bash
# Copy production environment template
cp .env.production .env.production.local

# Edit configuration
nano .env.production.local
```

**Critical Configuration Items:**

1. **Database Credentials** (Requirement 9.1)

   ```bash
   POSTGRES_PASSWORD=<strong-random-password>
   DATABASE_URL=postgresql://resume_prod_user:<password>@postgres:5432/resume_optimizer_prod
   ```

2. **Redis Password** (Requirement 9.1)

   ```bash
   REDIS_PASSWORD=<strong-random-password>
   ```

3. **JWT Secrets** (Requirement 9.2)

   ```bash
   JWT_SECRET=<64-character-random-string>
   JWT_REFRESH_SECRET=<64-character-random-string>
   ```

4. **OpenAI API Key**

   ```bash
   OPENAI_API_KEY=sk-your-actual-api-key
   ```

5. **Object Storage** (Requirement 9.3)

   For AWS S3:

   ```bash
   STORAGE_PROVIDER=s3
   AWS_ACCESS_KEY_ID=<your-access-key>
   AWS_SECRET_ACCESS_KEY=<your-secret-key>
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=resume-optimizer-prod-files
   AWS_S3_ENCRYPTION=AES256
   ```

   For Aliyun OSS:

   ```bash
   STORAGE_PROVIDER=oss
   ALIYUN_ACCESS_KEY_ID=<your-access-key>
   ALIYUN_ACCESS_KEY_SECRET=<your-secret-key>
   ALIYUN_OSS_REGION=oss-cn-hangzhou
   ALIYUN_OSS_BUCKET=resume-optimizer-prod-files
   ALIYUN_OSS_ENCRYPTION=AES256
   ```

6. **Domain Configuration** (Requirement 9.1)

   ```bash
   DOMAIN=yourdomain.com
   CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
   LETSENCRYPT_EMAIL=admin@yourdomain.com
   ```

7. **Monitoring** (Requirement 10.5, 12.6)
   ```bash
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

### Step 4: Configure Object Storage

#### AWS S3 Setup

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure

# Create S3 bucket with encryption
aws s3api create-bucket \
    --bucket resume-optimizer-prod-files \
    --region us-east-1 \
    --create-bucket-configuration LocationConstraint=us-east-1

# Enable encryption (Requirement 9.3)
aws s3api put-bucket-encryption \
    --bucket resume-optimizer-prod-files \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }'

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket resume-optimizer-prod-files \
    --versioning-configuration Status=Enabled

# Configure lifecycle policy (Requirement 9.6)
aws s3api put-bucket-lifecycle-configuration \
    --bucket resume-optimizer-prod-files \
    --lifecycle-configuration file://s3-lifecycle-policy.json
```

Create `s3-lifecycle-policy.json`:

```json
{
  "Rules": [
    {
      "Id": "DeleteOldFiles",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "resumes/"
      },
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

#### Aliyun OSS Setup

```bash
# Install ossutil
wget http://gosspublic.alicdn.com/ossutil/1.7.14/ossutil64
chmod 755 ossutil64
sudo mv ossutil64 /usr/local/bin/ossutil

# Configure OSS
ossutil config

# Create bucket with encryption
ossutil mb oss://resume-optimizer-prod-files

# Enable encryption (Requirement 9.3)
ossutil bucket-encryption --method put oss://resume-optimizer-prod-files AES256

# Configure lifecycle rules (Requirement 9.6)
ossutil lifecycle --method put oss://resume-optimizer-prod-files lifecycle.xml
```

### Step 5: Deploy Application

```bash
# Make deployment script executable
chmod +x scripts/deploy-production.sh

# Run deployment
./scripts/deploy-production.sh
```

The deployment script will:

1. Validate environment configuration
2. Build Docker images
3. Start database services
4. Run database migrations
5. Seed initial data
6. Start application services
7. Start Nginx load balancer
8. Start backup service
9. Perform health checks

### Step 6: Configure SSL/TLS (Requirement 9.1)

```bash
# Make SSL setup script executable
chmod +x scripts/setup-ssl.sh

# Run SSL setup
./scripts/setup-ssl.sh
```

This will:

1. Generate temporary self-signed certificate
2. Start Nginx
3. Obtain Let's Encrypt certificate
4. Configure automatic renewal

**Manual SSL Certificate (Alternative):**

If using a commercial SSL certificate:

```bash
# Copy your certificates
cp your-cert.crt config/ssl/cert.pem
cp your-key.key config/ssl/key.pem
cp your-chain.crt config/ssl/chain.pem

# Update Nginx configuration
nano config/nginx/conf.d/default.conf

# Restart Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### Step 7: Configure DNS

Point your domain to the server IP:

```
A Record:     yourdomain.com      →  YOUR_SERVER_IP
A Record:     www.yourdomain.com  →  YOUR_SERVER_IP
```

Wait for DNS propagation (can take up to 48 hours).

### Step 8: Verify Deployment

```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl https://yourdomain.com/health

# Test API endpoint
curl https://yourdomain.com/api/v1/health
```

## Database Configuration

### PostgreSQL Production Settings

The production PostgreSQL configuration includes:

- **Connection pooling**: Max 200 connections
- **Memory optimization**: 1GB shared buffers, 3GB effective cache
- **SSL/TLS encryption** (Requirement 9.1)
- **Performance tuning** for SSD storage
- **Comprehensive logging** (Requirement 12.5)
- **Automated backups** (Requirement 9.5)

### Database Backups (Requirement 9.5)

Automated daily backups are configured:

```bash
# Manual backup
docker-compose -f docker-compose.prod.yml exec postgres-backup /backup.sh

# List backups
ls -lh backups/postgres/

# Restore from backup
./scripts/restore-postgres.sh resume_optimizer_20240101_120000.sql.gz
```

**Backup Configuration:**

- Frequency: Daily at 2 AM
- Retention: 30 days (configurable)
- Format: Compressed PostgreSQL custom format
- Location: Local + S3 (optional)

## Redis Configuration

Production Redis configuration includes:

- **Password authentication** (Requirement 9.1)
- **Persistence**: AOF + RDB snapshots
- **Memory management**: 512MB with LRU eviction
- **Performance tuning**: Optimized for caching workload
- **Disabled dangerous commands**: FLUSHDB, FLUSHALL, CONFIG

## Load Balancing & High Availability

### Nginx Configuration

- **SSL/TLS termination** (Requirement 9.1)
- **Load balancing**: Least connections algorithm
- **Rate limiting** (Requirement 11.1)
- **Health checks**: Automatic failover
- **Caching**: Static assets cached for 1 year
- **Compression**: Gzip enabled for text content

### Scaling

To add more backend instances:

```yaml
# In docker-compose.prod.yml
backend:
  deploy:
    replicas: 4 # Increase from 2 to 4
```

Update Nginx upstream configuration:

```nginx
upstream backend_servers {
    least_conn;
    server backend:3000 max_fails=3 fail_timeout=30s;
    server backend-2:3000 max_fails=3 fail_timeout=30s;
    server backend-3:3000 max_fails=3 fail_timeout=30s;
    server backend-4:3000 max_fails=3 fail_timeout=30s;
}
```

## Monitoring & Alerting (Requirement 10.5, 12.6)

### Health Checks

```bash
# Application health
curl https://yourdomain.com/health

# Database health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Redis health
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend

# View Nginx access logs
tail -f logs/nginx/access.log

# View Nginx error logs
tail -f logs/nginx/error.log
```

### Metrics

Access Prometheus metrics:

```bash
curl http://localhost:9090/metrics
```

### Sentry Integration

Error tracking is automatically configured via `SENTRY_DSN` environment variable.

## Security Checklist (Requirement 9.1, 9.4)

- [x] HTTPS/TLS 1.3 enabled
- [x] Strong passwords for database and Redis
- [x] JWT secrets are random and secure
- [x] Object storage encryption enabled
- [x] Database connections use SSL
- [x] Security headers configured (HSTS, CSP, etc.)
- [x] Rate limiting enabled
- [x] File upload validation
- [x] CORS properly configured
- [x] Dangerous Redis commands disabled
- [x] Database backups encrypted
- [x] Firewall configured (ports 80, 443 only)

## Performance Optimization (Requirement 10.5)

### Database Optimization

- Indexes on frequently queried columns
- Connection pooling (2-10 connections)
- Query timeout: 30 seconds
- Prepared statements for common queries

### Caching Strategy

- Resume parsing results: 24 hours
- AI responses: 1 hour
- Static assets: 1 year
- API responses: Varies by endpoint

### CDN Integration (Optional)

For better global performance, integrate with CloudFront or Aliyun CDN:

```bash
# Configure CDN origin
Origin: https://yourdomain.com
Cache behavior: Cache based on headers
TTL: 1 year for static assets
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check memory
free -h

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### SSL Certificate Issues

```bash
# Test certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Renew certificate manually
docker-compose -f docker-compose.prod.yml run --rm certbot renew

# Check certificate expiry
docker-compose -f docker-compose.prod.yml run --rm certbot certificates
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection
docker-compose -f docker-compose.prod.yml exec postgres psql -U resume_prod_user -d resume_optimizer_prod

# Check connection pool
docker-compose -f docker-compose.prod.yml exec backend npx prisma studio
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Adjust resource limits in docker-compose.prod.yml
```

## Maintenance

### Regular Tasks

1. **Daily**: Monitor logs and metrics
2. **Weekly**: Review backup integrity
3. **Monthly**: Update dependencies and security patches
4. **Quarterly**: Review and optimize database queries

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy
```

### Backup Verification

```bash
# Test restore on staging environment
./scripts/restore-postgres.sh <backup-file>

# Verify data integrity
docker-compose -f docker-compose.prod.yml exec backend npm run test:e2e
```

## Disaster Recovery

### Database Recovery

```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
./scripts/restore-postgres.sh <backup-file>

# Restart application
docker-compose -f docker-compose.prod.yml start backend
```

### Complete System Recovery

```bash
# Restore from backups
./scripts/restore-postgres.sh <latest-backup>

# Restore object storage (if needed)
aws s3 sync s3://backup-bucket/resumes/ s3://resume-optimizer-prod-files/resumes/

# Restart all services
docker-compose -f docker-compose.prod.yml restart
```

## Support

For issues or questions:

- Check logs: `docker-compose -f docker-compose.prod.yml logs`
- Review documentation: `README.md`
- Contact: ops@yourdomain.com
