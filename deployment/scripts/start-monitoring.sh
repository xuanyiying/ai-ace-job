#!/bin/bash

# Start Monitoring Stack Script
# Requirement 10.5, 12.6: Quick start script for monitoring infrastructure

set -e

echo "🚀 Starting IntervAI Monitoring Stack..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed."
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/.."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p grafana/provisioning/datasources
mkdir -p grafana/provisioning/dashboards
mkdir -p logs

# Start monitoring services
echo "🐳 Starting monitoring services..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check Prometheus
if curl -s http://localhost:9090/-/healthy > /dev/null; then
    echo "✅ Prometheus is healthy (http://localhost:9090)"
else
    echo "⚠️  Prometheus may not be ready yet"
fi

# Check Grafana
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Grafana is healthy (http://localhost:3001)"
    echo "   Default credentials: admin/admin"
else
    echo "⚠️  Grafana may not be ready yet"
fi

# Check AlertManager
if curl -s http://localhost:9093/-/healthy > /dev/null; then
    echo "✅ AlertManager is healthy (http://localhost:9093)"
else
    echo "⚠️  AlertManager may not be ready yet"
fi

# Check Loki
if curl -s http://localhost:3100/ready > /dev/null; then
    echo "✅ Loki is healthy (http://localhost:3100)"
else
    echo "⚠️  Loki may not be ready yet"
fi

echo ""
echo "🎉 Monitoring stack started successfully!"
echo ""
echo "📊 Access the following services:"
echo "   - Grafana:      http://localhost:3001 (admin/admin)"
echo "   - Prometheus:   http://localhost:9090"
echo "   - AlertManager: http://localhost:9093"
echo "   - Loki:         http://localhost:3100"
echo ""
echo "📝 Next steps:"
echo "   1. Configure Sentry DSN in .env file"
echo "   2. Configure Slack webhook in .env file"
echo "   3. Start the application: npm run dev"
echo "   4. View metrics at: http://localhost:3000/api/v1/metrics"
echo ""
echo "📖 For more information, see MONITORING.md"
