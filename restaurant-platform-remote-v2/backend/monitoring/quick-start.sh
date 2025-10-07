#!/bin/bash

# Phase 20: Monitoring Quick Start Script
# Deploys Prometheus, Grafana, and AlertManager in Docker

set -e

echo "============================================================"
echo "  Restaurant Platform - Monitoring Infrastructure Setup"
echo "============================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/.."

echo "📂 Current directory: $(pwd)"
echo ""

# Check if monitoring configuration exists
if [ ! -f "monitoring/prometheus.yml" ]; then
    echo "ERROR: monitoring/prometheus.yml not found"
    exit 1
fi

if [ ! -f "monitoring/alert-rules.yml" ]; then
    echo "ERROR: monitoring/alert-rules.yml not found"
    exit 1
fi

if [ ! -f "monitoring/alertmanager.yml" ]; then
    echo "ERROR: monitoring/alertmanager.yml not found"
    exit 1
fi

echo "✅ Monitoring configuration files found"
echo ""

# Create Grafana provisioning directories
echo "📁 Creating Grafana provisioning directories..."
mkdir -p monitoring/grafana-provisioning/datasources
mkdir -p monitoring/grafana-provisioning/dashboards

# Create Grafana datasource configuration
cat > monitoring/grafana-provisioning/datasources/prometheus.yml <<EOF
apiVersion: 1

datasources:
  - name: Restaurant Platform Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
EOF

# Create Grafana dashboard provisioning
cat > monitoring/grafana-provisioning/dashboards/dashboard.yml <<EOF
apiVersion: 1

providers:
  - name: 'Restaurant Platform'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

# Copy dashboard JSON to provisioning directory
cp monitoring/grafana-dashboard.json monitoring/grafana-provisioning/dashboards/

echo "✅ Grafana provisioning configured"
echo ""

# Stop existing containers
echo "🛑 Stopping existing monitoring containers (if any)..."
docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || true
echo ""

# Start monitoring stack
echo "🚀 Starting monitoring stack..."
docker-compose -f docker-compose.monitoring.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "🔍 Checking service health..."

# Check Prometheus
if curl -s http://localhost:9090/-/healthy | grep -q "Prometheus is Healthy"; then
    echo "✅ Prometheus is healthy (http://localhost:9090)"
else
    echo "⚠️  Prometheus health check failed"
fi

# Check AlertManager
if curl -s http://localhost:9093/-/healthy | grep -q "OK"; then
    echo "✅ AlertManager is healthy (http://localhost:9093)"
else
    echo "⚠️  AlertManager health check failed"
fi

# Check Grafana
if curl -s http://localhost:3002/api/health | grep -q "ok"; then
    echo "✅ Grafana is healthy (http://localhost:3002)"
else
    echo "⚠️  Grafana health check failed"
fi

# Check Node Exporter
if curl -s http://localhost:9100/metrics | grep -q "node_"; then
    echo "✅ Node Exporter is healthy (http://localhost:9100)"
else
    echo "⚠️  Node Exporter health check failed"
fi

echo ""
echo "============================================================"
echo "  Monitoring Infrastructure Setup Complete!"
echo "============================================================"
echo ""
echo "📊 Access URLs:"
echo "   - Prometheus:    http://localhost:9090"
echo "   - Grafana:       http://localhost:3002"
echo "   - AlertManager:  http://localhost:9093"
echo "   - Node Exporter: http://localhost:9100"
echo ""
echo "🔐 Grafana Login:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo "   - ⚠️  CHANGE PASSWORD ON FIRST LOGIN!"
echo ""
echo "📈 Dashboard:"
echo "   - Already imported: 'Restaurant Platform - Production Monitoring'"
echo "   - Navigate to: Home → Dashboards → Restaurant Platform"
echo ""
echo "🔔 Next Steps:"
echo "   1. Configure AlertManager with real credentials:"
echo "      - Edit monitoring/alertmanager.yml"
echo "      - Add PagerDuty service key"
echo "      - Add Slack webhook URL"
echo "      - Add SMTP credentials"
echo "   2. Reload AlertManager:"
echo "      docker-compose -f docker-compose.monitoring.yml restart alertmanager"
echo "   3. Change Grafana admin password"
echo "   4. Test alerts with: curl -X POST http://localhost:3001/api/v1/printing/printers/invalid/test"
echo ""
echo "📚 Documentation:"
echo "   - Deployment Guide: monitoring/DEPLOYMENT_GUIDE.md"
echo "   - Complete Documentation: ../claudedocs/PHASE_20_MONITORING_COMPLETE.md"
echo ""
echo "🛠️  Useful Commands:"
echo "   - View logs:    docker-compose -f docker-compose.monitoring.yml logs -f"
echo "   - Stop stack:   docker-compose -f docker-compose.monitoring.yml down"
echo "   - Restart:      docker-compose -f docker-compose.monitoring.yml restart"
echo "   - Status:       docker-compose -f docker-compose.monitoring.yml ps"
echo ""
echo "✅ Setup complete! Happy monitoring! 🎉"
echo ""
