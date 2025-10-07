# Integration Service - Restaurant Platform v2

## Overview

The Integration Service is a production-grade standalone microservice designed to handle webhook-based order reception from multiple delivery providers (Careem, Talabat, Deliveroo, UberEats, etc.). It acts as a secure middleware hub between external delivery platforms and the main Restaurant Platform backend.

### Key Features

-  **Secure Webhook Reception**: HMAC-SHA256 signature validation with timing-safe comparison
-  **Provider Adapter Pattern**: Polymorphic data mapping for multiple providers
-  **Circuit Breaker Pattern**: Prevents cascading failures when backend is down
-  **Exponential Backoff Retry**: Intelligent retry mechanism with dead letter queue
-  **Rate Limiting**: Per-provider rate limiting to prevent abuse
-  **Comprehensive Logging**: Audit trail for all webhook operations
-  **Docker Ready**: Full containerization with health checks
-  **Production Security**: Input sanitization, IP whitelisting, secure secrets management

## Architecture

```
External Providers ’ Webhook Endpoints ’ Signature Validation ’ Provider Adapters
                                            “
                                    Order Transformation
                                            “
                                    Backend Communication (Circuit Breaker)
                                            “
                                    Main Backend (Port 3001)
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Main backend running on port 3001

### Installation

```bash
# Clone and navigate to service directory
cd /home/admin/restaurant-platform-remote-v2/integration-service

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Development

```bash
# Run in development mode with hot reload
npm run start:dev

# Service will be available at http://localhost:3002
```

### Production

```bash
# Build the application
npm run build

# Run in production mode
npm run start:prod
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker logs integration-service -f

# Health check
curl http://localhost:3002/api/webhooks/health
```

## API Documentation

### Webhook Endpoints

#### Receive Provider Webhook
```http
POST /api/webhooks/:provider
```

**Supported Providers**: `careem`, `talabat`, `deliveroo`, `ubereats`

**Headers Required**:
- `Content-Type: application/json`
- Provider-specific signature header (e.g., `x-careem-signature`, `x-talabat-signature`)

**Example Request**:
```bash
curl -X POST http://localhost:3002/api/webhooks/careem \
  -H "Content-Type: application/json" \
  -H "x-careem-signature: <hmac-signature>" \
  -d '{
    "order_id": "CAR123456",
    "customer": {
      "name": "John Doe",
      "phone": "0791234567",
      "delivery_address": {
        "address_line_1": "123 Main St",
        "city": "Amman"
      }
    },
    "items": [
      {
        "name": "Burger",
        "quantity": 2,
        "price": 5.99
      }
    ],
    "total_amount": 11.98
  }'
```

**Response**:
```json
{
  "success": true,
  "orderId": "ORD-123456",
  "message": "Webhook processed successfully"
}
```

### Health Check

```http
POST /api/webhooks/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-01T12:00:00.000Z",
  "service": "integration-service"
}
```

## Security Features

### 1. Signature Validation (Fixed from Picolinate vulnerabilities)

```typescript
// Timing-safe comparison prevents timing attacks
validateSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Timing-safe comparison
  const bufferSignature = Buffer.from(signature);
  const bufferExpected = Buffer.from(expectedSignature);

  return bufferSignature.length === bufferExpected.length &&
         timingSafeEqual(bufferSignature, bufferExpected);
}
```

### 2. Rate Limiting

- **Default**: 100 requests per minute per provider
- **Configurable** via `WEBHOOK_RATE_LIMIT` and `WEBHOOK_RATE_WINDOW_MS`

### 3. IP Whitelisting

Configure allowed IPs per provider in environment variables:
```env
CAREEM_IP_WHITELIST=203.0.113.0,203.0.113.1
TALABAT_IP_WHITELIST=198.51.100.0,198.51.100.1
```

### 4. Input Sanitization

All incoming data is sanitized using DOMPurify to prevent XSS attacks:
```typescript
const sanitizedPayload = DOMPurify.sanitize(payload);
```

## Provider Configuration

### Careem Integration

```env
CAREEM_WEBHOOK_SECRET=your-careem-webhook-secret-here
```

**Webhook Format**: Careem NOW format with HMAC-SHA256 hex encoding

### Talabat Integration

```env
TALABAT_WEBHOOK_SECRET=your-talabat-webhook-secret-here
```

**Webhook Format**: Talabat format with HMAC-SHA256 base64 encoding

## Circuit Breaker Configuration

