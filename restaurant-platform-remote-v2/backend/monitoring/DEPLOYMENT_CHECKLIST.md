# Phase 20: Post-Deployment Monitoring - Deployment Checklist

## Pre-Deployment Verification

### Files Created ✅
- [x] Backend Services (4 files)
  - [x] src/monitoring/prometheus.service.ts (9.6KB)
  - [x] src/monitoring/metrics.module.ts (1KB)
  - [x] src/monitoring/metrics.controller.ts (495 bytes)
  - [x] src/monitoring/metrics.middleware.ts (1.5KB)

- [x] Configuration Files (4 files)
  - [x] monitoring/prometheus.yml (1.8KB)
  - [x] monitoring/alert-rules.yml (7.7KB)
  - [x] monitoring/alertmanager.yml (4.2KB)
  - [x] monitoring/grafana-dashboard.json (11KB)

- [x] Deployment Files (4 files)
  - [x] docker-compose.monitoring.yml (1.9KB)
  - [x] monitoring/quick-start.sh (5.4KB, executable)
  - [x] monitoring/README.md (6.9KB)
  - [x] monitoring/DEPLOYMENT_GUIDE.md (18KB)

- [x] Documentation (2 files)
  - [x] claudedocs/PHASE_20_MONITORING_COMPLETE.md (21KB)
  - [x] monitoring/IMPLEMENTATION_SUMMARY.md (10KB)

### Code Integration ✅
- [x] PrometheusService integrated into PrintingService
- [x] Metrics recorded in print test operations
- [x] Security events tracked in WebSocket gateway
- [x] MetricsModule imported in AppModule
- [x] Metrics middleware configured globally

### Dependencies ✅
- [x] prom-client@15.1.3 installed
- [x] @willsoto/nestjs-prometheus@6.0.2 installed

## Quick Start

```bash
cd /home/admin/restaurant-platform-remote-v2/backend
./monitoring/quick-start.sh
```

This single command deploys the entire monitoring stack in under 5 minutes!

## Production Deployment Steps

### Step 1: Deploy Monitoring Stack
```bash
cd /home/admin/restaurant-platform-remote-v2/backend
./monitoring/quick-start.sh
```

Expected output:
- ✅ Prometheus healthy on http://localhost:9090
- ✅ Grafana healthy on http://localhost:3002
- ✅ AlertManager healthy on http://localhost:9093
- ✅ Node Exporter healthy on http://localhost:9100

### Step 2: Configure AlertManager
```bash
# Edit credentials
vi /home/admin/restaurant-platform-remote-v2/backend/monitoring/alertmanager.yml

# Update these values:
# - YOUR_PAGERDUTY_SERVICE_KEY (line 5)
# - YOUR_SLACK_WEBHOOK_URL (line 6)
# - YOUR_SMTP_PASSWORD (line 9)

# Restart AlertManager
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

### Step 3: Verify Backend Integration
```bash
# Start backend (if not already running)
npm run start:dev

# Check metrics endpoint
curl http://localhost:3001/api/v1/metrics | grep restaurant_platform

# Expected: Should see 35+ metrics like:
# - websocket_connections_total
# - print_test_requests_total
# - http_requests_total
```

### Step 4: Verify Prometheus Scraping
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Expected: All targets showing "health": "up"
```

### Step 5: Access Grafana Dashboard
1. Open browser: http://localhost:3002
2. Login: `admin` / `admin123`
3. Navigate: **Dashboards** → **Restaurant Platform - Production Monitoring**
4. Verify: All 14 panels loading data
5. **IMPORTANT**: Change admin password immediately!

### Step 6: Test Alerting
```bash
# Trigger test alert (print test failure)
curl -X POST http://localhost:3001/api/v1/printing/printers/invalid-id/test

# Wait 5 minutes, then check AlertManager
curl http://localhost:9093/api/v2/alerts | jq '.[] | {alertname: .labels.alertname, state: .status.state}'

# Expected: Alert "LowPrintTestSuccessRate" should be firing
```

## Production Readiness Checklist

### Security
- [ ] Change Grafana admin password (default: admin123)
- [ ] Configure firewall rules (restrict to internal IPs only)
- [ ] Enable HTTPS for Grafana (use nginx reverse proxy)
- [ ] Add real PagerDuty service key
- [ ] Add real Slack webhook URL
- [ ] Add real SMTP credentials
- [ ] Review and rotate service keys quarterly

### Performance
- [x] Scrape interval configured (15 seconds)
- [x] Data retention configured (30 days)
- [x] Metric cardinality controlled (<1000 unique labels)
- [ ] Storage capacity planned (4GB/month minimum)
- [ ] Backup strategy defined

### Monitoring
- [ ] All 17 alert rules tested
- [ ] PagerDuty integration verified
- [ ] Slack notifications verified
- [ ] Email alerts verified
- [ ] Dashboard panels all loading
- [ ] SLA metrics tracking correctly

