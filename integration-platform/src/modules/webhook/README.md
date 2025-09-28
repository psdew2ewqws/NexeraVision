# Webhook Logger Service

A comprehensive production-ready webhook logging service for tracking, monitoring, and analyzing webhook delivery performance in the integration platform.

## Features

### Core Logging Capabilities
- ✅ **Comprehensive Request/Response Logging**: Captures headers, payloads, response times, and status codes
- ✅ **Multi-tenant Support**: Organization-based data isolation
- ✅ **Correlation Tracking**: Trace related webhook events using correlation IDs
- ✅ **Retry Management**: Track retry attempts and failure scenarios
- ✅ **Status Tracking**: Monitor webhook states (pending, delivered, failed, retrying)

### Analytics & Monitoring
- ✅ **Performance Metrics**: Response time analytics with percentiles (P95, P99)
- ✅ **Success Rate Tracking**: Overall and per-event-type success rates
- ✅ **Error Analytics**: Common error patterns and status code distribution
- ✅ **Time-series Data**: Hourly and daily statistics for trending
- ✅ **Health Monitoring**: Automated health checks with configurable thresholds

### Search & Filtering
- ✅ **Advanced Filtering**: Filter by event type, status, date range, response time
- ✅ **Full-text Search**: Search across event types, error messages, and correlation IDs
- ✅ **Pagination**: Efficient pagination for large datasets
- ✅ **Sorting**: Flexible sorting by various fields

### Data Management
- ✅ **Automatic Cleanup**: Scheduled log rotation with configurable retention
- ✅ **Archival Support**: Archive old logs instead of deletion
- ✅ **Efficient Indexing**: Optimized database indexes for fast queries

## Database Schema

The service uses a comprehensive `WebhookLog` model with the following key fields:

```sql
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  configuration_id UUID,
  webhook_url VARCHAR(500) NOT NULL,
  method VARCHAR(10) DEFAULT 'POST',
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- 'pending', 'delivered', 'failed', 'retrying'
  http_status_code INTEGER,
  request_headers JSONB DEFAULT '{}',
  request_payload JSONB DEFAULT '{}',
  response_headers JSONB DEFAULT '{}',
  response_body JSONB,
  error_message TEXT,
  error_details JSONB,
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  response_time_ms INTEGER,
  correlation_id VARCHAR(255),
  signature VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimized indexes for performance
CREATE INDEX idx_webhook_logs_org_id ON webhook_logs(organization_id);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at);
CREATE INDEX idx_webhook_logs_correlation_id ON webhook_logs(correlation_id);
```

## Usage Examples

### Basic Webhook Logging

```typescript
import { WebhookLoggerService } from './webhook-logger.service';

// Log incoming webhook
const webhookLog = await webhookLogger.logIncomingWebhook({
  organizationId: 'org-123',
  configurationId: 'config-456',
  webhookUrl: 'https://api.example.com/webhooks/orders',
  eventType: 'order.created',
  eventId: 'order-789',
  requestHeaders: req.headers,
  requestPayload: req.body,
  ipAddress: req.ip,
  correlationId: 'correlation-123',
});

// Update with response
await webhookLogger.updateWebhookLog(webhookLog.id, {
  status: 'delivered',
  httpStatusCode: 200,
  responseTimeMs: 450,
  responseHeaders: { 'content-type': 'application/json' },
  responseBody: { success: true },
});
```

### Advanced Filtering and Search

```typescript
// Get filtered webhook logs
const result = await webhookLogger.getWebhookLogs({
  organizationId: 'org-123',
  eventType: 'order',
  status: 'failed',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-12-31'),
  minResponseTime: 1000, // Slow webhooks only
  page: 1,
  limit: 50,
  sortBy: 'responseTimeMs',
  sortOrder: 'desc',
});

// Search webhook logs
const searchResults = await webhookLogger.searchWebhookLogs(
  'org-123',
  'order-123',
  { status: 'failed' }
);
```

### Analytics and Metrics

```typescript
// Get comprehensive metrics
const metrics = await webhookLogger.getWebhookMetrics(
  'org-123',
  new Date('2023-01-01'),
  new Date('2023-12-31')
);

console.log(`Success rate: ${metrics.successRate}%`);
console.log(`Average response time: ${metrics.averageResponseTime}ms`);

// Get performance analytics
const performance = await webhookLogger.getPerformanceAnalytics('org-123');
console.log(`P95 response time: ${performance.p95ResponseTime}ms`);

// Get error analytics
const errors = await webhookLogger.getErrorAnalytics('org-123');
console.log(`Total errors: ${errors.totalErrors}`);
console.log(`Common errors:`, errors.commonErrors);
```

