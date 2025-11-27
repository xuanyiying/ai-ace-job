#!/bin/bash

# Backend Setup Script for Resume Optimizer MVP

set -e

echo "🚀 Starting Resume Optimizer Backend Setup..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if Docker is installed (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker is available"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker is not available. You'll need to install PostgreSQL and Redis manually."
    DOCKER_AVAILABLE=false
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📝 Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
    echo "⚠️  Please edit .env with your configuration before proceeding"
else
    echo "✅ .env file already exists"
fi

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo ""
    read -p "🐳 Do you want to start PostgreSQL and Redis with Docker? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🐳 Starting Docker containers..."
        docker-compose up -d
        echo "⏳ Waiting for services to be ready..."
        sleep 5
        
        # Check if services are healthy
        if docker-compose ps | grep -q "healthy"; then
            echo "✅ Docker services are running"
        else
            echo "⚠️  Docker services may not be fully ready yet. Please wait a moment."
        fi
    fi
fi

echo ""
read -p "🗄️  Do you want to run database migrations now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️  Generating Prisma Client..."
    npm run prisma:generate
    
    echo "🗄️  Running database migrations..."
    npm run prisma:migrate
    
    echo ""
    read -p "🌱 Do you want to seed initial data (templates)? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🌱 Seeding database..."
        npm run prisma:seed
    fi
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "  1. Edit .env file with your configuration (if not done already)"
echo "  2. Start the development server: npm run dev"
echo "  3. Visit http://localhost:3000/api/docs for API documentation"
echo "  4. Check health: curl http://localhost:3000/api/v1/health"
echo ""
echo "📖 For more information, see SETUP.md"
