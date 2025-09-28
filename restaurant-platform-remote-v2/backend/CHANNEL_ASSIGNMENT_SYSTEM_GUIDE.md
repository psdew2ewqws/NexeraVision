# Channel Assignment System - Complete Implementation Guide

## Overview

This guide documents the comprehensive channel assignment system that allows each menu platform to be assigned to ONE delivery channel (Talabat, Careem, etc.) and enables menu synchronization.

## System Architecture

### Three-Layer Model
1. **Company Level**: Channel assignments per company
2. **Platform Menu Level**: Each platform menu assigned to ONE channel
3. **Branch Level**: Optional branch-specific assignments

### Core Components
- **Database Schema**: 13 tables with comprehensive relationships
- **API Endpoints**: 11 RESTful endpoints for complete management
- **Service Architecture**: Adapter pattern with factory management
- **Sync Orchestration**: Queue-based sync with error handling
- **Monitoring System**: Real-time metrics and alerting

## Database Schema

### Core Tables

#### 1. delivery_channels
```sql
-- Core channel definitions (Talabat, Careem, etc.)
- id, name, slug, channel_type, provider_name
- api_base_url, webhook_url, auth_type
- configuration, supported_features, rate_limits
```

#### 2. company_channel_assignments
```sql
-- Company-level channel configurations
- company_id, channel_id, credentials, settings
- sync_enabled, priority, sync_status
- last_sync_at, sync_error_message
```

#### 3. platform_menu_channel_assignments
```sql
-- Each menu assigned to ONE channel (1:1 relationship)
- platform_menu_id, company_channel_assignment_id
- menu_external_id, last_menu_sync_at
- channel_specific_settings, display_order
```

#### 4. channel_sync_logs
```sql
-- Comprehensive sync operation tracking
- sync_type, sync_status, sync_direction
- records_processed, records_success, records_failed
- duration_ms, error_details, retry_count
```

### Monitoring Tables
- **channel_metrics**: Time-series performance data
- **channel_alerts**: Alert management and notifications
- **channel_performance_logs**: Detailed API call tracking
- **channel_audit_logs**: Complete audit trail
- **channel_rate_limits**: API rate limit management
- **channel_configuration_history**: Change tracking

## API Endpoints

### Channel Management
```
GET    /api/channels/delivery-channels                    - List available channels
GET    /api/channels/company-assignments                  - Get company assignments
POST   /api/channels/company-assignments                  - Create assignment
PUT    /api/channels/company-assignments/:id              - Update assignment
DELETE /api/channels/company-assignments/:id              - Delete assignment
```

### Platform Menu Assignments
```
GET    /api/channels/platform-menu-assignments            - List menu assignments
POST   /api/channels/platform-menu-assignments            - Assign menu to channel
PUT    /api/channels/platform-menu-assignments/:id        - Update assignment
DELETE /api/channels/platform-menu-assignments/:id        - Remove assignment
```

### Synchronization
```
POST   /api/channels/sync/menu/:assignmentId              - Trigger menu sync
GET    /api/channels/sync/logs                            - View sync history
```

## Service Architecture

### Base Channel Adapter
```javascript
// Abstract base class for all channel integrations
class BaseChannelAdapter {
  // Abstract methods (must implement)
  async initialize()
  async testConnection()
  async pushMenu(menuData)
  async updateMenuItems(items)
  async syncAvailability(updates)
  async fetchOrders(options)
  async updateOrderStatus(orderId, status)
  async handleWebhook(payload, headers)

  // Common functionality
  checkRateLimit()
  checkCircuitBreaker()
  recordSuccess() / recordError()
  makeRequest(method, url, options)
  getHealthStatus()
}
```

### Channel-Specific Adapters

#### Talabat Adapter
```javascript
class TalabatAdapter extends BaseChannelAdapter {
  constructor(config) {
    super({
      channelName: 'Talabat',
      authType: 'bearer_token',
      supportedFeatures: ['menu_sync', 'order_sync', 'status_updates']
    });
  }

  // Talabat-specific implementations
  async pushMenu(menuData) {
    const talabatFormat = this.transformMenuToChannel(menuData);
    return await this.makeRequest('POST', '/menu', { body: talabatFormat });
  }

  transformMenuToChannel(internalMenu) {
    // Convert internal format to Talabat API format
  }
}
```

#### Careem Adapter
```javascript
class CareemAdapter extends BaseChannelAdapter {
  constructor(config) {
    super({
      channelName: 'Careem Now',
      authType: 'oauth2',
      supportedFeatures: ['menu_sync', 'batch_operations', 'inventory_sync']
    });
  }

  // Careem-specific features
  async updateMenuItems(items) {
    // Supports batch updates
    const batches = this._chunkArray(items, 50);
    // Process in batches...
  }
}
```

