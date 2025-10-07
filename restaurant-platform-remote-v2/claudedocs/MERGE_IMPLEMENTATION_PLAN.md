# 🏗️ INTEGRATION PLATFORM MERGE - COMPREHENSIVE IMPLEMENTATION PLAN

## 📋 Executive Summary

**Goal**: Merge integration-platform (12% complete) into restaurant-platform-remote-v2 (65-70% complete) to create a unified enterprise platform with business dashboard and integration developer portal.

**Timeline**: 10-12 weeks (3 phases)
**Risk Level**: Medium-High (requires careful data migration and testing)
**Complexity**: High (dual authentication systems, monorepo structure, multi-tenant architecture)

---

## 📊 Current State Analysis

### Integration Platform (Source)
- **Completion**: 12%
- **Key Assets**:
  - ✅ Webhook infrastructure (WebhookConfig, WebhookLog, RetryQueue)
  - ✅ Order state machine (Order, OrderEvent models)
  - ✅ Integration management (Integration, IntegrationLog)
  - ✅ Analytics & metrics (WebhookMetrics, SystemHealth)
  - ✅ Multi-provider adapters (Careem, Talabat, etc.)
  - ✅ NestJS microservices architecture

### Restaurant Platform (Destination)
- **Completion**: 65-70%
- **Key Assets**:
  - ✅ Complete business management (Company, Branch, User)
  - ✅ Menu management system
  - ✅ Delivery provider integrations
  - ✅ Printing system
  - ✅ Promotions & availability
  - ✅ Tax management
  - ✅ Template builder

---

## 🎯 Phase 1: Preparation & Analysis (Week 1-2)

### 1.1 Database Schema Consolidation

```sql
-- Schema merge strategy
-- 1. Create new tables from integration-platform
-- 2. Map relationships to existing tables
-- 3. Add missing columns to existing tables
-- 4. Create migration scripts

-- New tables to add from integration-platform:
CREATE TABLE webhook_configs (...);
CREATE TABLE webhook_logs (...);
CREATE TABLE retry_queue (...);
CREATE TABLE integrations (...);
CREATE TABLE integration_logs (...);
CREATE TABLE webhook_metrics (...);
CREATE TABLE system_health (...);

-- Modify existing tables:
ALTER TABLE "Order" ADD COLUMN state_machine_status VARCHAR(50);
ALTER TABLE "Order" ADD COLUMN webhook_event_id VARCHAR(255);
```

### 1.2 Directory Structure Planning

```bash
restaurant-platform-remote-v2/
├── backend/
│   ├── src/
│   │   ├── business/              # Business domain (existing)
│   │   │   ├── companies/
│   │   │   ├── branches/
│   │   │   ├── users/
│   │   │   └── menus/
│   │   ├── integration/           # Integration domain (NEW)
│   │   │   ├── webhooks/
│   │   │   ├── providers/
│   │   │   ├── orders/
│   │   │   └── analytics/
│   │   └── shared/                # Shared utilities
│   │       ├── auth/
│   │       ├── database/
│   │       └── utils/
│   ├── prisma/
│   │   ├── schema.prisma          # Unified schema
│   │   └── migrations/
│   └── microservices/             # From integration-platform
│       ├── pos-adapter-service/
│       └── delivery-service/
├── frontend/
│   ├── pages/
│   │   ├── dashboard/             # Business dashboard
│   │   └── integration/           # Developer portal (NEW)
│   └── components/
│       ├── business/
│       └── integration/
└── docs/
    ├── api/
    └── integration/
```

### 1.3 Dependency Analysis & Resolution

```json
// Unified package.json dependencies
{
  "dependencies": {
    // From integration-platform (NestJS stack)
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/event-emitter": "^3.0.1",
    "@nestjs/websockets": "^10.2.7",
    "@nestjs/schedule": "^4.0.0",

    // Existing from restaurant-platform
    "@prisma/client": "^5.4.2",
    "express": "^5.1.0",

    // Shared dependencies (resolve versions)
    "axios": "^1.12.2",
    "bcryptjs": "^2.4.3",
    "uuid": "^9.0.1"
  }
}
```

---

## 🔧 Phase 2: Implementation (Week 3-8)

