# NEXARA Integration Platform Service

## Overview

Complete NEXARA-compatible service running on port 3002 that serves as an integration bridge between delivery platforms and the restaurant management system.

## Features

✅ **Port 3002** - CRITICAL requirement met (restaurant expects NEXARA here)
✅ **Webhook Registration** - POST /api/webhooks/register
✅ **Event Forwarding** - POST /api/webhooks/event → forwards to localhost:3001
✅ **Health Check** - GET /api/health with comprehensive system status
✅ **WebSocket Support** - Real-time updates via Socket.IO
✅ **Request Forwarding** - Automatic forwarding to restaurant platform
✅ **Error Handling** - Comprehensive logging and error management
✅ **Express/Node.js** - Clean, maintainable server structure

## Quick Start

```bash
cd /home/admin/integration-platform
npm start
```

The service will start on **http://localhost:3002**

## API Endpoints

### Core NEXARA Endpoints

#### POST /api/webhooks/register
Restaurant platform registers webhook endpoints here.

**Request:**
```json
{
  "clientId": "restaurant-123",
  "provider": "careem",
  "url": "http://localhost:3001/api/webhooks/careem",
  "events": ["order.created", "order.updated", "order.cancelled"]
}
```

**Response:**
```json
{
  "webhookId": "webhook-1759008028685",
  "url": "http://localhost:3002/api/webhooks/careem/restaurant-123",
  "secretKey": "c2VjcmV0LTE3NTkwMDgwMjg2ODU=",
  "status": "active",
  "timestamp": "2025-09-27T21:20:28.685Z"
}
```

#### POST /api/webhooks/event
Receives delivery platform events and forwards them to restaurant platform.

**Request:**
```json
{
  "eventType": "order.created",
  "provider": "careem",
  "orderId": "ORDER-123",
  "data": {
    "restaurantId": "rest-456",
    "status": "confirmed"
  }
}
```

**Response:**
```json
{
  "status": "received",
  "forwarded": true,
  "timestamp": "2025-09-27T21:20:32.951Z",
  "eventId": "ORDER-123"
}
```

**Forwarding:** Events are automatically forwarded to:
`http://localhost:3001/api/integration/webhook`

#### GET /api/health
Comprehensive health check with dependency status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-27T21:20:19.440Z",
  "version": "1.0.0",
  "service": "NEXARA Integration Platform",
  "port": 3002,
  "uptime": 6.447479065,
  "responseTime": 47,
  "dependencies": {
    "restaurantPlatform": {
      "status": "healthy",
      "url": "http://localhost:3001",
      "responseTime": "12ms",
      "lastChecked": "2025-09-27T21:20:19.440Z"
    }
  },
  "endpoints": {
    "/api/webhooks/register": "active",
    "/api/webhooks/event": "active",
    "/api/health": "active"
  },
  "websocket": {
    "namespace": "/events",
    "status": "active",
    "connectedClients": 2
  },
  "system": {
    "memory": {...},
    "nodejs": "v18.19.1",
    "platform": "linux",
    "arch": "x64"
  }
}
```

### Additional Provider Endpoints

#### POST /api/webhooks/{provider}/{clientId}
Provider-specific webhook endpoints for testing and direct integration.

Examples:
- `POST /api/webhooks/careem/restaurant-123`
- `POST /api/webhooks/talabat/restaurant-456`
- `POST /api/webhooks/deliveroo/restaurant-789`

## WebSocket Real-Time Updates

Connect to WebSocket namespace `/events` for real-time updates:

```javascript
const socket = io('http://localhost:3002/events');

// Connection established
socket.on('connection-established', (data) => {
  console.log('Connected:', data.clientId);
});

// Webhook notifications
socket.on('webhook-notification', (data) => {
  console.log('Webhook received:', data.type, data.data);
});

// Delivery event broadcasts
socket.on('delivery-event', (data) => {
  console.log('Event:', data.eventType, data.data);
});
```

## Request Forwarding

All events received on `/api/webhooks/event` are automatically forwarded to:
**http://localhost:3001/api/integration/webhook**

### Forwarding Headers:
- `Content-Type: application/json`
- `X-Forwarded-From: NEXARA-Integration-Platform`
- `X-Original-Provider: {provider}`
- `X-Event-Type: {eventType}`
- Original `Authorization` and `X-API-Key` headers (if present)

## Error Handling & Logging

### Comprehensive Logging
- ✅ All requests logged with timestamps
- ✅ Webhook events tracked and broadcasted
- ✅ Forwarding attempts logged with success/failure status
- ✅ WebSocket connections monitored
- ✅ Health check results tracked

### Error Responses
```json
{
  "status": "error",
  "message": "Connection timeout",
  "timestamp": "2025-09-27T21:20:32.951Z"
}
```

### WebSocket Error Broadcasting
Errors are automatically broadcasted to connected WebSocket clients for real-time monitoring.

## Configuration

### Environment Variables
- `PORT` - Server port (default: 3002)
- `RESTAURANT_PLATFORM_URL` - Target URL for forwarding (default: http://localhost:3001)

### CORS Configuration
Configured for restaurant platform integration:
- Origins: `http://localhost:3001`, `http://localhost:3000`
- Methods: GET, POST, PUT, DELETE, PATCH
- Headers: Content-Type, Authorization, X-API-Key
- Credentials: enabled

## Service Scripts

```bash
# Start service (default)
npm start

# Start with NestJS (if available)
npm run start:nest

# Start NEXARA service specifically
npm run start:nexara
```

## Dependencies

Core dependencies automatically installed:
- `express` - Web server framework
- `socket.io` - WebSocket support
- `axios` - HTTP client for forwarding
- `helmet` - Security middleware
- `cors` - Cross-origin resource sharing

## Testing

### Health Check
```bash
curl http://localhost:3002/api/health
```

### Webhook Registration
```bash
curl -X POST http://localhost:3002/api/webhooks/register \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-restaurant",
    "provider": "careem",
    "url": "http://localhost:3001/api/webhooks/careem",
    "events": ["order.created", "order.updated"]
  }'
```

### Event Forwarding
```bash
curl -X POST http://localhost:3002/api/webhooks/event \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "order.created",
    "provider": "careem",
    "orderId": "ORDER-123",
    "data": {"restaurantId": "rest-456", "status": "confirmed"}
  }'
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Delivery        │───▶│ NEXARA Service   │───▶│ Restaurant      │
│ Platform        │    │ (Port 3002)      │    │ Platform        │
│                 │    │                  │    │ (Port 3001)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ WebSocket        │
                       │ Clients          │
                       │ (Real-time)      │
                       └──────────────────┘
```

## Integration Requirements Met

✅ **Port 3002** - Service runs on correct port
✅ **Webhook Registration** - POST /api/webhooks/register endpoint
✅ **Event Forwarding** - POST /api/webhooks/event with forwarding
✅ **Health Check** - GET /api/health endpoint
✅ **WebSocket Support** - Socket.IO real-time updates
✅ **Request Forwarding** - Automatic forwarding to localhost:3001
✅ **Error Handling** - Comprehensive logging and error management
✅ **Express Structure** - Clean, maintainable server architecture

The service is **immediately runnable** with `npm start` and ready for production use.