### Correlation Tracking

```typescript
// Trace all webhooks for a correlation ID
const correlatedLogs = await webhookLogger.getWebhookLogsByCorrelation(
  'org-123',
  'correlation-abc-123'
);

// Useful for debugging distributed webhook flows
correlatedLogs.forEach(log => {
  console.log(`${log.eventType} -> ${log.status} (${log.responseTimeMs}ms)`);
});
```

## REST API Endpoints

The service includes a comprehensive REST API:

### Core Endpoints
- `GET /webhook-logs` - Get webhook logs with filtering
- `GET /webhook-logs/search?q={query}` - Search webhook logs
- `GET /webhook-logs/{id}` - Get specific webhook log
- `GET /webhook-logs/correlation/{correlationId}` - Get logs by correlation

### Analytics Endpoints
- `GET /webhook-logs/metrics` - Get comprehensive metrics
- `GET /webhook-logs/performance` - Get performance analytics
- `GET /webhook-logs/errors` - Get error analytics

### Query Parameters
- `configurationId` - Filter by webhook configuration
- `eventType` - Filter by event type
- `status` - Filter by webhook status
- `startDate` / `endDate` - Date range filtering
- `minResponseTime` / `maxResponseTime` - Response time filtering
- `page` / `limit` - Pagination
- `sortBy` / `sortOrder` - Sorting

## Configuration

### Environment Variables

```bash
# Webhook log retention (default: 90 days)
WEBHOOK_LOG_RETENTION_DAYS=90

# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/integration_platform
```

### Service Configuration

```typescript
// In your module
@Module({
  imports: [
    ScheduleModule.forRoot(), // Required for automated cleanup
  ],
  providers: [
    WebhookLoggerService,
    PrismaService,
  ],
})
export class WebhookModule {}
```

## Performance Considerations

### Database Optimization
- **Indexes**: Strategic indexes on frequently queried fields
- **Partitioning**: Consider table partitioning for high-volume deployments
- **Archival**: Automatic archival of old logs to reduce active table size

### Memory Usage
- **Streaming**: Large result sets use pagination to prevent memory issues
- **Connection Pooling**: Uses Prisma connection pooling for efficiency

### Monitoring
- **Health Checks**: Built-in health monitoring with configurable thresholds
- **Automated Cleanup**: Daily cleanup job to maintain performance
- **Metrics**: Comprehensive metrics for monitoring service health

## Security

### Data Protection
- **Multi-tenant Isolation**: Strict organization-based data isolation
- **Sensitive Data**: Option to exclude sensitive headers/payloads from logs
- **Access Control**: Works with your existing authentication/authorization

### Privacy Compliance
- **Data Retention**: Configurable retention policies
- **Right to Deletion**: Support for deleting user-specific webhook logs
- **Audit Trail**: Comprehensive audit trail for compliance requirements

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce pagination limits
   - Enable automatic archival
   - Check for slow queries

2. **Slow Query Performance**
   - Verify database indexes are created
   - Use appropriate date range filters
   - Consider database query optimization

3. **Missing Logs**
   - Check organization ID filtering
   - Verify webhook logging is enabled
   - Check service configuration

### Debugging Tips

```typescript
// Enable debug logging
const logger = new Logger('WebhookLogger');
logger.setLogLevels(['debug', 'error', 'log', 'warn']);

// Check webhook health
const health = await webhookLogger.monitorWebhookHealth('org-123');
console.log('Health status:', health);

// Troubleshoot specific event
const troubleshooting = await webhookLogger.troubleshootWebhookIssues(
  'org-123',
  'event-id-123'
);
```

## Migration

If migrating from an existing webhook logging system:

1. **Schema Migration**: Run Prisma migrations to create webhook_logs table
2. **Data Import**: Use bulk import for existing webhook data
3. **Index Creation**: Ensure all performance indexes are created
4. **Service Integration**: Update existing webhook handlers to use new service

```bash
# Run Prisma migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## License

This webhook logger service is part of the Integration Platform and follows the same licensing terms.