### 2.1 File Migration Commands

```bash
#!/bin/bash
# migration-script.sh

# Step 1: Create backup
cp -r /home/admin/restaurant-platform-remote-v2 /home/admin/restaurant-platform-backup-$(date +%Y%m%d)
cp -r /home/admin/integration-platform /home/admin/integration-platform-backup-$(date +%Y%m%d)

# Step 2: Create integration domain structure
mkdir -p /home/admin/restaurant-platform-remote-v2/backend/src/integration/{webhooks,providers,orders,analytics}

# Step 3: Copy webhook modules
cp -r /home/admin/integration-platform/src/modules/webhook/* \
      /home/admin/restaurant-platform-remote-v2/backend/src/integration/webhooks/

# Step 4: Copy provider adapters
cp -r /home/admin/integration-platform/src/modules/{careem,talabat,deliveroo,jahez,hungerstation}/* \
      /home/admin/restaurant-platform-remote-v2/backend/src/integration/providers/

# Step 5: Copy order management
cp -r /home/admin/integration-platform/src/modules/orders/* \
      /home/admin/restaurant-platform-remote-v2/backend/src/integration/orders/

# Step 6: Copy analytics
cp -r /home/admin/integration-platform/src/modules/analytics/* \
      /home/admin/restaurant-platform-remote-v2/backend/src/integration/analytics/

# Step 7: Copy microservices
cp -r /home/admin/integration-platform/microservices \
      /home/admin/restaurant-platform-remote-v2/backend/

# Step 8: Merge configuration files
# (Manual merge required for complex configs)
```

### 2.2 Code Consolidation Tasks

#### 2.2.1 Authentication System Merge

```typescript
// backend/src/shared/auth/dual-auth.strategy.ts
export class DualAuthStrategy {
  // JWT for business users
  validateJWT(token: string): Promise<User> {
    // Existing JWT validation
  }

  // API Key for integration developers
  validateAPIKey(apiKey: string): Promise<Integration> {
    // New API key validation from integration-platform
  }

  // Combined middleware
  authenticate(req: Request): Promise<User | Integration> {
    if (req.headers['x-api-key']) {
      return this.validateAPIKey(req.headers['x-api-key']);
    }
    return this.validateJWT(req.headers.authorization);
  }
}
```

#### 2.2.2 Prisma Schema Merge

```prisma
// backend/prisma/schema.prisma - Unified schema

// ==================== EXISTING MODELS ====================
model Company { ... }
model Branch { ... }
model User { ... }
model Order {
  // ... existing fields ...

  // NEW: Integration fields
  externalOrderId   String?   @unique
  provider          Provider?
  webhookEventId    String?
  stateMachine      Json?     // State machine data
  integrationId     String?

  // Relations
  integration       Integration? @relation(fields: [integrationId], references: [id])
  webhookEvents     WebhookLog[]
}

// ==================== NEW INTEGRATION MODELS ====================
model WebhookConfig {
  id          String   @id @default(cuid())
  companyId   String   // Link to Company
  branchId    String?  // Optional branch-specific config
  provider    Provider
  url         String
  secret      String?
  apiKey      String?
  // ... rest from integration-platform ...

  // Relations
  company     Company  @relation(fields: [companyId], references: [id])
  branch      Branch?  @relation(fields: [branchId], references: [id])
}

// ... other integration models ...
```

#### 2.2.3 Webhook Infrastructure Integration

```typescript
// backend/src/integration/webhooks/webhook.service.ts
@Injectable()
export class UnifiedWebhookService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private orderService: OrderService,
  ) {}

  async processWebhook(provider: string, payload: any, headers: any) {
    // 1. Validate webhook signature
    const config = await this.getWebhookConfig(provider);
    if (!this.validateSignature(payload, headers, config)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // 2. Log webhook event
    const log = await this.logWebhookEvent(provider, payload);

    // 3. Process based on event type
    switch (payload.eventType) {
      case 'order.created':
        await this.handleOrderCreated(payload, provider);
        break;
      case 'order.updated':
        await this.handleOrderUpdated(payload, provider);
        break;
      // ... other events
    }

    // 4. Update metrics
    await this.updateWebhookMetrics(provider, log);
  }
}
```