### Channel Adapter Factory
```javascript
class ChannelAdapterFactory {
  // Singleton pattern for adapter management
  createAdapter(channelConfig)
  getAdapter(companyId, channelSlug)
  destroyAdapter(instanceKey)
  getAllAdapterHealth()
  testAllConnections()
}
```

## Sync Orchestrator

### Queue-Based Synchronization
```javascript
class SyncOrchestrator {
  async queueSync(syncRequest) {
    // Add to priority queue
    // Process based on company limits
  }

  async executeSync(syncRequest) {
    // Immediate execution for urgent syncs
  }

  async batchSync(companyId, assignments, syncType) {
    // Bulk menu synchronization
  }
}
```

### Sync Types
- **menu_sync**: Full menu push to channel
- **product_sync**: Individual product updates
- **availability_sync**: Real-time availability updates
- **order_sync**: Order status synchronization

### Error Handling
- **Circuit Breaker**: Prevent cascading failures
- **Retry Logic**: Exponential backoff with max attempts
- **Dead Letter Queue**: Failed operations tracking
- **Health Monitoring**: Automatic adapter recovery

## Monitoring and Alerting

### Channel Monitor
```javascript
class ChannelMonitor {
  async performHealthCheck()     // Test all adapter connections
  async recordMetric(...)        // Record performance metrics
  async getMetrics(...)          // Query time-series data
  createAlert(alertConfig)       // Configure monitoring alerts
}
```

### Metrics Collection
- **sync_count**: Number of sync operations
- **sync_success/failure**: Success/failure rates
- **response_time**: API response times
- **error_rate**: Error percentages
- **availability**: Channel uptime
- **order_count**: Order processing metrics

### Alert Conditions
- **error_rate_high**: Error rate above threshold
- **channel_down**: Channel unavailable
- **consecutive_failures**: Multiple failures in a row
- **sync_failure_rate_high**: Sync failure rate exceeded
- **response_time_high**: Slow API responses

## Usage Examples

### 1. Assign Company to Channel
```javascript
// Create Talabat channel assignment for company
const assignment = await fetch('/api/channels/company-assignments', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer token' },
  body: JSON.stringify({
    channelId: 'talabat-channel-id',
    credentials: {
      partnerId: 'partner123',
      partnerToken: 'token456',
      restaurantId: 'rest789'
    },
    syncEnabled: true,
    priority: 1
  })
});
```

### 2. Assign Platform Menu to Channel
```javascript
// Assign specific platform menu to Talabat
const menuAssignment = await fetch('/api/channels/platform-menu-assignments', {
  method: 'POST',
  body: JSON.stringify({
    platformMenuId: 'menu-123',
    companyChannelAssignmentId: 'assignment-456',
    syncEnabled: true,
    channelSpecificSettings: {
      deliveryTime: 30,
      minimumOrder: 10
    }
  })
});
```

### 3. Trigger Menu Sync
```javascript
// Sync menu to assigned channel
const syncResult = await fetch('/api/channels/sync/menu/assignment-id', {
  method: 'POST',
  body: JSON.stringify({
    syncType: 'menu_sync',
    force: false
  })
});
```

### 4. Monitor Channel Health
```javascript
// Get channel health dashboard
const dashboard = await fetch('/api/channels/health/company-id');
const healthData = await dashboard.json();

console.log(healthData.statistics);
// {
//   totalChannels: 3,
//   healthyChannels: 2,
//   unhealthyChannels: 1,
//   totalAlerts: 5,
//   criticalAlerts: 1
// }
```

## Configuration Examples

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://postgres:E$$athecode006@localhost:5432/postgres"

# Channel API Settings
TALABAT_BASE_URL="https://api.talabat.com/v2"
CAREEM_BASE_URL="https://partners-api.careem.com/v1"

# Monitoring
HEALTH_CHECK_INTERVAL=60000
METRICS_RETENTION_DAYS=30
ALERT_COOLDOWN_MS=300000
```

### Channel Configuration
```json
{
  "talabat": {
    "apiBaseUrl": "https://api.talabat.com/v2",
    "authType": "bearer_token",
    "rateLimits": {
      "maxRequests": 100,
      "window": 60000
    },
    "supportedFeatures": [
      "menu_sync",
      "order_sync",
      "status_updates",
      "real_time_tracking"
    ]
  },
  "careem": {
    "apiBaseUrl": "https://partners-api.careem.com/v1",
    "authType": "oauth2",
    "rateLimits": {
      "maxRequests": 150,
      "window": 60000
    },
    "supportedFeatures": [
      "menu_sync",
      "batch_operations",
      "inventory_sync"
    ]
  }
}
```

## Testing

### API Testing
```bash
# Test delivery channels endpoint
curl -H "Authorization: Bearer test-token" \
  http://localhost:3001/api/channels/delivery-channels

