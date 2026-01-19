# Production Operations Quick Reference

Quick reference guide for common production operations.

## Service Management

### Start All Services

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Stop All Services

```bash
docker-compose -f docker-compose.prod.yml down
```

### Restart Specific Service

```bash
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend
docker-compose -f docker-compose.prod.yml restart nginx
```

### View Service Status

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Scale Services

```bash
# Scale backend to 4 instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=4

# Scale frontend to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale frontend=3
```

## Logs & Monitoring

### View All Logs

```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### View Specific Service Logs

```bash
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f redis
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### View Last N Lines

```bash
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### View Nginx Access Logs

```bash
tail -f logs/nginx/access.log
```

### View Nginx Error Logs

```bash
tail -f logs/nginx/error.log
```

## Database Operations

### Connect to PostgreSQL

```bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U interview_ai_prod_user -d interview_ai_prod
```

### Run Database Migrations

```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Create Database Backup

```bash
docker-compose -f docker-compose.prod.yml exec postgres-backup /backup.sh
```

### List Backups

```bash
ls -lh backups/postgres/
```

### Restore Database

```bash
./scripts/restore-postgres.sh interview_ai_20240101_120000.sql.gz
```

### Check Database Size

```bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U interview_ai_prod_user -d interview_ai_prod -c "SELECT pg_size_pretty(pg_database_size('interview_ai_prod'));"
```

### Vacuum Database

```bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U interview_ai_prod_user -d interview_ai_prod -c "VACUUM ANALYZE;"
```

## Redis Operations

### Connect to Redis

```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a ${REDIS_PASSWORD}
```

### Check Redis Info

```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a ${REDIS_PASSWORD} INFO
```

### Monitor Redis Commands

```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a ${REDIS_PASSWORD} MONITOR
```

### Clear Redis Cache

```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a ${REDIS_PASSWORD} FLUSHDB
```

### Check Redis Memory Usage

```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a ${REDIS_PASSWORD} INFO memory
```

## SSL/TLS Operations

### Renew SSL Certificate

```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Check Certificate Expiry

```bash
docker-compose -f docker-compose.prod.yml run --rm certbot certificates
```

### Test SSL Configuration

```bash
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### Force Certificate Renewal

```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
```

## Health Checks

### Application Health

```bash
curl https://yourdomain.com/health
```

### API Health

```bash
curl https://yourdomain.com/api/v1/health
```

### Database Health

```bash
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U interview_ai_prod_user
```

### Redis Health

```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a ${REDIS_PASSWORD} ping
```

### Nginx Health

```bash
docker-compose -f docker-compose.prod.yml exec nginx nginx -t
```

## Performance Monitoring

### Container Resource Usage

```bash
docker stats
```

### Disk Usage

```bash
df -h
du -sh /var/lib/docker
```

### Memory Usage

```bash
free -h
```

### CPU Usage

```bash
top
htop  # if installed
```

### Network Connections

```bash
netstat -tulpn | grep LISTEN
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs [service]

# Check configuration
docker-compose -f docker-compose.prod.yml config

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build [service]
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart service
docker-compose -f docker-compose.prod.yml restart [service]

# Clear Redis cache
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a ${REDIS_PASSWORD} FLUSHDB
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Check connections
docker-compose -f docker-compose.prod.yml exec postgres psql -U interview_ai_prod_user -d interview_ai_prod -c "SELECT count(*) FROM pg_stat_activity;"

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

### Nginx Configuration Issues

```bash
# Test configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# View error logs
docker-compose -f docker-compose.prod.yml logs nginx
```

## Updates & Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose -f docker-compose.prod.yml build --no-cache

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm backend npx prisma migrate deploy

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

### Update Dependencies

```bash
# Update backend dependencies
docker-compose -f docker-compose.prod.yml exec backend npm update

# Update frontend dependencies
docker-compose -f docker-compose.prod.yml exec frontend npm update

# Rebuild images
docker-compose -f docker-compose.prod.yml build --no-cache
```

### Clean Up Docker

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Complete cleanup
docker system prune -a --volumes
```

## Security Operations

### Rotate JWT Secret

```bash
# 1. Generate new secret
openssl rand -base64 64

# 2. Update .env.production.local
nano .env.production.local

# 3. Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Rotate Database Password

```bash
# 1. Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U interview_ai_prod_user -d interview_ai_prod

# 2. Change password
ALTER USER interview_ai_prod_user WITH PASSWORD 'new-strong-password';

# 3. Update .env.production.local
nano .env.production.local

# 4. Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Review Access Logs

```bash
# Recent access attempts
tail -n 100 logs/nginx/access.log

# Failed requests (4xx, 5xx)
grep -E "\" (4|5)[0-9]{2} " logs/nginx/access.log

# Suspicious activity
grep -E "(sql|script|alert|eval)" logs/nginx/access.log
```

## Backup & Recovery

### Create Full Backup

```bash
# Database backup
docker-compose -f docker-compose.prod.yml exec postgres-backup /backup.sh

# Backup configuration files
tar -czf config-backup-$(date +%Y%m%d).tar.gz config/ .env.production.local

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

### Restore from Backup

```bash
# Stop application
docker-compose -f docker-compose.prod.yml stop backend frontend

# Restore database
./scripts/restore-postgres.sh <backup-file>

# Restart application
docker-compose -f docker-compose.prod.yml start backend frontend
```

### Test Disaster Recovery

```bash
# 1. Create test environment
cp docker-compose.prod.yml docker-compose.test.yml

# 2. Restore backup to test environment
./scripts/restore-postgres.sh <backup-file>

# 3. Verify data integrity
docker-compose -f docker-compose.test.yml exec backend npm run test:e2e

# 4. Clean up test environment
docker-compose -f docker-compose.test.yml down -v
```

## Metrics & Analytics

### View Prometheus Metrics

```bash
curl http://localhost:9090/metrics
```

### Database Query Statistics

```bash
docker-compose -f docker-compose.prod.yml exec postgres psql -U resume_prod_user -d resume_optimizer_prod -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### Redis Statistics

```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a ${REDIS_PASSWORD} INFO stats
```

### Request Rate

```bash
# Requests per minute
tail -n 1000 logs/nginx/access.log | wc -l
```

## Emergency Procedures

### Service Outage

```bash
# 1. Check all services
docker-compose -f docker-compose.prod.yml ps

# 2. Check logs
docker-compose -f docker-compose.prod.yml logs --tail=100

# 3. Restart failed services
docker-compose -f docker-compose.prod.yml restart [service]

# 4. If all else fails, restart everything
docker-compose -f docker-compose.prod.yml restart
```

### Database Corruption

```bash
# 1. Stop application
docker-compose -f docker-compose.prod.yml stop backend

# 2. Restore from latest backup
./scripts/restore-postgres.sh <latest-backup>

# 3. Verify integrity
docker-compose -f docker-compose.prod.yml exec postgres psql -U interview_ai_prod_user -d interview_ai_prod -c "SELECT count(*) FROM users;"

# 4. Restart application
docker-compose -f docker-compose.prod.yml start backend
```

### Security Breach

```bash
# 1. Isolate system
docker-compose -f docker-compose.prod.yml down

# 2. Review logs
grep -r "suspicious-pattern" logs/

# 3. Rotate all secrets
# - Database password
# - Redis password
# - JWT secrets
# - API keys

# 4. Restore from clean backup
./scripts/restore-postgres.sh <clean-backup>

# 5. Update and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

## Contact Information

- **Operations Team**: ops@yourdomain.com
- **Security Team**: security@yourdomain.com
- **On-Call**: +1-XXX-XXX-XXXX