### 2.3 New Components to Build

#### 2.3.1 Integration Developer Portal

```typescript
// frontend/pages/integration/index.tsx
export default function IntegrationPortal() {
  return (
    <IntegrationLayout>
      <Routes>
        <Route path="/integration" element={<IntegrationDashboard />} />
        <Route path="/integration/api-keys" element={<APIKeyManager />} />
        <Route path="/integration/webhooks" element={<WebhookConfig />} />
        <Route path="/integration/docs" element={<APIDocs />} />
        <Route path="/integration/logs" element={<IntegrationLogs />} />
        <Route path="/integration/analytics" element={<IntegrationAnalytics />} />
      </Routes>
    </IntegrationLayout>
  );
}
```

#### 2.3.2 API Key Management

```typescript
// backend/src/integration/api-keys/api-key.service.ts
@Injectable()
export class APIKeyService {
  async generateAPIKey(companyId: string, name: string) {
    const apiKey = this.generateSecureKey();
    const hashedKey = await bcrypt.hash(apiKey, 10);

    const integration = await this.prisma.integration.create({
      data: {
        name,
        companyId,
        apiKey: hashedKey,
        clientId: uuidv4(),
        status: 'ACTIVE',
      },
    });

    return {
      apiKey, // Return once for user to save
      clientId: integration.clientId,
      createdAt: integration.createdAt,
    };
  }

  private generateSecureKey(): string {
    return `sk_live_${crypto.randomBytes(32).toString('hex')}`;
  }
}
```

#### 2.3.3 Webhook Configuration UI

```tsx
// frontend/components/integration/WebhookConfig.tsx
export function WebhookConfig() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);

  return (
    <div className="webhook-config">
      <h2>Webhook Configuration</h2>

      <WebhookForm onSubmit={handleAddWebhook} />

      <WebhookList
        webhooks={webhooks}
        onTest={handleTestWebhook}
        onToggle={handleToggleWebhook}
        onDelete={handleDeleteWebhook}
      />

      <WebhookEventSelector
        selected={selectedEvents}
        onChange={handleEventChange}
      />

      <WebhookSecuritySettings
        secret={webhookSecret}
        onRegenerate={handleRegenerateSecret}
      />
    </div>
  );
}
```

---

## 🗄️ Phase 3: Database Migration (Week 4-5)

### 3.1 Migration Script

```sql
-- migration.sql
BEGIN TRANSACTION;

-- Step 1: Create new integration tables
CREATE TABLE webhook_configs (
  id VARCHAR(30) PRIMARY KEY DEFAULT cuid_generate(),
  company_id VARCHAR(30) NOT NULL REFERENCES companies(id),
  branch_id VARCHAR(30) REFERENCES branches(id),
  provider VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  api_key TEXT,
  events JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE webhook_logs (
  id VARCHAR(30) PRIMARY KEY DEFAULT cuid_generate(),
  config_id VARCHAR(30) REFERENCES webhook_configs(id),
  event_type VARCHAR(100),
  payload JSONB,
  status VARCHAR(20),
  response_time INTEGER,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Add integration columns to existing tables
ALTER TABLE "Order"
  ADD COLUMN external_order_id VARCHAR(255) UNIQUE,
  ADD COLUMN provider VARCHAR(50),
  ADD COLUMN integration_id VARCHAR(30),
  ADD COLUMN state_machine JSONB;

-- Step 3: Create indexes for performance
CREATE INDEX idx_webhook_configs_company ON webhook_configs(company_id);
CREATE INDEX idx_webhook_configs_provider ON webhook_configs(provider);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX idx_orders_external_id ON "Order"(external_order_id);
CREATE INDEX idx_orders_provider ON "Order"(provider);

-- Step 4: Migrate existing integration data
INSERT INTO webhook_configs (company_id, provider, url, events)
SELECT
  c.id,
  dpc.provider_type,
  dpc.webhook_url,
  '["order.created", "order.updated", "order.cancelled"]'::jsonb
FROM "CompanyProviderConfig" dpc
JOIN "Company" c ON c.id = dpc.company_id
WHERE dpc.webhook_url IS NOT NULL;

COMMIT;
```