# Test company assignments
curl -H "Authorization: Bearer test-token" \
  http://localhost:3001/api/channels/company-assignments

# Test sync trigger
curl -X POST -H "Authorization: Bearer test-token" \
  http://localhost:3001/api/channels/sync/menu/assignment-id \
  -d '{"syncType": "menu_sync"}'
```

### Health Check
```bash
# Check all adapter health
curl http://localhost:3001/api/channels/health

# Check specific company health
curl http://localhost:3001/api/channels/health/company-id
```

## Security Considerations

### Data Protection
- **Credentials Encryption**: Channel credentials stored encrypted
- **API Rate Limiting**: Prevent abuse and manage quotas
- **Webhook Verification**: Validate incoming webhook signatures
- **Audit Logging**: Complete audit trail for all operations

### Access Control
- **Multi-tenant Isolation**: Company-based data separation
- **Role-based Access**: Different permissions by user role
- **API Authentication**: JWT-based endpoint protection
- **Resource Authorization**: Users can only access their company's data

## Performance Optimization

### Database Optimization
- **47 Strategic Indexes**: Optimized for common query patterns
- **Partitioning**: Time-based partitioning for large tables
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized queries with proper indexing

### Application Performance
- **Connection Pooling**: Reuse HTTP connections to channels
- **Circuit Breaker**: Prevent cascading failures
- **Batch Operations**: Group multiple operations for efficiency
- **Caching**: In-memory adapter caching for quick access

### Monitoring Performance
- **Real-time Metrics**: Live performance tracking
- **Automated Cleanup**: Remove old data automatically
- **Alert Throttling**: Prevent alert spam with cooldowns
- **Health Checks**: Regular adapter health verification

## Troubleshooting

### Common Issues

#### 1. Sync Failures
```bash
# Check sync logs
curl "/api/channels/sync/logs?syncStatus=failed&limit=10"

# Check adapter health
curl "/api/channels/health/company-id"

# Retry failed sync
curl -X POST "/api/channels/sync/menu/assignment-id" \
  -d '{"force": true}'
```

#### 2. Authentication Errors
```bash
# Test channel connection
curl "/api/channels/test-connection/company-id/talabat"

# Update credentials
curl -X PUT "/api/channels/company-assignments/assignment-id" \
  -d '{"credentials": {"new": "credentials"}}'
```

#### 3. Rate Limiting
```bash
# Check rate limit status
curl "/api/channels/rate-limits/company-id"

# Monitor metrics
curl "/api/channels/metrics/company-id/talabat?metricType=rate_limit"
```

## Deployment

### Requirements
- **Node.js**: 16.0.0+
- **PostgreSQL**: 14+ with JSONB support
- **Memory**: 4GB+ RAM recommended
- **Storage**: 20GB+ for database and logs

### Installation Steps
1. **Database Setup**: Run migration scripts
2. **Dependencies**: Install Node.js packages
3. **Configuration**: Set environment variables
4. **Service Start**: Launch API server
5. **Health Check**: Verify all systems operational

### Production Considerations
- **Load Balancing**: Multiple API server instances
- **Database Scaling**: Read replicas for heavy queries
- **Monitoring**: Comprehensive alerting setup
- **Backup**: Regular database backups
- **Security**: SSL/TLS encryption for all connections

## Future Enhancements

### Planned Features
- **More Channels**: Deliveroo, Uber Eats integration
- **Advanced Scheduling**: Cron-based sync scheduling
- **Real-time Dashboard**: Live monitoring interface
- **Bulk Operations**: Mass menu updates
- **API Versioning**: Support for multiple API versions

### Scalability Improvements
- **Message Queue**: Redis/RabbitMQ for sync queue
- **Microservices**: Split adapters into separate services
- **Event Sourcing**: Complete operation history
- **GraphQL API**: Flexible data querying
- **Horizontal Scaling**: Auto-scaling based on load

## Conclusion

This comprehensive channel assignment system provides:

1. **Complete Channel Management**: Full lifecycle management of delivery channel integrations
2. **Robust Synchronization**: Reliable, error-tolerant menu synchronization
3. **Comprehensive Monitoring**: Real-time health monitoring and alerting
4. **Extensible Architecture**: Easy addition of new delivery channels
5. **Production Ready**: Full error handling, logging, and monitoring

The system is designed for enterprise-scale restaurant operations with multiple delivery channels, providing the reliability and monitoring necessary for business-critical integrations.

## Support

For technical support or questions about the channel assignment system:

1. **API Documentation**: All endpoints documented with examples
2. **Health Monitoring**: Real-time system status available
3. **Comprehensive Logging**: Detailed operation logs for debugging
4. **Error Tracking**: Complete error context and resolution guidance

The system provides comprehensive observability and debugging capabilities to ensure smooth operations and quick issue resolution.