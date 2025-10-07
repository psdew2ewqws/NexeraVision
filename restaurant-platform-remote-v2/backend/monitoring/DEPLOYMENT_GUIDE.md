# Phase 20: Monitoring & Observability - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the comprehensive monitoring infrastructure for the Restaurant Platform, including Prometheus, Grafana, and AlertManager.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Monitoring Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Backend    │───▶│  Prometheus  │───▶│   Grafana    │      │
│  │  (Port 3001) │    │  (Port 9090) │    │  (Port 3002) │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                    │                    │              │
│         │                    ▼                    │              │
│         │            ┌──────────────┐             │              │
│         │            │ AlertManager │             │              │
│         │            │  (Port 9093) │             │              │
│         │            └──────────────┘             │              │
│         │                    │                    │              │
│         ▼                    ▼                    ▼              │
│  ┌─────────────────────────────────────────────────────┐        │
│  │           PagerDuty / Slack / Email                 │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+) or macOS
- **CPU**: 2+ cores recommended
- **RAM**: 4GB+ (2GB for Prometheus, 1GB for Grafana, 512MB for AlertManager)
- **Disk**: 50GB+ for 30-day retention
- **Network**: Ports 9090, 9093, 3002 available

### Software Dependencies
- Docker and Docker Compose (recommended) OR
- Native installation: Prometheus, Grafana, AlertManager binaries

## Installation Methods

### Method 1: Docker Compose (Recommended)

#### Step 1: Create Docker Compose Configuration

Create `docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: restaurant-platform-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alert-rules.yml:/etc/prometheus/alert-rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--storage.tsdb.retention.size=50GB'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: restaurant-platform-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: restaurant-platform-grafana
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123  # Change in production
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=http://localhost:3002
    volumes:
      - ./monitoring/grafana-dashboard.json:/var/lib/grafana/dashboards/restaurant-platform.json
      - grafana-data:/var/lib/grafana
    restart: unless-stopped
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: restaurant-platform-node-exporter
    ports:
      - "9100:9100"
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  prometheus-data:
  alertmanager-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
```

#### Step 2: Configure AlertManager Secrets

Edit `monitoring/alertmanager.yml` and replace placeholders:
- `YOUR_PAGERDUTY_SERVICE_KEY` - Get from PagerDuty integration
- `YOUR_SLACK_WEBHOOK_URL` - Get from Slack workspace settings
- `YOUR_SMTP_PASSWORD` - Email account password

#### Step 3: Start Monitoring Stack

```bash
cd /home/admin/restaurant-platform-remote-v2/backend

# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify all services are running
docker-compose -f docker-compose.monitoring.yml ps

# Check logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

#### Step 4: Verify Installation

```bash
# Check Prometheus is scraping metrics
curl http://localhost:9090/api/v1/targets

# Check backend metrics endpoint
curl http://localhost:3001/api/v1/metrics

# Check AlertManager
curl http://localhost:9093/api/v2/alerts
```

### Method 2: Native Installation (Linux)

#### Step 1: Install Prometheus

```bash
# Download Prometheus
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-2.45.0.linux-amd64.tar.gz
sudo mv prometheus-2.45.0.linux-amd64 /opt/prometheus

# Copy configuration
sudo cp /home/admin/restaurant-platform-remote-v2/backend/monitoring/prometheus.yml /opt/prometheus/
sudo cp /home/admin/restaurant-platform-remote-v2/backend/monitoring/alert-rules.yml /opt/prometheus/

# Create systemd service
sudo tee /etc/systemd/system/prometheus.service > /dev/null <<EOF
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/opt/prometheus/prometheus \\
  --config.file=/opt/prometheus/prometheus.yml \\
  --storage.tsdb.path=/var/lib/prometheus \\
  --storage.tsdb.retention.time=30d \\
  --storage.tsdb.retention.size=50GB \\
  --web.console.templates=/opt/prometheus/consoles \\
  --web.console.libraries=/opt/prometheus/console_libraries

[Install]
WantedBy=multi-user.target
EOF

# Create user and directories
sudo useradd --no-create-home --shell /bin/false prometheus
sudo mkdir -p /var/lib/prometheus
sudo chown -R prometheus:prometheus /var/lib/prometheus /opt/prometheus

# Start service
sudo systemctl daemon-reload
sudo systemctl enable prometheus
sudo systemctl start prometheus
sudo systemctl status prometheus
```

#### Step 2: Install AlertManager

```bash
# Download AlertManager
cd /tmp
wget https://github.com/prometheus/alertmanager/releases/download/v0.26.0/alertmanager-0.26.0.linux-amd64.tar.gz
tar xvfz alertmanager-0.26.0.linux-amd64.tar.gz
sudo mv alertmanager-0.26.0.linux-amd64 /opt/alertmanager

# Copy configuration
sudo cp /home/admin/restaurant-platform-remote-v2/backend/monitoring/alertmanager.yml /opt/alertmanager/