### 3.2 Data Migration Strategy

```typescript
// scripts/migrate-integration-data.ts
async function migrateIntegrationData() {
  const sourceDb = new PrismaClient({
    datasources: { db: { url: process.env.SOURCE_DATABASE_URL } }
  });
  const targetDb = new PrismaClient({
    datasources: { db: { url: process.env.TARGET_DATABASE_URL } }
  });

  // 1. Migrate webhook configurations
  const webhookConfigs = await sourceDb.webhookConfig.findMany();
  for (const config of webhookConfigs) {
    await targetDb.webhookConfig.upsert({
      where: { clientId: config.clientId },
      update: config,
      create: {
        ...config,
        companyId: await mapClientToCompany(config.clientId),
      },
    });
  }

  // 2. Migrate order state data
  const orders = await sourceDb.order.findMany({
    include: { events: true }
  });

  for (const order of orders) {
    await targetDb.order.update({
      where: { id: order.externalOrderId },
      data: {
        stateMachine: order.metadata,
        externalOrderId: order.externalOrderId,
        provider: order.provider,
      },
    });
  }

  // 3. Migrate webhook logs (last 30 days only)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logs = await sourceDb.webhookLog.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    orderBy: { createdAt: 'desc' },
    take: 10000,
  });

  await targetDb.webhookLog.createMany({ data: logs });
}
```

---

## 🧪 Phase 4: Testing Strategy (Week 6-7)

### 4.1 Unit Tests

```typescript
// backend/src/integration/webhooks/__tests__/webhook.service.spec.ts
describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WebhookService, PrismaService],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('processWebhook', () => {
    it('should validate webhook signature', async () => {
      const payload = { orderId: '123', status: 'confirmed' };
      const headers = { 'x-webhook-signature': 'valid-sig' };

      jest.spyOn(service, 'validateSignature').mockReturnValue(true);

      await service.processWebhook('careem', payload, headers);

      expect(service.validateSignature).toHaveBeenCalledWith(
        payload,
        headers,
        expect.any(Object)
      );
    });

    it('should reject invalid signatures', async () => {
      const payload = { orderId: '123' };
      const headers = { 'x-webhook-signature': 'invalid' };

      jest.spyOn(service, 'validateSignature').mockReturnValue(false);

      await expect(
        service.processWebhook('careem', payload, headers)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

### 4.2 Integration Tests

```typescript
// backend/test/integration/order-flow.e2e-spec.ts
describe('Order Flow Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  it('should handle complete order lifecycle', async () => {
    // 1. Create order via webhook
    const webhookPayload = {
      eventType: 'order.created',
      order: {
        id: 'ext-123',
        items: [{ name: 'Pizza', quantity: 2, price: 25 }],
        total: 50,
        customer: { name: 'John', phone: '+1234567890' },
      },
    };

    const response = await request(app.getHttpServer())
      .post('/webhooks/careem')
      .send(webhookPayload)
      .set('x-webhook-signature', generateValidSignature(webhookPayload));

    expect(response.status).toBe(200);

    // 2. Verify order created in database
    const order = await prisma.order.findUnique({
      where: { externalOrderId: 'ext-123' },
    });

    expect(order).toBeDefined();
    expect(order.status).toBe('PENDING');

    // 3. Update order status
    const updatePayload = {
      eventType: 'order.updated',
      order: { id: 'ext-123', status: 'confirmed' },
    };

    await request(app.getHttpServer())
      .post('/webhooks/careem')
      .send(updatePayload)
      .set('x-webhook-signature', generateValidSignature(updatePayload));

    // 4. Verify status updated
    const updatedOrder = await prisma.order.findUnique({
      where: { externalOrderId: 'ext-123' },
    });

    expect(updatedOrder.status).toBe('CONFIRMED');
  });
});
```

### 4.3 End-to-End Tests

```typescript
// e2e/developer-portal.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Developer Portal E2E', () => {
  test('should generate and test API key', async ({ page }) => {
    // 1. Login to developer portal
    await page.goto('/integration/login');
    await page.fill('#email', 'dev@restaurant.com');
    await page.fill('#password', 'secure123');
    await page.click('button[type="submit"]');

    // 2. Navigate to API keys
    await page.goto('/integration/api-keys');
    await page.click('button:has-text("Generate New Key")');

    // 3. Create API key
    await page.fill('#key-name', 'Test Integration');
    await page.click('button:has-text("Create")');

    // 4. Copy API key
    const apiKey = await page.locator('.api-key-display').textContent();
    expect(apiKey).toMatch(/^sk_live_[a-f0-9]{64}$/);

    // 5. Test API key
    const response = await fetch('/api/integration/test', {
      headers: { 'x-api-key': apiKey },
    });
    expect(response.status).toBe(200);
  });

  test('should configure and test webhook', async ({ page }) => {
    await page.goto('/integration/webhooks');

    // 1. Add webhook endpoint
    await page.fill('#webhook-url', 'https://example.com/webhook');
    await page.click('button:has-text("Add Endpoint")');

    // 2. Select events
    await page.check('input[value="order.created"]');
    await page.check('input[value="order.updated"]');

    // 3. Save configuration
    await page.click('button:has-text("Save Configuration")');

    // 4. Test webhook
    await page.click('button:has-text("Send Test Event")');

    // 5. Verify test result
    await expect(page.locator('.test-result')).toContainText('Success');
  });
});
```

### 4.4 Migration Validation Tests

```bash
#!/bin/bash
# test-migration.sh

