#!/bin/bash
# SSL Certificate Setup Script
# Requirement 9.1 - SSL/TLS Configuration

set -e

# Configuration
DOMAIN=${DOMAIN:-yourdomain.com}
EMAIL=${LETSENCRYPT_EMAIL:-admin@yourdomain.com}
STAGING=${LETSENCRYPT_STAGING:-false}

echo "=========================================="
echo "SSL Certificate Setup for Resume Optimizer"
echo "=========================================="
echo "Domain: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo "Staging: ${STAGING}"
echo ""

# Check if domain is configured
if [ "${DOMAIN}" = "yourdomain.com" ]; then
    echo "ERROR: Please configure your domain in .env.production"
    echo "Set DOMAIN=your-actual-domain.com"
    exit 1
fi

# Check if email is configured
if [ "${EMAIL}" = "admin@yourdomain.com" ]; then
    echo "WARNING: Using default email. Please configure LETSENCRYPT_EMAIL in .env.production"
fi

# Create directories
mkdir -p config/ssl
mkdir -p certbot/www
mkdir -p certbot/conf

echo ""
echo "Step 1: Generating self-signed certificate for initial setup..."
echo "This will be replaced by Let's Encrypt certificate."

# Generate self-signed certificate for initial setup
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout config/ssl/key.pem \
    -out config/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN}"

echo "✓ Self-signed certificate generated"

echo ""
echo "Step 2: Starting Nginx with self-signed certificate..."
docker-compose -f docker-compose.prod.yml up -d nginx

echo "✓ Nginx started"

echo ""
echo "Step 3: Obtaining Let's Encrypt certificate..."

# Determine staging flag
STAGING_FLAG=""
if [ "${STAGING}" = "true" ]; then
    STAGING_FLAG="--staging"
    echo "Using Let's Encrypt staging environment (for testing)"
fi

# Request certificate
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    ${STAGING_FLAG} \
    -d ${DOMAIN} \
    -d www.${DOMAIN}

if [ $? -eq 0 ]; then
    echo "✓ Let's Encrypt certificate obtained successfully"
    
    echo ""
    echo "Step 4: Updating Nginx configuration..."
    
    # Update nginx configuration with actual domain
    sed -i.bak "s/yourdomain.com/${DOMAIN}/g" config/nginx/conf.d/default.conf
    
    echo "✓ Nginx configuration updated"
    
    echo ""
    echo "Step 5: Reloading Nginx..."
    docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
    
    echo "✓ Nginx reloaded"
    
    echo ""
    echo "=========================================="
    echo "SSL Setup Complete!"
    echo "=========================================="
    echo "Your site is now accessible at:"
    echo "  https://${DOMAIN}"
    echo "  https://www.${DOMAIN}"
    echo ""
    echo "Certificate will auto-renew via certbot container."
else
    echo "ERROR: Failed to obtain Let's Encrypt certificate"
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure your domain DNS is pointing to this server"
    echo "2. Ensure ports 80 and 443 are open"
    echo "3. Check certbot logs: docker-compose -f docker-compose.prod.yml logs certbot"
    echo ""
    echo "For testing, you can use staging certificates:"
    echo "  LETSENCRYPT_STAGING=true ./scripts/setup-ssl.sh"
    exit 1
fi