# Create systemd service
sudo tee /etc/systemd/system/alertmanager.service > /dev/null <<EOF
[Unit]
Description=AlertManager
Wants=network-online.target
After=network-online.target

[Service]
User=alertmanager
Group=alertmanager
Type=simple
ExecStart=/opt/alertmanager/alertmanager \\
  --config.file=/opt/alertmanager/alertmanager.yml \\
  --storage.path=/var/lib/alertmanager

[Install]
WantedBy=multi-user.target
EOF

# Create user and directories
sudo useradd --no-create-home --shell /bin/false alertmanager
sudo mkdir -p /var/lib/alertmanager
sudo chown -R alertmanager:alertmanager /var/lib/alertmanager /opt/alertmanager

# Start service
sudo systemctl daemon-reload
sudo systemctl enable alertmanager
sudo systemctl start alertmanager
sudo systemctl status alertmanager
```

#### Step 3: Install Grafana

```bash
# Add Grafana repository
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -

# Install Grafana
sudo apt-get update
sudo apt-get install -y grafana

# Start service
sudo systemctl daemon-reload
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
sudo systemctl status grafana-server
```

## Grafana Setup

### Step 1: Access Grafana

1. Open browser: `http://localhost:3002`
2. Login credentials:
   - Username: `admin`
   - Password: `admin123` (change immediately)

### Step 2: Add Prometheus Data Source

1. Navigate to **Configuration** → **Data Sources**
2. Click **Add data source**
3. Select **Prometheus**
4. Configure:
   - **Name**: `Restaurant Platform Prometheus`
   - **URL**: `http://localhost:9090` (Docker) or `http://prometheus:9090` (native)
5. Click **Save & Test**

### Step 3: Import Dashboard

1. Navigate to **Dashboards** → **Import**
2. Click **Upload JSON file**
3. Select: `/home/admin/restaurant-platform-remote-v2/backend/monitoring/grafana-dashboard.json`
4. Select data source: `Restaurant Platform Prometheus`
5. Click **Import**

### Step 4: Configure Alerts

1. Navigate to **Alerting** → **Contact points**
2. Add contact points:
   - **PagerDuty**: Use integration key
   - **Slack**: Use webhook URL
   - **Email**: Configure SMTP settings
3. Navigate to **Notification policies**
4. Configure routing based on severity labels

## Alert Integration Setup

### PagerDuty Integration

1. Log in to PagerDuty
2. Navigate to **Services** → **Service Directory**
3. Create new service: "Restaurant Platform Monitoring"
4. Integration type: **Prometheus**
5. Copy **Integration Key**
6. Update `alertmanager.yml`:
   ```yaml
   service_key: 'YOUR_INTEGRATION_KEY_HERE'
   ```

### Slack Integration

1. Log in to Slack workspace
2. Navigate to **Apps** → **Incoming Webhooks**
3. Add to workspace
4. Select channel: `#platform-alerts-warnings`
5. Copy **Webhook URL**
6. Update `alertmanager.yml`:
   ```yaml
   slack_api_url: 'https://hooks.slack.com/services/YOUR_WEBHOOK_URL'
   ```

### Email Configuration

1. Configure SMTP settings in `alertmanager.yml`:
   ```yaml
   smtp_smarthost: 'smtp.gmail.com:587'
   smtp_from: 'alerts@restaurant-platform.com'
   smtp_auth_username: 'alerts@restaurant-platform.com'
   smtp_auth_password: 'YOUR_APP_PASSWORD'
   smtp_require_tls: true
   ```

2. For Gmail:
   - Enable 2FA
   - Generate App Password
   - Use App Password in configuration

## Verification & Testing

### Health Checks

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check AlertManager status
curl http://localhost:9093/api/v2/status | jq

# Check Grafana health
curl http://localhost:3002/api/health

# Test backend metrics endpoint
curl http://localhost:3001/api/v1/metrics | grep restaurant_platform
```

### Trigger Test Alert

```bash
# Create test print failure to trigger alert
curl -X POST http://localhost:3001/api/v1/printing/printers/test-invalid-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# This should trigger print test failure alert in ~5 minutes
```

### Query Prometheus Metrics

```bash
# WebSocket connections
curl 'http://localhost:9090/api/v1/query?query=websocket_connections_total'

# Print test success rate
curl 'http://localhost:9090/api/v1/query?query=rate(print_test_requests_total{status="success"}[5m])'

