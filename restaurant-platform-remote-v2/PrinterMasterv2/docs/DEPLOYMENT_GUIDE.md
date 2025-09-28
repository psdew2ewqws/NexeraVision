# PrinterMaster v2 - Enterprise Deployment Guide

## Overview

PrinterMaster v2 is an enterprise-grade printer management system designed for restaurant chains with 100+ device deployments. This guide covers complete deployment from development to production.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PrinterMaster v2 Ecosystem               │
├─────────────────────────────────────────────────────────────┤
│  Edge Devices (100+ Restaurant Locations)                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Desktop App   │  │   QZ Tray       │  │   Printers   │ │
│  │   - License     │  │   - Discovery   │  │   - Receipt  │ │
│  │   - Management  │  │   - Testing     │  │   - Kitchen  │ │
│  │   - Monitoring  │  │   - Printing    │  │   - Label    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Central Infrastructure                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Backend API   │  │   Database      │  │   Monitoring │ │
│  │   - NestJS      │  │   - PostgreSQL  │  │   - Grafana  │ │
│  │   - WebSocket   │  │   - Redis       │  │   - Prometheus│ │
│  │   - Auth/License│  │   - Backups     │  │   - Alerting │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Environment](#development-environment)
3. [Production Deployment](#production-deployment)
4. [Desktop Client Distribution](#desktop-client-distribution)
5. [Configuration Management](#configuration-management)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Security Guidelines](#security-guidelines)
8. [Troubleshooting](#troubleshooting)
9. [Scaling Considerations](#scaling-considerations)

## Prerequisites

### System Requirements

**Backend Server:**
- OS: Ubuntu 20.04 LTS or CentOS 8+
- CPU: 4+ cores (8+ recommended for production)
- RAM: 8GB minimum (16GB+ recommended)
- Storage: 100GB SSD minimum
- Network: Stable internet connection, ports 80/443/3001 accessible

**Desktop Clients:**
- OS: Windows 10+, macOS 10.15+, or Ubuntu 18.04+
- CPU: 2+ cores
- RAM: 4GB minimum
- Storage: 2GB free space
- Network: Stable internet connection to backend
- Java 8+ (for QZ Tray)

### Software Dependencies

**Required:**
- Docker & Docker Compose
- Node.js 18+
- PostgreSQL 14+
- Git
- Nginx (for production)

**Optional:**
- Prometheus & Grafana (monitoring)
- Let's Encrypt (SSL certificates)
- Redis (caching)

## Development Environment

### Quick Start

1. **Clone and Setup:**
   ```bash
   cd /home/admin/restaurant-platform-remote-v2/PrinterMasterv2
   chmod +x deployment/scripts/setup-development.sh
   ./deployment/scripts/setup-development.sh
   ```

2. **Start Development Services:**
   ```bash
   ./start-dev.sh
   ```

3. **Access Applications:**
   - Backend API: http://localhost:3001
   - Desktop App: http://localhost:3002
   - API Documentation: http://localhost:3001/api/docs

### Development Workflow

**Backend Development:**
```bash
cd apps/backend
npm run dev          # Start with hot reload
npm run test         # Run test suite
npm run lint         # Code linting
npm run build        # Production build
```

**Desktop Development:**
```bash
cd apps/desktop
npm run dev          # Start Electron + Next.js
npm run build        # Build for testing
npm run dist         # Create distributable
```

**Database Operations:**
```bash
# Connect to development database
PGPASSWORD="E$$athecode006" psql -h localhost -U printer_dev -d printer_master_v2_dev

# Run migrations
cd apps/backend && npm run migration:run

# Reset database
cd apps/backend && npm run migration:reset
```

## Production Deployment

### Automated Deployment

1. **Prepare Server:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Create deployment directory
   sudo mkdir -p /opt/printer-master-v2
   sudo chown $USER:$USER /opt/printer-master-v2
   ```

2. **Deploy Application:**
   ```bash
   cd /opt/printer-master-v2
   git clone https://github.com/restaurant-platform/printer-master-v2.git .
   
   # Run automated deployment
   sudo ./deployment/scripts/production-deploy.sh
   ```

3. **Verify Deployment:**
   ```bash
   # Check service status
   sudo systemctl status printer-master-v2
   
   # View logs
   sudo journalctl -u printer-master-v2 -f
   
   # Test API
   curl http://localhost:3001/health
   ```

### Manual Deployment Steps

If you prefer manual deployment:

1. **Environment Configuration:**
   ```bash
   # Create configuration directory
   sudo mkdir -p /opt/printer-master-v2/config
   
   # Create environment file
   sudo nano /opt/printer-master-v2/config/.env.production
   ```

   Example `.env.production`:
   ```env
   # Database
   DB_PASSWORD=your-secure-database-password
   POSTGRES_DB=printer_master_v2_prod
   POSTGRES_USER=printer_prod
   
   # JWT
   JWT_SECRET=your-super-secure-jwt-secret-key
   JWT_EXPIRES_IN=7d
   
   # API Configuration
   CORS_ORIGIN=https://your-domain.com
   LOG_LEVEL=info
   API_RATE_LIMIT=100
   
   # Encryption
   ENCRYPTION_KEY=your-encryption-key
   
   # License Server
   LICENSE_SERVER_URL=https://license.your-domain.com
   LICENSE_VALIDATION_KEY=your-license-key
   ```

2. **Database Setup:**
   ```bash
   # Start database
   docker-compose -f deployment/docker/docker-compose.production.yml up -d postgres
   
   # Run migrations
   docker-compose -f deployment/docker/docker-compose.production.yml exec postgres \
     psql -U printer_prod -d printer_master_v2_prod -f /docker-entrypoint-initdb.d/001-create-printer-tables.sql
   ```

3. **Application Deployment:**
   ```bash
   # Build and start all services
   docker-compose -f deployment/docker/docker-compose.production.yml up -d
   
   # Check status
   docker-compose -f deployment/docker/docker-compose.production.yml ps
   ```

### SSL Configuration

1. **Install Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Generate Certificates:**
   ```bash
   sudo certbot --nginx -d your-api-domain.com
   ```

3. **Update Nginx Configuration:**
   ```nginx
   server {
       listen 443 ssl;
       server_name your-api-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-api-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-api-domain.com/privkey.pem;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       
       location /ws {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

## Desktop Client Distribution

### Building Distributables

1. **Configure Build Environment:**
   ```bash
   cd apps/desktop
   
   # Install dependencies
   npm install
   
   # Configure signing (optional)
   export CSC_LINK="path/to/certificate.p12"
   export CSC_KEY_PASSWORD="certificate-password"
   ```

2. **Build for All Platforms:**
   ```bash
   # Build for all platforms
   npm run dist:all
   
   # Or build for specific platforms
   npm run dist:win      # Windows
   npm run dist:mac      # macOS
   npm run dist:linux    # Linux
   ```

3. **Distribute Applications:**
   ```bash
   # Upload to distribution server
   scp dist/*.exe user@distribution-server:/var/www/downloads/
   scp dist/*.dmg user@distribution-server:/var/www/downloads/
   scp dist/*.AppImage user@distribution-server:/var/www/downloads/
   ```

### Auto-Update Configuration

1. **Setup Update Server:**
   ```bash
   # Configure Electron Builder for GitHub releases
   # Or setup custom update server
   ```

2. **Configure Auto-Updates:**
   ```typescript
   // In main process
   autoUpdater.setFeedURL({
     provider: 'generic',
     url: 'https://your-update-server.com/updates/'
   });
   
   autoUpdater.checkForUpdatesAndNotify();
   ```

### Enterprise Distribution

**Group Policy (Windows):**
- Deploy via SCCM or Group Policy
- Configure automatic installation
- Set registry keys for configuration

**MDM Solutions (macOS):**
- Use Jamf Pro or similar
- Deploy via App Store Connect
- Configure managed preferences

**Package Managers (Linux):**
- Create DEB/RPM packages
- Distribute via internal repositories
- Use configuration management tools

## Configuration Management

### Environment Variables

**Backend Configuration:**
```env
# Core Settings
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://user:pass@host:6379

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
CORS_ORIGIN=https://your-domain.com

# Features
ENABLE_METRICS=true
API_RATE_LIMIT=100
FILE_UPLOAD_MAX_SIZE=10485760

# External Services
LICENSE_SERVER_URL=https://license-server.com
SMTP_HOST=smtp.your-domain.com
SMTP_USER=notifications@your-domain.com
```

**Desktop Configuration:**
```json
{
  "apiUrl": "https://api.your-domain.com",
  "wsUrl": "wss://api.your-domain.com",
  "refreshInterval": 30,
  "heartbeatInterval": 60,
  "autoStart": true,
  "minimizeToTray": true,
  "logLevel": "info",
  "qzTray": {
    "host": "localhost",
    "port": 8182,
    "timeout": 30000,
    "retryAttempts": 5
  }
}
```

### License Management

**License Creation:**
```bash
# Generate license for branch
curl -X POST https://api.your-domain.com/api/v1/admin/licenses \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "branch-uuid",
    "companyId": "company-uuid",
    "deviceLimit": 5,
    "expiresAt": "2025-12-31T23:59:59Z",
    "features": ["basic", "advanced", "monitoring"]
  }'
```

**License Validation:**
```bash
# Validate license
curl -X POST https://api.your-domain.com/api/v1/printer-licenses/validate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "ABCD-EFGH-IJKL-MNOP-QRST",
    "deviceId": "device-fingerprint",
    "deviceInfo": {
      "hostname": "restaurant-pos-01",
      "platform": "Windows",
      "appVersion": "2.0.0"
    }
  }'
```

## Monitoring & Maintenance

### Health Monitoring

**System Health Checks:**
```bash
# Manual health check
curl http://localhost:3001/health

# Automated monitoring (cron)
*/5 * * * * /opt/printer-master-v2/config/health-check.sh
```

**Application Metrics:**
- Memory usage monitoring
- CPU utilization tracking
- Database connection pooling
- API response times
- Printer status aggregation

### Log Management

**Log Locations:**
- Application logs: `/opt/printer-master-v2/logs/`
- Docker logs: `docker logs container-name`
- System logs: `journalctl -u printer-master-v2`

**Log Rotation:**
```bash
# Configure logrotate
sudo nano /etc/logrotate.d/printer-master-v2
```

### Backup Strategy

**Automated Backups:**
```bash
#!/bin/bash
# Daily backup script
BACKUP_DIR="/opt/printer-master-v2/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Database backup
docker-compose -f docker-compose.production.yml exec -T postgres \
  pg_dump -U printer_prod printer_master_v2_prod > "$BACKUP_DIR/db_$TIMESTAMP.sql"

# Application data backup
docker run --rm -v printer-master-v2_app_uploads:/data -v "$BACKUP_DIR:/backup" \
  alpine tar -czf "/backup/uploads_$TIMESTAMP.tar.gz" -C /data .

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

**Backup Verification:**
```bash
# Test backup restoration
psql -U printer_prod -d printer_master_v2_test < backup.sql
```

### Updates and Maintenance

**Application Updates:**
```bash
# Update application
cd /opt/printer-master-v2
git pull origin main
sudo ./deployment/scripts/production-deploy.sh update
```

**Database Migrations:**
```bash
# Run new migrations
docker-compose -f docker-compose.production.yml exec backend npm run migration:run
```

**Security Updates:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## Security Guidelines

### Network Security

**Firewall Configuration:**
```bash
# UFW configuration
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3001/tcp    # API (if direct access needed)
sudo ufw enable
```

**VPN Access:**
- Restrict administrative access to VPN
- Use jump hosts for production access
- Implement IP whitelisting for critical operations

### Application Security

**Authentication:**
- JWT tokens with short expiration
- Device fingerprinting for license validation
- Multi-factor authentication for admin accounts

**Data Protection:**
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper input validation
- Regular security audits

**Access Control:**
- Role-based permissions
- Principle of least privilege
- Regular access reviews
- Audit logging

### Infrastructure Security

**Docker Security:**
- Run containers as non-root user
- Use minimal base images
- Regular image updates
- Container resource limits

**Database Security:**
- Strong passwords
- Connection encryption
- Regular backups
- Access logging

## Troubleshooting

### Common Issues

**Desktop Client Issues:**

1. **QZ Tray Connection Failed**
   ```bash
   # Check QZ Tray status
   ps aux | grep qz
   
   # Restart QZ Tray
   pkill -f qz-tray
   java -jar qz-tray.jar
   ```

2. **License Validation Failed**
   ```bash
   # Check network connectivity
   ping api.your-domain.com
   
   # Verify license format
   echo "ABCD-EFGH-IJKL-MNOP-QRST" | grep -E "^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$"
   ```

3. **Printer Discovery Issues**
   ```bash
   # Check printer drivers
   lpstat -p
   
   # Test printer connectivity
   ping printer-ip-address
   ```

**Backend Issues:**

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   docker-compose ps postgres
   
   # Test database connection
   docker-compose exec postgres psql -U printer_prod -d printer_master_v2_prod -c "SELECT 1;"
   ```

2. **High Memory Usage**
   ```bash
   # Check container stats
   docker stats
   
   # Restart application
   docker-compose restart backend
   ```

3. **API Timeouts**
   ```bash
   # Check response times
   curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3001/health
   
   # Scale backend services
   docker-compose up -d --scale backend=3
   ```

### Log Analysis

**Error Pattern Detection:**
```bash
# Find critical errors
grep -i "error\|critical\|fatal" /opt/printer-master-v2/logs/*.log

# Monitor real-time logs
tail -f /opt/printer-master-v2/logs/application.log | grep -i error

# Analyze performance issues
grep "slow query\|timeout\|memory" /opt/printer-master-v2/logs/*.log
```

**Performance Monitoring:**
```bash
# Database query analysis
docker-compose exec postgres psql -U printer_prod -d printer_master_v2_prod \
  -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Memory usage tracking
free -h && docker stats --no-stream
```

## Scaling Considerations

### Horizontal Scaling

**Backend Scaling:**
```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
```

**Load Balancing:**
```nginx
upstream backend {
    server backend1:3001;
    server backend2:3001;
    server backend3:3001;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

### Database Scaling

**Read Replicas:**
```yaml
services:
  postgres-master:
    image: postgres:14
    environment:
      POSTGRES_REPLICATION_MODE: master
      
  postgres-slave:
    image: postgres:14
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_MASTER_SERVICE: postgres-master
```

**Connection Pooling:**
```javascript
// Database configuration
{
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  }
}
```

### Monitoring at Scale

**Distributed Tracing:**
- Implement OpenTelemetry
- Use Jaeger for trace analysis
- Monitor cross-service communications

**Metrics Aggregation:**
- Prometheus federation
- Grafana dashboard templating
- Alert manager clustering

### Performance Optimization

**Caching Strategy:**
```javascript
// Redis caching
const cacheKey = `printer:${printerId}:status`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const status = await getPrinterStatus(printerId);
await redis.setex(cacheKey, 300, JSON.stringify(status));
return status;
```

**Database Optimization:**
- Index optimization
- Query performance tuning
- Connection pooling
- Partitioning strategies

---

## Support and Maintenance

For additional support:
- Documentation: `/docs/`
- API Reference: `http://localhost:3001/api/docs`
- Issues: GitHub Issues
- Support: support@restaurant-platform.com

Remember to regularly update this documentation as the system evolves and new features are added.