# Integration Platform - Deployment Guide

Complete deployment guide for the Integration Platform across different environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Microservices Deployment](#microservices-deployment)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+
- PostgreSQL 14+ (if running locally)
- Git

### One-Command Setup

```bash
# Clone the repository
git clone <repository-url>
cd integration-platform

# Run automated setup
./scripts/setup.sh
```

This script will:
- ✅ Check system requirements
- ✅ Setup environment files
- ✅ Install all dependencies
- ✅ Setup PostgreSQL database
- ✅ Run database migrations
- ✅ Start all services
- ✅ Run health checks

**Service URLs After Setup:**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- API Documentation: http://localhost:4000/api/v1/docs
- pgAdmin: http://localhost:5050
- Redis Commander: http://localhost:8081

## Development Setup

### Manual Setup

1. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit configuration
   nano .env
   ```

2. **Install Dependencies**
   ```bash
   # Root dependencies
   npm install

   # Backend dependencies
   cd backend && npm install && cd ..

   # Frontend dependencies
   cd frontend && npm install && cd ..

   # Microservices dependencies
   for service in microservices/*/; do
     cd "$service" && npm install && cd "../.."
   done
   ```

3. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose -f docker-compose.dev.yml up -d postgres redis

   # Setup database
   cd database && node setup-database.js && cd ..

   # Run migrations
   cd backend && npx prisma migrate deploy && cd ..
   ```

4. **Start Development Services**
   ```bash
   # Option 1: Docker Compose (Recommended)
   docker-compose -f docker-compose.dev.yml up -d

   # Option 2: Manual start
   cd backend && npm run start:dev &
   cd frontend && npm run dev &
   cd microservices/pos-adapter-service && npm run start:dev &
   ```

### Development Features

- **Hot Reload**: All services support hot reload
- **Debug Ports**: Backend (9229), POS Adapter (9230)
- **Live Documentation**: Swagger UI auto-updates
- **Database Tools**: pgAdmin and Redis Commander included
- **Real-time Logs**: `docker-compose logs -f [service]`

## Production Deployment

### Docker Compose Production

1. **Environment Setup**
   ```bash
   # Production environment
   cp .env.example .env.production

   # Configure production values
   nano .env.production
   ```

2. **Build and Deploy**
   ```bash
   # Build all images
   docker-compose build

   # Start production services
   docker-compose up -d

   # Run database migrations
   docker-compose exec api-gateway npx prisma migrate deploy
   ```

3. **Production Configuration**
   ```yaml
   # docker-compose.override.yml
   version: '3.8'
   services:
     api-gateway:
       environment:
         - NODE_ENV=production
         - JWT_SECRET=your-super-secure-jwt-secret
         - DATABASE_URL=postgresql://user:pass@prod-db:5432/db

     frontend:
       environment:
         - NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
         - NODE_ENV=production
   ```

### Kubernetes Deployment

1. **Create Namespace**
   ```bash
   kubectl create namespace integration-platform
   ```

2. **Deploy Database**
   ```yaml
   # k8s/postgres.yaml
   apiVersion: apps/v1
   kind: StatefulSet
   metadata:
     name: postgres
     namespace: integration-platform
   spec:
     serviceName: postgres
     replicas: 1
     template:
       spec:
         containers:
         - name: postgres
           image: postgres:15
           env:
           - name: POSTGRES_DB
             value: integration_platform
           - name: POSTGRES_PASSWORD
             valueFrom:
               secretKeyRef:
                 name: postgres-secret
                 key: password
   ```

3. **Deploy Services**
   ```bash
   # Apply all configurations
   kubectl apply -f k8s/

   # Check deployment status
   kubectl get pods -n integration-platform
   ```

### Cloud Deployment Options

#### AWS ECS with Fargate

```json
{
  "family": "integration-platform",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "api-gateway",
      "image": "your-registry/integration-platform-backend:latest",
      "portMappings": [{"containerPort": 4000}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ]
    }
  ]
}
```

#### Google Cloud Run

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: integration-platform-api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containers:
      - image: gcr.io/your-project/integration-platform-backend:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
```

## Environment Configuration

### Core Environment Variables

```bash
# Application
NODE_ENV=production
API_PORT=4000
API_PREFIX=api/v1

# Database
DATABASE_URL=postgresql://user:pass@host:port/db
DB_POOL_SIZE=20
DB_TIMEOUT=30000

# Redis
REDIS_URL=redis://host:port
REDIS_CLUSTER_NODES=redis1:6379,redis2:6379

# Authentication
JWT_SECRET=your-256-bit-secret
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# External APIs
FOODICS_CLIENT_ID=your_client_id
FOODICS_CLIENT_SECRET=your_client_secret
CAREEM_API_KEY=your_api_key
TALABAT_API_KEY=your_api_key

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn
PROMETHEUS_PORT=9090

# Security
ENCRYPTION_KEY=your-32-char-encryption-key
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

### Service-Specific Variables

#### POS Adapter Service
```bash
SERVICE_PORT=4002
POS_SYNC_INTERVAL=300000
POS_BATCH_SIZE=100
POS_RETRY_ATTEMPTS=3
```

#### Delivery Service
```bash
SERVICE_PORT=4003
DELIVERY_WEBHOOK_SECRET=your_webhook_secret
DELIVERY_TIMEOUT=30000
```

#### Webhook Router
```bash
SERVICE_PORT=4004
WEBHOOK_QUEUE_SIZE=1000
WEBHOOK_RETRY_DELAY=1000
```

## Database Setup

### PostgreSQL Configuration

1. **Production Database Setup**
   ```sql
   -- Create database and user
   CREATE DATABASE integration_platform;
   CREATE USER integration_user WITH ENCRYPTED PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE integration_platform TO integration_user;

   -- Performance optimizations
   ALTER SYSTEM SET shared_buffers = '256MB';
   ALTER SYSTEM SET effective_cache_size = '1GB';
   ALTER SYSTEM SET maintenance_work_mem = '64MB';
   ALTER SYSTEM SET checkpoint_completion_target = 0.9;
   ALTER SYSTEM SET wal_buffers = '16MB';
   ALTER SYSTEM SET default_statistics_target = 100;
   ```

2. **Connection Pooling**
   ```bash
   # Using PgBouncer
   docker run -d \
     --name pgbouncer \
     -p 6432:6432 \
     -e DATABASES_HOST=postgres-host \
     -e DATABASES_PORT=5432 \
     -e DATABASES_USER=integration_user \
     -e DATABASES_PASSWORD=secure_password \
     -e DATABASES_DBNAME=integration_platform \
     pgbouncer/pgbouncer:latest
   ```

3. **Backup Strategy**
   ```bash
   # Automated backups
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="/backups"

   pg_dump -h localhost -U integration_user integration_platform | \
   gzip > "$BACKUP_DIR/integration_platform_$DATE.sql.gz"

   # Keep last 30 days
   find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
   ```

### Redis Configuration

```redis
# Redis performance tuning
maxmemory 512mb
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300

# Persistence
save 900 1
save 300 10
save 60 10000
```

## Microservices Deployment

### Service Discovery

```yaml
# consul-config.yaml
services:
  - name: api-gateway
    port: 4000
    check:
      http: http://localhost:4000/health
      interval: 10s

  - name: pos-adapter
    port: 4002
    check:
      http: http://localhost:4002/health
      interval: 10s
```

### Load Balancing

```nginx
# nginx.conf
upstream api_gateway {
    least_conn;
    server api-gateway-1:4000 max_fails=3 fail_timeout=30s;
    server api-gateway-2:4000 max_fails=3 fail_timeout=30s;
    server api-gateway-3:4000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://api_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Auto-scaling Configuration

```yaml
# HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Monitoring & Logging

### Prometheus Metrics

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:4000']
    metrics_path: /metrics

  - job_name: 'pos-adapter'
    static_configs:
      - targets: ['pos-adapter:4002']
    metrics_path: /metrics
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Integration Platform",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ]
      }
    ]
  }
}
```

### Centralized Logging

```yaml
# ELK Stack
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
    environment:
      - discovery.type=single-node

  logstash:
    image: docker.elastic.co/logstash/logstash:7.14.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:7.14.0
    ports:
      - "5601:5601"
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose exec api-gateway npx prisma db pull

# Check connection pool
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
```

#### Memory Issues
```bash
# Check container memory usage
docker stats

# Node.js memory monitoring
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

#### Performance Issues
```bash
# Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

# Check Redis performance
redis-cli --latency-history -h redis-host -p 6379
```

### Health Checks

```bash
# API Gateway health
curl -f http://localhost:4000/health

# Database health
docker-compose exec postgres pg_isready -U postgres

# Redis health
docker-compose exec redis redis-cli ping

# Service-specific health
curl -f http://localhost:4002/health  # POS Adapter
curl -f http://localhost:4003/health  # Delivery Service
```

### Log Analysis

```bash
# View service logs
docker-compose logs -f api-gateway
docker-compose logs -f pos-adapter
docker-compose logs -f frontend

# Filter error logs
docker-compose logs | grep ERROR

# Export logs
docker-compose logs --since="1h" > integration-platform-logs.txt
```

### Recovery Procedures

#### Database Recovery
```bash
# Restore from backup
gunzip -c backup.sql.gz | psql -h localhost -U postgres integration_platform

# Reset migrations
npx prisma migrate reset --force

# Recreate schema
npx prisma db push
```

#### Service Recovery
```bash
# Restart specific service
docker-compose restart api-gateway

# Restart all services
docker-compose restart

# Force recreate containers
docker-compose up -d --force-recreate
```

## Performance Optimization

### Database Optimization
- Enable connection pooling
- Add appropriate indexes
- Optimize queries using EXPLAIN ANALYZE
- Configure PostgreSQL parameters
- Implement read replicas for scaling

### Application Optimization
- Enable Redis caching
- Implement rate limiting
- Use CDN for static assets
- Enable compression
- Optimize Docker images

### Scaling Guidelines
- Monitor resource usage
- Implement horizontal pod autoscaling
- Use load balancers
- Consider database sharding
- Implement caching strategies

---

For additional support or questions, please refer to the [Architecture Documentation](./ARCHITECTURE.md) or create an issue in the repository.