# Error rate
curl 'http://localhost:9090/api/v1/query?query=rate(http_request_errors_total[1m])'
```

## Production Deployment Checklist

### Security
- [ ] Change Grafana admin password
- [ ] Enable HTTPS for all services
- [ ] Configure firewall rules (allow only internal IPs)
- [ ] Secure AlertManager webhook endpoints
- [ ] Rotate service keys and tokens

### Configuration
- [ ] Update `prometheus.yml` with production targets
- [ ] Configure `alertmanager.yml` with real credentials
- [ ] Set appropriate data retention policies
- [ ] Configure backup for Prometheus data
- [ ] Set resource limits (CPU, memory)

### Monitoring
- [ ] Verify all scrape targets are healthy
- [ ] Test all alert rules fire correctly
- [ ] Verify PagerDuty integration
- [ ] Verify Slack notifications
- [ ] Test email alerts
- [ ] Import Grafana dashboard
- [ ] Configure dashboard refresh intervals

### Documentation
- [ ] Document runbook procedures
- [ ] Create on-call rotation schedule
- [ ] Document alert escalation policies
- [ ] Create SLA reports schedule
- [ ] Document metric retention policies

## Troubleshooting

### Prometheus Not Scraping Backend

**Problem**: Targets showing as DOWN in Prometheus

**Solution**:
```bash
# Check backend is exposing metrics
curl http://localhost:3001/api/v1/metrics

# Check Prometheus can reach backend
docker exec restaurant-platform-prometheus wget -O- http://host.docker.internal:3001/api/v1/metrics

# Update prometheus.yml if using Docker:
targets:
  - 'host.docker.internal:3001'  # Instead of localhost:3001
```

### Alerts Not Firing

**Problem**: Alert conditions met but no notifications

**Solution**:
```bash
# Check AlertManager is receiving alerts
curl http://localhost:9093/api/v2/alerts

# Check routing configuration
docker logs restaurant-platform-alertmanager

# Manually fire test alert
amtool alert add alertname=TestAlert severity=critical
```

### Grafana Dashboard Empty

**Problem**: Dashboard shows "No data" panels

**Solution**:
1. Verify Prometheus data source is connected
2. Check time range (last 6 hours by default)
3. Verify metrics are being scraped:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=up'
   ```
4. Check Grafana logs:
   ```bash
   docker logs restaurant-platform-grafana
   ```

### High Memory Usage

**Problem**: Prometheus using too much memory

**Solution**:
```bash
# Reduce retention time in prometheus.yml
storage.tsdb.retention.time: 15d  # Instead of 30d

# Reduce scrape frequency
scrape_interval: 30s  # Instead of 15s

# Add storage size limit
storage.tsdb.retention.size: 25GB  # Instead of 50GB
```

## Maintenance

### Backup Prometheus Data

```bash
# Create snapshot
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot

# Backup directory
sudo tar czf prometheus-backup-$(date +%Y%m%d).tar.gz /var/lib/prometheus

# Store offsite
aws s3 cp prometheus-backup-$(date +%Y%m%d).tar.gz s3://backups/prometheus/
```

### Rotate Logs

```bash
# Configure logrotate for Prometheus
sudo tee /etc/logrotate.d/prometheus > /dev/null <<EOF
/var/log/prometheus/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

### Update Alert Rules

```bash
# Edit alert rules
vi /opt/prometheus/alert-rules.yml

# Reload Prometheus configuration (no restart needed)
curl -X POST http://localhost:9090/-/reload

# Verify rules loaded
curl http://localhost:9090/api/v1/rules
```

## Performance Optimization

### Reduce Cardinality

```yaml
# In prometheus.yml, add metric_relabel_configs
metric_relabel_configs:
  - source_labels: [__name__]
    regex: 'high_cardinality_metric_.*'
    action: drop
```

### Configure Recording Rules

```yaml
# In alert-rules.yml, add recording rules for expensive queries
groups:
  - name: recording_rules
    interval: 30s
    rules:
      - record: job:http_requests_total:rate5m
        expr: sum(rate(http_requests_total[5m])) by (job)
```

## SLA Monitoring

### Access SLA Reports

1. Navigate to Grafana
2. Go to **Dashboards** → **Restaurant Platform**
3. Scroll to **SLA Tracking** section
4. View:
   - Availability percentage
   - Print test success rate
   - P95 latency
   - Monthly SLA compliance

### Export SLA Reports

```bash
# Generate monthly SLA report
curl 'http://localhost:9090/api/v1/query?query=avg_over_time(up[30d])' > sla-report-$(date +%Y%m).json
```

## Support & Resources

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/
- **AlertManager Docs**: https://prometheus.io/docs/alerting/latest/alertmanager/
- **Internal Runbooks**: `/home/admin/restaurant-platform-remote-v2/claudedocs/runbooks/`
- **On-call Schedule**: Contact DevOps team

## Summary

This deployment guide provides production-ready monitoring infrastructure with:
- Real-time metrics collection (15-second intervals)
- Comprehensive alerting (CRITICAL/WARNING/INFO levels)
- Professional dashboards with 14 visualization panels
- 30-day metric retention
- SLA tracking and reporting
- Integration with PagerDuty, Slack, and Email

For additional support, refer to Phase 20 documentation or contact the platform team.