### Documentation
- [x] Deployment guide created
- [x] Quick start guide available
- [x] Implementation summary documented
- [ ] Runbooks created for each alert
- [ ] On-call rotation defined
- [ ] Escalation policies documented

### Operations
- [ ] Monitoring stack backup configured
- [ ] Log retention policy defined
- [ ] Metric retention policy documented
- [ ] Capacity planning completed
- [ ] Disaster recovery plan documented

## Validation Tests

### Test 1: Metrics Collection
```bash
# Verify backend exposes metrics
curl http://localhost:3001/api/v1/metrics | grep -c "restaurant_platform_"

# Expected: >20 metrics exposed
```

### Test 2: Prometheus Scraping
```bash
# Query a specific metric
curl 'http://localhost:9090/api/v1/query?query=websocket_connections_total'

# Expected: JSON response with metric data
```

### Test 3: Grafana Visualization
```bash
# Check Grafana health
curl http://localhost:3002/api/health

# Expected: {"database": "ok"}
```

### Test 4: Alert Rules
```bash
# Check alert rules loaded
curl http://localhost:9090/api/v1/rules | jq '.data.groups[] | .name'

# Expected: ["critical_alerts", "warning_alerts", "info_alerts", "sla_alerts"]
```

### Test 5: Alert Firing
```bash
# Trigger multiple print test failures
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/v1/printing/printers/invalid-$i/test
  sleep 1
done

# Wait 5 minutes, check alerts
curl http://localhost:9093/api/v2/alerts

# Expected: Alert should be firing
```

## Troubleshooting

### Issue: Prometheus Not Scraping Backend
**Symptom**: Targets show as DOWN in Prometheus

**Solution**:
```bash
# For Docker setup, use host.docker.internal instead of localhost
# Edit prometheus.yml:
targets:
  - 'host.docker.internal:3001'  # NOT localhost:3001

# Reload Prometheus
curl -X POST http://localhost:9090/-/reload
```

### Issue: Grafana Dashboard Empty
**Symptom**: Panels show "No data"

**Solution**:
1. Check Prometheus data source connected
2. Verify time range (default: last 6 hours)
3. Check metrics being scraped:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=up'
   ```
4. Reload Grafana:
   ```bash
   docker-compose -f docker-compose.monitoring.yml restart grafana
   ```

### Issue: Alerts Not Firing
**Symptom**: Alert conditions met but no notifications

**Solution**:
1. Check alert rules syntax:
   ```bash
   curl http://localhost:9090/api/v1/rules
   ```
2. Verify AlertManager configuration
3. Check notification channel credentials in `alertmanager.yml`
4. Review AlertManager logs:
   ```bash
   docker-compose -f docker-compose.monitoring.yml logs alertmanager
   ```

### Issue: High Memory Usage
**Symptom**: Prometheus using excessive memory

**Solution**:
1. Reduce retention time in prometheus.yml:
   ```yaml
   storage.tsdb.retention.time: 15d  # Instead of 30d
   ```
2. Increase scrape interval:
   ```yaml
   scrape_interval: 30s  # Instead of 15s
   ```
3. Add storage size limit:
   ```yaml
   storage.tsdb.retention.size: 25GB  # Instead of 50GB
   ```

## Success Criteria

✅ **All checks must pass:**
- [x] All 14 files created successfully
- [x] Dependencies installed (prom-client, @willsoto/nestjs-prometheus)
- [ ] Backend exposes /api/v1/metrics endpoint
- [ ] Prometheus scraping backend successfully
- [ ] Grafana dashboard accessible and loading
- [ ] AlertManager configured and running
- [ ] All 17 alert rules loaded
- [ ] Test alert fires and routes correctly
- [ ] SLA metrics tracking properly
- [ ] Documentation complete and accessible

## Post-Deployment Tasks

### Daily
- [ ] Monitor critical alerts in PagerDuty/Slack
- [ ] Review Grafana dashboard for anomalies
- [ ] Check system resource usage

### Weekly
- [ ] Review SLA compliance metrics
- [ ] Analyze alert frequency and patterns
- [ ] Optimize alert thresholds if needed

### Monthly
- [ ] Generate SLA reports
- [ ] Review and update alert rules
- [ ] Backup Prometheus data
- [ ] Update Grafana dashboards

## Support Resources

- **Quick Start**: `./monitoring/quick-start.sh`
- **Deployment Guide**: `monitoring/DEPLOYMENT_GUIDE.md`
- **Complete Docs**: `../claudedocs/PHASE_20_MONITORING_COMPLETE.md`
- **README**: `monitoring/README.md`
- **Implementation Summary**: `monitoring/IMPLEMENTATION_SUMMARY.md`

## Contact

- **Slack**: #platform-monitoring
- **Email**: ops-team@restaurant-platform.com
- **On-Call**: See PagerDuty rotation

---

**Phase 20 Status**: ✅ READY FOR DEPLOYMENT

**Last Updated**: October 7, 2025
