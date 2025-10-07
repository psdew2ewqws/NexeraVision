# Integration API - Quick Reference

## Base URL
```
http://localhost:3001/api/integration/v1
```

## Authentication

### For API Key Management (JWT)
```bash
Authorization: Bearer <jwt_token>
```

### For Order Operations (API Key)
```bash
X-API-Key: rp_your_api_key_here
# OR
Authorization: Bearer rp_your_api_key_here
```

---

## Quick Start

### 1. Create API Key
```bash
curl -X POST http://localhost:3001/api/integration/v1/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Integration",
    "scopes": ["orders:read", "orders:write"],
    "rateLimit": 100
  }'
```

### 2. Register Webhook
```bash
curl -X POST http://localhost:3001/api/integration/v1/webhooks/register \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Order Events",
    "url": "https://your-domain.com/webhook",
    "events": ["order.created", "order.updated"]
  }'
```

### 3. Create Order
```bash
curl -X POST http://localhost:3001/api/integration/v1/orders \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "branch-123",
    "orderType": "delivery",
    "items": [{
      "productId": "product-456",
      "quantity": 2
    }],
    "customerName": "John Doe",
    "customerPhone": "+971501234567"
  }'
```

---

## All Endpoints

### API Keys (`/api-keys`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api-keys` | Create API key | JWT |
| GET | `/api-keys` | List API keys | JWT |
| GET | `/api-keys/:id` | Get API key | JWT |
| PUT | `/api-keys/:id` | Update API key | JWT |
| DELETE | `/api-keys/:id` | Revoke API key | JWT |
| GET | `/api-keys/:id/usage` | Get usage stats | JWT |

### Webhooks (`/webhooks`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/webhooks/register` | Register webhook | JWT |
| GET | `/webhooks` | List webhooks | JWT |
| GET | `/webhooks/:id` | Get webhook | JWT |
| PUT | `/webhooks/:id` | Update webhook | JWT |
| DELETE | `/webhooks/:id` | Delete webhook | JWT |
| POST | `/webhooks/:id/test` | Test webhook | JWT |
| GET | `/webhooks/:id/deliveries` | Get deliveries | JWT |

### Orders (`/orders`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/orders` | Create order | API Key |
| GET | `/orders/:id` | Get order | API Key |
| PUT | `/orders/:id/status` | Update status | API Key |
| GET | `/orders` | List orders | API Key |
| GET | `/orders/:id/events` | Get events | API Key |

### Logs (`/logs`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/logs/webhooks` | Webhook logs | JWT |
| GET | `/logs/requests` | Request logs | JWT |
| GET | `/logs/errors` | Error logs | JWT |

### Monitoring (`/monitoring`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/monitoring/health` | Health check | Public |
| GET | `/monitoring/metrics` | Get metrics | JWT |
| GET | `/monitoring/providers` | Provider status | JWT |
| GET | `/monitoring/rate-limits` | Rate limits | JWT |

---

## Common Parameters

### Pagination
```
?page=1&limit=20
```

### Filtering
```
?status=active
?source=uber_eats
?startDate=2025-09-01
?endDate=2025-09-30
```

### Order Statuses
```
confirmed
preparing
ready
out_for_delivery
delivered
cancelled
```

### Order Sources
```
uber_eats
deliveroo
careem
talabat
api
```

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Server Error |

---

## API Scopes

| Scope | Access |
|-------|--------|
| `orders:read` | Read orders |
| `orders:write` | Create/update orders |
| `webhooks:manage` | Full webhook access |
| `webhooks:read` | Read webhooks |
| `logs:read` | Read logs |
| `metrics:read` | Read metrics |

---

## Webhook Events

```
order.created
order.updated
order.status_changed
order.confirmed
order.preparing
order.ready
order.out_for_delivery
order.delivered
order.completed
order.cancelled
```

---

## Rate Limits

### Development
- General: 1000 req/15min
- Auth: 50 req/15min
- Integration: 100 req/min (per key)

### Production
- General: 100 req/15min
- Auth: 5 req/15min
- Integration: Configurable per key

---

## Documentation

- **Swagger UI**: http://localhost:3001/api/docs
- **Full Docs**: `/backend/src/domains/integration/README.md`
- **Complete Guide**: `/claudedocs/INTEGRATION_API_COMPLETE.md`

---

## Health Check

```bash
curl http://localhost:3001/api/integration/v1/monitoring/health

# Response:
{
  "status": "healthy",
  "timestamp": "2025-09-30T12:00:00Z",
  "services": {
    "webhooks": { "status": "healthy" },
    "apiKeys": { "status": "healthy" },
    "orders": { "status": "healthy" }
  }
}
```

---

## Common Workflows

### Workflow 1: Setup Integration
1. Create API key with `orders:write` scope
2. Register webhook for order events
3. Test webhook delivery
4. Start creating orders

### Workflow 2: Monitor Integration
1. Check health endpoint
2. View metrics dashboard
3. Check rate limit status
4. Review error logs

### Workflow 3: Troubleshoot Issues
1. Check error logs
2. Review webhook delivery logs
3. Verify API key scopes
4. Test webhook manually

---

## Support

- Swagger: `/api/docs`
- Health: `/monitoring/health`
- Logs: `/logs/errors`