The circuit breaker prevents cascading failures when the main backend is unavailable:

```env
CIRCUIT_BREAKER_TIMEOUT=5000           # Request timeout (ms)
CIRCUIT_BREAKER_ERROR_THRESHOLD=50     # Error threshold percentage
CIRCUIT_BREAKER_RESET_TIMEOUT=30000    # Reset timeout (ms)
```

**States**:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Backend unavailable, requests fail fast
- **HALF_OPEN**: Testing recovery with limited requests

## Retry Mechanism

Failed orders are retried with exponential backoff:

```env
RETRY_MAX_ATTEMPTS=10        # Maximum retry attempts
RETRY_INITIAL_DELAY=60000    # Initial delay (1 minute)
RETRY_MAX_DELAY=86400000     # Maximum delay (24 hours)
```

**Backoff Formula**: `delay = min(initialDelay * (2 ^ attemptNumber), maxDelay)`

**Dead Letter Queue**: After 10 failed attempts, orders move to dead letter queue for manual review

## Database Schema

The service uses the existing Restaurant Platform database with these key tables:

- `webhook_logs`: All incoming webhook requests
- `provider_order_logs`: Provider-specific order tracking
- `delivery_error_logs`: Error tracking and retry queue
- `branch_delivery_configs`: Branch-provider mapping

## Monitoring & Logging

### Logging Levels

```typescript
logger: ['error', 'warn', 'log', 'debug', 'verbose']
```

### Log Format

```
[IntegrationService] 2025-10-01 12:00:00 [LOG] Received webhook from provider: careem
[IntegrationService] 2025-10-01 12:00:01 [LOG] Order ORD-123456 successfully processed
```

### Metrics Available

- Webhook reception rate
- Processing success/failure rate
- Circuit breaker state
- Retry queue size
- Dead letter queue size

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:e2e
```

### Test Webhook

```bash
# Test Careem webhook
curl -X POST http://localhost:3002/api/webhooks/careem \
  -H "Content-Type: application/json" \
  -H "x-careem-signature: $(echo -n '{"order_id":"TEST123"}' | openssl dgst -sha256 -hmac 'careem-webhook-secret-change-in-production' | cut -d' ' -f2)" \
  -d '{
    "order_id": "TEST123",
    "customer": {
      "name": "Test Customer",
      "phone": "0791234567"
    },
    "items": [{
      "name": "Test Item",
      "quantity": 1,
      "price": 10.00
    }],
    "total_amount": 10.00
  }'
```

## Troubleshooting

### Common Issues

1. **Signature Validation Fails**
   - Check webhook secret configuration
   - Verify signature header name matches provider
   - Ensure payload is raw JSON string

2. **Circuit Breaker Open**
   - Check main backend health: `curl http://localhost:3001/health`
   - Review circuit breaker stats in logs
   - Manual reset if needed (not recommended in production)

3. **Orders in Dead Letter Queue**
   - Check `delivery_error_logs` table
   - Review error messages for root cause
   - Manually retry if issue resolved

### Debug Mode

Enable debug logging:
```env
NODE_ENV=development
```

## Production Checklist

- [ ] Update webhook secrets from default values
- [ ] Configure IP whitelisting for providers
- [ ] Set appropriate rate limits
- [ ] Configure monitoring/alerting
- [ ] Test circuit breaker behavior
- [ ] Verify retry mechanism
- [ ] Load test webhook endpoints
- [ ] Set up log aggregation
- [ ] Configure SSL/TLS for production
- [ ] Set up database backups

## Architecture Decisions

1. **Standalone Service**: Separate deployment lifecycle, independent scaling
2. **Shared Database**: Uses main platform database for consistency
3. **Provider Adapters**: Polymorphic pattern for easy provider addition
4. **Circuit Breaker**: Prevents cascade failures, fail-fast behavior
5. **Exponential Backoff**: Reduces load during outages
6. **Timing-Safe Comparison**: Prevents timing attacks on signature validation

## Contributing

### Adding New Provider

1. Create adapter in `src/modules/adapters/providers/`
2. Implement `IProviderAdapter` interface
3. Register in `AdapterFactory`
4. Add configuration in `providers.config.ts`
5. Update signature validation for provider-specific format
6. Add tests for new adapter

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## License

MIT

## Support

For issues or questions, please contact the Restaurant Platform team.

---

**Service Status**:  Production Ready
**Version**: 1.0.0
**Last Updated**: October 1, 2025