echo "Running migration validation tests..."

# 1. Test database schema integrity
psql -U postgres -d restaurant_platform -c "
  SELECT COUNT(*) as integration_tables FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('webhook_configs', 'webhook_logs', 'integrations');
"

# 2. Test data migration completeness
psql -U postgres -d restaurant_platform -c "
  SELECT
    (SELECT COUNT(*) FROM webhook_configs) as webhook_configs,
    (SELECT COUNT(*) FROM webhook_logs) as webhook_logs,
    (SELECT COUNT(*) FROM integrations) as integrations,
    (SELECT COUNT(*) FROM \"Order\" WHERE external_order_id IS NOT NULL) as migrated_orders;
"

# 3. Test foreign key constraints
psql -U postgres -d restaurant_platform -c "
  SELECT
    conname as constraint_name,
    conrelid::regclass as table_name
  FROM pg_constraint
  WHERE contype = 'f'
  AND conrelid::regclass::text LIKE '%webhook%';
"

# 4. Run application health checks
curl -X GET http://localhost:3000/api/health

echo "Migration validation complete!"
```

---

## 🚀 Phase 5: Deployment (Week 8-10)

### 5.1 Development Environment Setup

```yaml
# docker-compose.development.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: restaurant_platform_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./migration.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/restaurant_platform_dev
    volumes:
      - ./backend:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    depends_on:
      - postgres

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "3001:3000"

volumes:
  postgres_data:
```

### 5.2 Staging Environment Validation

```typescript
// scripts/staging-validation.ts
async function validateStagingEnvironment() {
  const checks = [
    // 1. Database connectivity
    {
      name: 'Database Connection',
      test: async () => {
        const prisma = new PrismaClient();
        await prisma.$connect();
        await prisma.$disconnect();
        return true;
      },
    },

    // 2. API endpoints
    {
      name: 'Business API',
      test: async () => {
        const response = await fetch('/api/health');
        return response.status === 200;
      },
    },

    // 3. Integration API
    {
      name: 'Integration API',
      test: async () => {
        const response = await fetch('/api/integration/health');
        return response.status === 200;
      },
    },

    // 4. Webhook processing
    {
      name: 'Webhook Processing',
      test: async () => {
        const testPayload = { test: true };
        const response = await fetch('/webhooks/test', {
          method: 'POST',
          body: JSON.stringify(testPayload),
          headers: { 'Content-Type': 'application/json' },
        });
        return response.status === 200;
      },
    },
  ];

  const results = await Promise.all(
    checks.map(async (check) => {
      try {
        const passed = await check.test();
        return { name: check.name, passed, error: null };
      } catch (error) {
        return { name: check.name, passed: false, error: error.message };
      }
    })
  );

  console.table(results);
  return results.every(r => r.passed);
}
```

### 5.3 Production Migration Runbook

```markdown
## Production Migration Checklist

### Pre-Migration (T-2 hours)
- [ ] Backup production database
- [ ] Backup application files
- [ ] Notify users of maintenance window
- [ ] Set up rollback environment
- [ ] Test rollback procedure

### Migration Phase 1: Database (T-0)
- [ ] Enable maintenance mode
- [ ] Stop application services
- [ ] Run database migration script
- [ ] Verify schema changes
- [ ] Run data migration script
- [ ] Verify data integrity

### Migration Phase 2: Application (T+30 min)
- [ ] Deploy new backend code
- [ ] Deploy new frontend code
- [ ] Update environment variables
- [ ] Start application services
- [ ] Run health checks

### Migration Phase 3: Validation (T+1 hour)
- [ ] Test business dashboard login
- [ ] Test integration portal login
- [ ] Create test order via webhook
- [ ] Verify order processing
- [ ] Check monitoring dashboards
- [ ] Review error logs

### Post-Migration (T+2 hours)
- [ ] Disable maintenance mode
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Send completion notification
- [ ] Document any issues

### Rollback Triggers
- [ ] Database migration failure
- [ ] >10% error rate increase
- [ ] Critical functionality broken
- [ ] Performance degradation >50%
```

### 5.4 Rollback Strategy

```bash
#!/bin/bash
# rollback.sh

echo "Initiating rollback procedure..."

# 1. Stop current services
docker-compose down

# 2. Restore database backup
psql -U postgres -c "DROP DATABASE IF EXISTS restaurant_platform;"
psql -U postgres -c "CREATE DATABASE restaurant_platform;"
psql -U postgres restaurant_platform < /backups/db-backup-$(date +%Y%m%d).sql

# 3. Restore application code
rm -rf /app/current
mv /app/backup /app/current

# 4. Restore environment variables
cp /backups/.env.backup /app/current/.env

# 5. Start services with previous version
cd /app/current
docker-compose up -d

# 6. Verify rollback
curl -X GET http://localhost:3000/api/health

echo "Rollback complete!"
```

---

## 📊 Phase 6: Monitoring & Optimization (Week 9-10)

### 6.1 Performance Monitoring

```typescript
// backend/src/shared/monitoring/performance.monitor.ts
@Injectable()
export class PerformanceMonitor {
  private metrics = {
    webhookProcessing: new Histogram({
      name: 'webhook_processing_duration',
      help: 'Webhook processing duration in ms',
      labelNames: ['provider', 'event_type'],
    }),

    apiRequests: new Counter({
      name: 'api_requests_total',
      help: 'Total API requests',
      labelNames: ['endpoint', 'method', 'status'],
    }),

    databaseQueries: new Histogram({
      name: 'database_query_duration',
      help: 'Database query duration in ms',
      labelNames: ['operation', 'table'],
    }),
  };

  trackWebhookProcessing(provider: string, eventType: string, duration: number) {
    this.metrics.webhookProcessing
      .labels(provider, eventType)
      .observe(duration);
  }

  trackAPIRequest(endpoint: string, method: string, status: number) {
    this.metrics.apiRequests
      .labels(endpoint, method, status.toString())
      .inc();
  }
}
```

### 6.2 System Health Monitoring

```typescript
// backend/src/shared/health/health-check.service.ts
@Injectable()
export class HealthCheckService {
  async checkSystemHealth(): Promise<SystemHealthReport> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkWebhookQueue(),
      this.checkIntegrations(),
      this.checkDiskSpace(),
      this.checkMemory(),
    ]);

    const overallHealth = checks.every(c => c.status === 'healthy')
      ? 'healthy'
      : checks.some(c => c.status === 'unhealthy')
      ? 'unhealthy'
      : 'degraded';

    return {
      status: overallHealth,
      timestamp: new Date(),
      checks,
    };
  }

  private async checkWebhookQueue(): Promise<HealthCheck> {
    const queueSize = await this.prisma.retryQueue.count({
      where: { status: 'PENDING' }
    });

    return {
      service: 'webhook_queue',
      status: queueSize > 1000 ? 'degraded' : 'healthy',
      metadata: { queueSize },
    };
  }
}
```

---

## 🎯 Timeline & Milestones

### Week 1-2: Preparation
- ✅ Complete project analysis
- ✅ Design unified architecture
- ✅ Create migration scripts
- ✅ Set up development environment

### Week 3-4: Core Migration
- ✅ Migrate webhook infrastructure
- ✅ Migrate order state machine
- ✅ Integrate authentication systems
- ✅ Merge Prisma schemas

### Week 5-6: Feature Development
- ✅ Build developer portal UI
- ✅ Implement API key management
- ✅ Create webhook configuration UI
- ✅ Build monitoring dashboard

### Week 7-8: Testing
- ✅ Complete unit tests
- ✅ Complete integration tests
- ✅ Complete E2E tests
- ✅ Performance testing

### Week 9: Staging Deployment
- ✅ Deploy to staging
- ✅ Run validation tests
- ✅ Performance optimization
- ✅ Security audit

### Week 10: Production Release
- ✅ Production backup
- ✅ Execute migration
- ✅ Monitor and validate
- ✅ Documentation update

---

## ⚠️ Risk Analysis & Mitigation

### High-Risk Areas

1. **Database Migration**
   - Risk: Data loss or corruption
   - Mitigation: Complete backups, staged migration, validation scripts

2. **Authentication Conflicts**
   - Risk: Users unable to access system
   - Mitigation: Dual-auth testing, gradual rollout, fallback mechanism

3. **Webhook Processing Interruption**
   - Risk: Lost orders during migration
   - Mitigation: Queue buffering, replay capability, monitoring

4. **Performance Degradation**
   - Risk: Slower response times
   - Mitigation: Load testing, caching, database optimization

### Contingency Plans

1. **Partial Rollback**: Keep systems separate if critical issues
2. **Gradual Migration**: Move one provider at a time
3. **Feature Flags**: Toggle new features independently
4. **Blue-Green Deployment**: Maintain parallel environments

---

## 📋 Quality Assurance Checklist

### Code Quality
- [ ] All tests passing (>90% coverage)
- [ ] No critical security vulnerabilities
- [ ] Code review completed
- [ ] Documentation updated

### Performance
- [ ] Response time <200ms for APIs
- [ ] Webhook processing <500ms
- [ ] Database queries optimized
- [ ] Caching implemented

### Security
- [ ] API keys properly hashed
- [ ] Webhook signatures validated
- [ ] Rate limiting implemented
- [ ] Audit logging enabled

### Monitoring
- [ ] Health checks configured
- [ ] Metrics dashboard live
- [ ] Alert rules defined
- [ ] Log aggregation working

---

## 🎉 Success Criteria

### Technical Success
- ✅ Zero data loss during migration
- ✅ All existing features working
- ✅ New integration features operational
- ✅ Performance within SLA

### Business Success
- ✅ Unified platform operational
- ✅ Developer portal accessible
- ✅ Integration documentation complete
- ✅ Customer satisfaction maintained

### Operational Success
- ✅ Monitoring in place
- ✅ Support team trained
- ✅ Documentation updated
- ✅ Rollback tested

---

## 📝 Post-Implementation Tasks

1. **Documentation**
   - Update API documentation
   - Create integration guides
   - Update deployment procedures

2. **Training**
   - Train support team
   - Create video tutorials
   - Conduct developer workshops

3. **Optimization**
   - Performance tuning
   - Cost optimization
   - Security hardening

4. **Future Enhancements**
   - Additional provider integrations
   - Advanced analytics
   - Machine learning for order prediction
   - Real-time dashboard updates

---

## 🔧 Implementation Commands Summary

```bash
# Quick reference for implementation

# 1. Create backup
./scripts/backup.sh

# 2. Run migration
./scripts/migrate.sh

# 3. Run tests
npm run test:unit
npm run test:integration
npm run test:e2e

# 4. Deploy to staging
./scripts/deploy-staging.sh

# 5. Validate staging
./scripts/validate-staging.sh

# 6. Deploy to production
./scripts/deploy-production.sh

# 7. Monitor deployment
./scripts/monitor-health.sh

# 8. Rollback if needed
./scripts/rollback.sh
```

---

**Document Version**: 1.0
**Created**: 2024
**Last Updated**: Today
**Status**: Ready for Implementation