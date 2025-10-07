# Restaurant Platform - Monitoring Infrastructure

## Quick Start

Deploy the entire monitoring stack in under 5 minutes:

```bash
cd /home/admin/restaurant-platform-remote-v2/backend
./monitoring/quick-start.sh
```

This will start:
- **Prometheus** on http://localhost:9090
- **Grafana** on http://localhost:3002
- **AlertManager** on http://localhost:9093
- **Node Exporter** on http://localhost:9100

## What's Included

### 1. Prometheus (Metrics Collection)
- Scrapes metrics from backend every 15 seconds
- 30-day data retention
- Real-time alerting engine
- PromQL query interface

### 2. Grafana (Visualization)
- 14 pre-configured dashboard panels
- Real-time updates (10-second refresh)
- Auto-imported dashboard on startup
- **Login**: admin / admin123 (change on first login)

### 3. AlertManager (Notifications)
- Routes alerts to PagerDuty, Slack, Email
- Alert deduplication and grouping
- Severity-based routing (CRITICAL/WARNING/INFO)
- Requires configuration with real credentials

### 4. Node Exporter (System Metrics)
- CPU, memory, disk usage
- Network statistics
- System load metrics

## Dashboard Panels

1. **WebSocket Connections** - Total active connections
2. **Correlation ID Success Rate** - Cache hit percentage
3. **Print Test Success Rate** - Print reliability metric
4. **Desktop App Connections** - Active PrinterMaster instances
5. **Print Test Latency** - p50, p95, p99 percentiles
6. **Connection Quality Distribution** - Health monitoring overview
7. **WebSocket Connections per Branch** - Multi-tenant view
8. **Error Rate** - HTTP and print failures per minute
9. **Health Monitoring Quality Score** - 0-100 score by branch
10. **Rate Limiting Activity** - Throttling metrics
11. **Security Events** - Auth failures, CORS violations
12. **HTTP Request Duration** - API performance (p95)
13. **System Resources** - CPU and memory usage
14. **Print Jobs** - Success vs failed print jobs

## Alert Rules

### CRITICAL (PagerDuty)
- All Desktop Apps disconnected (>5min)
- Error rate >10% (>1min)
- Print test success <80% (>5min)
- Auth failures >50/min (>1min)

### WARNING (Slack)
- Connection quality degraded (>30min)
- High p95 latency >1s (>5min)
- Rate limiting active (>10 clients)

### INFO (Email)
- New Desktop App connected
- Low cache hit rate <50% (>15min)
- High memory usage >2GB (>30min)

## Configuration Files

```
monitoring/
├── prometheus.yml              # Prometheus configuration
├── alert-rules.yml             # Alert definitions
├── alertmanager.yml            # Notification routing (⚠️ needs credentials)
├── grafana-dashboard.json      # Pre-built dashboard
├── quick-start.sh              # One-command deployment
├── DEPLOYMENT_GUIDE.md         # Complete deployment guide
└── README.md                   # This file
```

## Configuration Steps

### 1. Configure AlertManager (Required)

Edit `alertmanager.yml` and replace:

```yaml
# PagerDuty
service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'

# Slack
slack_api_url: 'https://hooks.slack.com/services/YOUR_WEBHOOK_URL'

# Email
smtp_auth_password: 'YOUR_SMTP_PASSWORD'
```

Get credentials from:
- **PagerDuty**: Services → Service Directory → Create Integration
- **Slack**: Apps → Incoming Webhooks → Add to Workspace
- **Email**: Gmail App Password (requires 2FA)

### 2. Restart AlertManager

```bash
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

### 3. Test Alerts

Trigger a test alert:
```bash
curl -X POST http://localhost:3001/api/v1/printing/printers/invalid-id/test
```

Check alert fired:
```bash
curl http://localhost:9093/api/v2/alerts
```

## Useful Commands

### Start/Stop Services

```bash
# Start all services
docker-compose -f docker-compose.monitoring.yml up -d

# Stop all services
docker-compose -f docker-compose.monitoring.yml down

# Restart specific service
docker-compose -f docker-compose.monitoring.yml restart prometheus

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f

# Service status
docker-compose -f docker-compose.monitoring.yml ps
```

### Query Metrics

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Query metric
curl 'http://localhost:9090/api/v1/query?query=websocket_connections_total'

# Check backend metrics endpoint
curl http://localhost:3001/api/v1/metrics
```

### Reload Configuration

```bash
# Reload Prometheus without restart
curl -X POST http://localhost:9090/-/reload

# Reload AlertManager
docker-compose -f docker-compose.monitoring.yml exec alertmanager \
  kill -HUP 1
```

## Troubleshooting

### Prometheus Not Scraping Backend

**Problem**: Targets show as DOWN

**Solution**:
```bash
# For Docker setup, use host.docker.internal instead of localhost
# Edit prometheus.yml:
targets:
  - 'host.docker.internal:3001'  # Not localhost:3001
```

### Grafana Dashboard Empty

**Problem**: Panels show "No data"

**Solution**:
1. Check Prometheus data source is configured
2. Verify metrics are being scraped: http://localhost:9090/targets
3. Check time range (default: last 6 hours)
4. Reload Grafana: `docker-compose -f docker-compose.monitoring.yml restart grafana`

### Alerts Not Firing

**Problem**: Conditions met but no notifications

**Solution**:
1. Check AlertManager received alert: http://localhost:9093/#/alerts
2. Verify routing configuration in `alertmanager.yml`
3. Check notification channel credentials
4. Review AlertManager logs:
   ```bash
   docker-compose -f docker-compose.monitoring.yml logs alertmanager
   ```

## SLA Metrics

The monitoring system tracks these SLAs:

- **Availability**: 99.9% (43.2 min downtime/month allowed)
- **Print Success**: >95% print test success rate
- **Connection Quality**: >80% connections good/excellent
- **Latency**: p95 < 500ms for API requests

View SLA compliance in Grafana dashboard (bottom panels).

## Data Retention

- **Metrics**: 30 days
- **Disk Usage**: ~1GB per week (~4GB per month)
- **Cleanup**: Automatic by Prometheus

To change retention:
```yaml
# In docker-compose.monitoring.yml
command:
  - '--storage.tsdb.retention.time=15d'  # Reduce to 15 days
```

## Security Notes

1. **Change Grafana Password**: Default is `admin/admin123`
2. **Restrict Access**: Configure firewall to allow only internal IPs
3. **Enable HTTPS**: Use reverse proxy (nginx) in production
4. **Protect Credentials**: Never commit real credentials to git

## Performance Impact

- **Backend Overhead**: <1ms per request
- **Memory Usage**: ~50MB for metrics service
- **CPU Usage**: Negligible (<1%)
- **Network**: ~100KB/minute metrics traffic

## Documentation

- **Complete Guide**: `DEPLOYMENT_GUIDE.md`
- **Phase 20 Docs**: `../claudedocs/PHASE_20_MONITORING_COMPLETE.md`
- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/

## Support

- **Slack**: #platform-monitoring
- **Email**: ops-team@restaurant-platform.com
- **On-Call**: See PagerDuty rotation

---

**Quick Start**: `./monitoring/quick-start.sh`

**Status**: ✅ Production Ready
