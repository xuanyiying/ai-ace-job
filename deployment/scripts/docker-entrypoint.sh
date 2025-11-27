#!/bin/bash

# Docker Entrypoint Script for Resume Optimizer
# This script handles initial setup and service startup

set -e

echo "=========================================="
echo "Resume Optimizer - Docker Startup"
echo "=========================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.docker..."
    cp .env.docker .env
    echo "✓ .env file created. Please update it with your configuration."
fi

# Check Docker and Docker Compose
echo ""
echo "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi
echo "✓ Docker is installed: $(docker --version)"

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi
echo "✓ Docker Compose is installed: $(docker-compose --version)"

# Build images
echo ""
echo "Building Docker images..."
docker-compose build

# Start services
echo ""
echo "Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "Waiting for services to be healthy..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose ps | grep -q "healthy"; then
        echo "✓ Services are healthy"
        break
    fi
    attempt=$((attempt + 1))
    echo "Waiting... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "⚠️  Services may not be fully healthy yet. Check with: docker-compose ps"
fi

# Run database migrations
echo ""
echo "Running database migrations..."
docker-compose exec -T backend npx prisma migrate deploy || true

# Seed database
echo ""
echo "Seeding database..."
docker-compose exec -T backend npx prisma db seed || true

# Display service information
echo ""
echo "=========================================="
echo "✓ Setup Complete!"
echo "=========================================="
echo ""
echo "Services are running:"
docker-compose ps
echo ""
echo "Access points:"
echo "  Frontend:  http://localhost"
echo "  Backend:   http://localhost:3000"
echo "  API Docs:  http://localhost:3000/api/v1/docs"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Rebuild:       docker-compose build --no-cache"
echo ""
echo "For more commands, run: make help"
echo ""
