# Production Configuration Files

This directory contains production configuration files for the Resume Optimizer application.

## Directory Structure

```
config/
├── postgres/           # PostgreSQL configuration
│   ├── postgresql.conf # Main PostgreSQL configuration
│   └── pg_hba.conf    # Client authentication configuration
├── redis/             # Redis configuration
│   └── redis.conf     # Main Redis configuration
├── nginx/             # Nginx configuration
│   ├── nginx.conf     # Main Nginx configuration
│   └── conf.d/        # Virtual host configurations
│       └── default.conf
└── ssl/               # SSL/TLS certificates (not in git)
    ├── cert.pem       # SSL certificate
    ├── key.pem        # Private key
    └── chain.pem      # Certificate chain
```

## PostgreSQL Configuration

### postgresql.conf

Production-optimized PostgreSQL configuration with:

- Connection pooling (max 200 connections)
- Memory optimization (1GB shared buffers, 3GB effective cache)
- SSL/TLS encryption enabled
- Performance tuning for SSD storage
- Comprehensive logging
- Autovacuum optimization

### pg_hba.conf

Client authentication configuration:

- scram-sha-256 authentication
- SSL required for all connections
- Restricted to Docker network
- Replication support configured

**Important**: After modifying these files, restart PostgreSQL:

```bash
docker-compose -f docker-compose.prod.yml restart postgres
```

## Redis Configuration

### redis.conf

Production-optimized Redis configuration with:

- Password authentication required
- Persistence enabled (AOF + RDB)
- Memory management (512MB with LRU eviction)
- Dangerous commands disabled
- Performance tuning
- Active defragmentation

**Important**: After modifying this file, restart Redis:

```bash
docker-compose -f docker-compose.prod.yml restart redis
```

## Nginx Configuration

### nginx.conf

Main Nginx configuration with:

- Worker process optimization
- Performance tuning
- Gzip compression
- Security headers
- Rate limiting zones
- Upstream server definitions
- Caching configuration

### conf.d/default.conf

Virtual host configuration with:

- HTTP to HTTPS redirect
- SSL/TLS configuration
- Load balancing
- API proxy configuration
- Static asset caching
- Security headers
- Rate limiting

**Important**: After modifying Nginx configuration:

```bash
# Test configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload if test passes
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## SSL/TLS Certificates

SSL certificates are stored in `config/ssl/` but are NOT committed to git for security.

### Let's Encrypt (Recommended)

Certificates are automatically managed by Certbot and stored in `/etc/letsencrypt/` inside the container.

To set up Let's Encrypt:

```bash
./scripts/setup-ssl.sh
```

### Manual Certificate Installation

If using commercial certificates:

1. Copy your certificates:

```bash
cp your-cert.crt config/ssl/cert.pem
cp your-key.key config/ssl/key.pem
cp your-chain.crt config/ssl/chain.pem
```

2. Set proper permissions:

```bash
chmod 600 config/ssl/key.pem
chmod 644 config/ssl/cert.pem
chmod 644 config/ssl/chain.pem
```

3. Update Nginx configuration in `conf.d/default.conf`:

```nginx
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
ssl_trusted_certificate /etc/nginx/ssl/chain.pem;
```

4. Restart Nginx:

```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

## Configuration Best Practices

### Security

- Never commit SSL private keys to version control
- Use strong passwords for database and Redis
- Regularly rotate secrets and certificates
- Keep configuration files readable only by necessary users

### Performance

- Adjust PostgreSQL memory settings based on available RAM
- Monitor Redis memory usage and adjust maxmemory
- Tune Nginx worker processes based on CPU cores
- Enable caching for frequently accessed resources

### Monitoring

- Enable comprehensive logging
- Set up log rotation
- Monitor configuration file changes
- Regular security audits

## Customization

### PostgreSQL Memory Settings

Adjust based on available RAM (assuming 4GB dedicated):

```conf
shared_buffers = 1GB          # 25% of RAM
effective_cache_size = 3GB    # 75% of RAM
maintenance_work_mem = 256MB  # RAM / 16
work_mem = 5MB                # RAM / 200
```

### Redis Memory Settings

Adjust based on cache requirements:

```conf
maxmemory 512mb              # Adjust based on needs
maxmemory-policy allkeys-lru # LRU eviction
```

### Nginx Worker Settings

Adjust based on CPU cores:

```conf
worker_processes auto;        # Auto-detect CPU cores
worker_connections 4096;      # Connections per worker
```

## Troubleshooting

### PostgreSQL Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs postgres

# Verify configuration syntax
docker-compose -f docker-compose.prod.yml exec postgres postgres --check

# Check file permissions
ls -la config/postgres/
```

### Redis Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs redis

# Verify configuration
docker-compose -f docker-compose.prod.yml exec redis redis-server --test-memory 1024

# Check file permissions
ls -la config/redis/
```

### Nginx Configuration Errors

```bash
# Test configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Check syntax
nginx -c config/nginx/nginx.conf -t

# View error logs
docker-compose -f docker-compose.prod.yml logs nginx
```

## References

- [PostgreSQL Configuration](https://www.postgresql.org/docs/current/runtime-config.html)
- [Redis Configuration](https://redis.io/docs/management/config/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [SSL/TLS Best Practices](https://wiki.mozilla.org/Security/Server_Side_TLS)
