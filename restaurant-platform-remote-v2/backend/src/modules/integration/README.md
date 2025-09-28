# NEXARA Integration Module for Restaurant Platform

## Overview

This module provides comprehensive integration between the Restaurant Platform v2 and the NEXARA webhook system for delivery provider integration. It handles real-time order synchronization from major delivery platforms including Careem, Talabat, Deliveroo, and Jahez.

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   NEXARA Platform   │    │  Restaurant Platform │    │   Delivery Provider  │
│   (Port 3002)       │◄──►│   Integration Module │◄──►│   (Careem/Talabat)  │
│                     │    │   (Port 3001)        │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                           │                           │
         │                           │                           │
         └─────────────┬─────────────┴─────────────┬─────────────┘
                       │                           │
                ┌─────────────────┐         ┌─────────────────┐
                │   PostgreSQL    │         │   WebSocket     │
                │   Database      │         │   Real-time     │
                └─────────────────┘         └─────────────────┘
```

## Key Components

### 1. IntegrationService
- **Purpose**: Core communication with NEXARA platform
- **Functions**:
  - Register webhooks with NEXARA
  - Store and manage provider credentials
  - Health monitoring and connectivity checks
  - Order status synchronization

### 2. WebhookHandlerService
- **Purpose**: Process incoming webhook events from delivery providers
- **Functions**:
  - Validate webhook signatures
  - Route events by provider and event type
  - Map external orders to internal format
  - Emit real-time updates via WebSocket

### 3. OrderMappingService
- **Purpose**: Transform external order data to restaurant platform format
- **Functions**:
  - Provider-specific order mapping (Careem, Talabat, Deliveroo, Jahez)
  - Customer creation and matching
  - Menu product mapping and matching
  - Status translation between platforms

## API Endpoints

### Integration Management
- `POST /api/integration/register-webhook` - Register webhook with NEXARA
- `POST /api/integration/credentials/:provider` - Store provider credentials
- `GET /api/integration/status` - Get integration status
- `GET /api/integration/health` - Check NEXARA connectivity

### Webhook Processing
- `POST /api/integration/webhook` - Main webhook endpoint for NEXARA events
- `POST /api/integration/webhook/test` - Test webhook processing
- `POST /api/integration/webhook/{provider}` - Provider-specific endpoints

### Order Synchronization
- `POST /api/integration/sync-order/:orderId` - Sync order status to NEXARA

## Database Models

### New Tables Added:
1. **integration_webhooks** - Webhook registration data
2. **provider_credentials** - Encrypted API credentials
3. **webhook_logs** - Audit trail of webhook events
4. **customers** - Customer information from orders
5. **orders** - Enhanced order model with external provider data
6. **order_items** - Order items with modifier support
7. **order_item_modifiers** - Product modifications

## Supported Providers

### 1. Careem Now
- **Events**: order.created, order.updated, order.cancelled, order.delivered
- **Mapping**: Careem order structure → Restaurant platform orders
- **Status Sync**: Bidirectional status updates

### 2. Talabat
- **Events**: order_created, order_confirmed, order_cancelled, order_delivered
- **Mapping**: Talabat basket structure → Restaurant platform orders
- **Currency**: JOD (Jordan Dinar)

### 3. Deliveroo
- **Events**: order_created, order_acknowledged, order_cancelled, order_delivered
- **Mapping**: Deliveroo items structure → Restaurant platform orders
- **Features**: Customer address mapping, delivery tracking

### 4. Jahez
- **Events**: order_received, order_confirmed, order_cancelled, order_delivered
- **Mapping**: Jahez order structure → Restaurant platform orders
- **Currency**: SAR (Saudi Riyal)

## Multi-Tenant Isolation

### Company-Level Isolation
- All webhook events are filtered by `companyId`
- Provider credentials are company-specific
- Order data is automatically isolated by company
- Branch mapping ensures correct restaurant assignment

### Security Features
- Webhook signature validation
- Encrypted credential storage
- Rate limiting on webhook endpoints
- Audit logging for all integration events

## Real-Time Updates

### WebSocket Integration
- Order updates broadcast to company-specific rooms
- Real-time status synchronization
- Live webhook event notifications
- Dashboard updates for order management

### Event Types
- `order_created` - New order received from provider
- `order_updated` - Order status changed
- `order_cancelled` - Order cancelled by provider
- `order_delivered` - Order delivered successfully

## Configuration

### Environment Variables
```bash
# NEXARA Platform
NEXARA_BASE_URL=http://localhost:3002
NEXARA_TIMEOUT=30000
NEXARA_MAX_RETRIES=3

# Restaurant Platform
APP_BASE_URL=http://localhost:3001

# Provider Configuration
CAREEM_ENABLED=true
CAREEM_WEBHOOK_SECRET=your_careem_secret
TALABAT_ENABLED=true
TALABAT_WEBHOOK_SECRET=your_talabat_secret

# Security
WEBHOOK_VALIDATE_SIGNATURE=true
CREDENTIAL_ENCRYPTION_KEY=your_encryption_key

# Logging
LOG_WEBHOOKS=true
LOG_WEBHOOK_FAILURES=true
WEBHOOK_LOG_RETENTION_DAYS=30
```

## Usage Examples

### 1. Register Webhook Integration
```typescript
POST /api/integration/register-webhook
{
  "providers": ["careem", "talabat"],
  "credentials": {
    "careem": {
      "apiKey": "your_api_key",
      "webhookSecret": "webhook_secret"
    }
  }
}
```

### 2. Process Webhook Event
```typescript
// Automatic processing via webhook endpoint
POST /api/integration/webhook
{
  "eventType": "order.created",
  "provider": "careem",
  "orderId": "careem_order_123",
  "orderData": {
    "customer": { "name": "John Doe", "phone": "+962123456789" },
    "items": [{ "name": "Burger", "quantity": 2, "price": "15.00" }],
    "total_amount": "30.00"
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "companyId": "restaurant_company_uuid"
}
```

### 3. Real-Time Order Updates
```typescript
// WebSocket client receives:
{
  "orderId": "internal_order_uuid",
  "externalOrderId": "careem_order_123",
  "status": "confirmed",
  "provider": "careem",
  "eventType": "order_updated",
  "orderData": {
    "customerName": "John Doe",
    "total": 30.00,
    "items": 2
  }
}
```

## Error Handling

### Webhook Failures
- Failed webhooks are logged with error details
- Retry mechanism for transient failures
- Dead letter queue for persistent failures
- Error notifications to restaurant staff

### Provider Connectivity
- Health checks for NEXARA platform
- Provider-specific connectivity tests
- Fallback mechanisms for service outages
- Graceful degradation when providers are unavailable

## Monitoring and Analytics

### Webhook Logs
- All webhook events are logged for audit trail
- Performance metrics (processing time, success rate)
- Error analysis and trending
- Provider-specific analytics

### Integration Health
- Connection status monitoring
- Response time tracking
- Error rate monitoring
- Alert system for critical failures

## Testing

### Test Endpoints
- `POST /api/integration/webhook/test` - Test webhook processing
- Individual provider test endpoints
- Mock webhook payloads for development
- Integration test suite for all providers

### Development Features
- Webhook signature validation can be disabled for testing
- Detailed logging for debugging
- Test data generation utilities
- Provider sandbox environment support

## Deployment Considerations

### Production Setup
1. Configure proper environment variables
2. Set up SSL certificates for webhook endpoints
3. Configure rate limiting and security headers
4. Set up monitoring and alerting
5. Configure log retention and cleanup

### Database Migration
```bash
# Run Prisma migration to add integration tables
npx prisma migrate dev --name "add-nexara-integration"
npx prisma generate
```

### Service Dependencies
- PostgreSQL database (with integration tables)
- NEXARA platform (port 3002)
- Restaurant platform backend (port 3001)
- WebSocket server for real-time updates

## Support and Maintenance

### Logging
- Comprehensive webhook event logging
- Error tracking and analysis
- Performance monitoring
- Security audit trails

### Troubleshooting
- Webhook replay functionality
- Integration health diagnostics
- Provider connectivity testing
- Order mapping validation tools