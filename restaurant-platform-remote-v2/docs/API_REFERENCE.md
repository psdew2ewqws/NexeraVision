# PrinterMaster WebSocket API Reference

**Document Version**: 1.0
**Last Updated**: October 7, 2025
**API Version**: 2.0

---

## Table of Contents

1. [WebSocket Events](#websocket-events)
2. [REST API Endpoints](#rest-api-endpoints)
3. [Request/Response Schemas](#requestresponse-schemas)
4. [Error Codes](#error-codes)
5. [Authentication](#authentication)
6. [Examples](#examples)

---

## WebSocket Events

### Connection Namespace

**Namespace**: `/printing-ws`
**URL**: `ws://31.57.166.18:3001/printing-ws`

### Client → Server Events

#### 1. `printer:discovered`

Auto-discovered printer notification from Desktop App to Backend.

**Payload**:
```typescript
{
  id: string;                    // Unique printer ID
  name: string;                  // Printer display name
  type: string;                  // "thermal" | "label" | "inkjet"
  connection: string;            // "network" | "usb" | "bluetooth"
  status: string;                // "online" | "offline" | "error"
  branchId: string;              // Branch UUID
  discoveredBy: string;          // Device ID that discovered it
  discoveryMethod: string;       // "auto" | "usb" | "manual" | "system"
  timestamp: string;             // ISO 8601 timestamp
  device?: string;               // Device path (USB only)
  systemPrinter?: boolean;       // Is OS-level printer
  capabilities?: string[];       // ["receipt", "cut", "barcode"]
}
```

**Response**:
```typescript
// Server emits back to sender
Event: 'printer:discovery:acknowledged'
{
  printerId: string;
  status: 'saved';
  timestamp: string;
}
```

---

#### 2. `desktop:status`

Desktop App status update.

**Payload**:
```typescript
{
  status: string;                // "connected" | "disconnected" | "ready"
  timestamp: string;
  version: string;               // App version (e.g., "2.0.0")
}
```

**Response**:
```typescript
Event: 'desktop:status:acknowledged'
{
  status: 'received';
  timestamp: string;
}
```

---

#### 3. `desktop:health:report`

Periodic health metrics from Desktop App (every 5 minutes).

**Payload**:
```typescript
{
  uptime: number;                // Seconds since connection start
  reconnectionCount: number;     // Total reconnections
  averageLatency: number;        // Average ping-pong latency (ms)
  packetLossRate: number;        // Percentage (0-100)
  totalPings: number;            // Total ping attempts
  successfulPongs: number;       // Successful pong responses
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lastPongTime: string;          // ISO 8601 timestamp
  connectionStartTime: string;   // ISO 8601 timestamp
  branchId: string;
  deviceId: string;
  appVersion: string;
  timestamp: string;
}
```

**Response**:
```typescript
Event: 'desktop:health:acknowledged'
{
  received: boolean;
  timestamp: string;
}
```

---

#### 4. `desktop:health:degraded`

Connection degradation alert from Desktop App.

**Payload**:
```typescript
{
  reason: string;                // "pong_timeout" | "high_latency"
  lastPongTime: string;
  timestamp: string;
}
```

---

#### 5. `printer:test:result`

Test print result from Desktop App (response to `printer:test`).

**Payload**:
```typescript
{
  printerId: string;
  correlationId?: string;        // Match to original request
  success: boolean;
  error?: string;                // Error message if failed
  message?: string;              // Status message
  timestamp: string;
  processingTime?: number;       // Milliseconds
}
```

---

#### 6. `printer:status:update`

Batch printer status update from Desktop App.

**Payload**:
```typescript
{
  printerIds: Array<{
    id: string;
    name: string;
    status: string;              // "online" | "offline" | "busy"
    lastSeen: string;
    capabilities?: string[];
  }>;
  branchId: string;
  timestamp: string;
}
```

**Response**:
```typescript
Event: 'printer:status:acknowledged'
{
  printerCount: number;
  branchId: string;
  timestamp: string;
}
```

---

#### 7. `join:branch`

Join a branch-specific room for targeted broadcasts.

**Payload**:
```typescript
{
  branchId: string;
}
```

**Response**:
```typescript
Event: 'branch:joined'
{
  branchId: string;
  timestamp: string;
}
```

---

### Server → Client Events

#### 1. `printer:test`

Request Desktop App to execute test print.

**Payload**:
```typescript
{
  printerName: string;           // Target printer name
  correlationId: string;         // Correlation ID for response matching
  requestTimestamp: string;
  branchId: string;
  metadata: {
    requestSource: 'backend_gateway';
    expectedResponseEvent: 'printer:test:result';
    timeout: number;             // Milliseconds
  };
}
```

**Expected Response**: `printer:test:result` with matching correlationId

---

#### 2. `print:job`

Send print job to Desktop App.

**Payload**:
```typescript
{
  id: string;                    // Job ID
  printerId: string;
  content: string;               // ESC/POS formatted content
  type: 'receipt' | 'kitchen' | 'label';
  priority?: number;             // 1-10 (higher = more urgent)
  orderData?: any;               // Original order data
  timestamp: string;
}
```

**Expected Response**: `print:job:completed` or `print:job:failed`

---

#### 3. `printer:status:request`

Request current status of printers from Desktop App.

**Payload**:
```typescript
{
  action: 'status_update';
  printerIds?: string[];         // Specific printers or all if empty
  timestamp: string;
  branchId: string;
}
```

**Expected Response**: `printer:status:update`

---

#### 4. `printer:heartbeat`

Keep-alive heartbeat for printers.

**Payload**:
```typescript
{
  action: 'heartbeat';
  printerIds: string[];
  timestamp: string;
  branchId: string;
}
```

---

#### 5. `printerUpdate`

Broadcast printer state change to all clients.

**Payload**:
```typescript
{
  action: 'discovered' | 'updated' | 'status_updated';
  printer: {
    id: string;
    name: string;
    type: string;
    connection: string;
    status: string;
    // ... full printer object
  };
  branchId: string;
  companyId: string;
  timestamp: string;
}
```

---

#### 6. `printerStatusUpdate`

Batched printer status updates (broadcast).

**Payload**:
```typescript
Array<{
  printerId: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  paperLevel: number;            // 0-100
  temperature: number;           // Celsius
  lastSeen: Date;
  queueLength: number;
  totalJobs: number;
  completedJobs: number;
  errorJobs: number;
  averageJobTime: number;
  connectionType: 'network' | 'usb' | 'bluetooth';
  firmwareVersion?: string;
  model?: string;
  manufacturer?: string;
  capabilities: string[];
}>
```

---

#### 7. `desktop:health:alert`

Health monitoring alert broadcast to admin clients.

**Payload**:
```typescript
{
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'poor_connection_quality' | 'high_latency' | 'connection_degraded';
  deviceId?: string;
  branchId?: string;
  clientId?: string;
  reason?: string;
  metrics?: {
    connectionQuality?: string;
    averageLatency?: number;
    packetLossRate?: number;
  };
  lastPongTime?: string;
  timestamp: Date;
}
```

---

#### 8. `printer:test:completed`

Test print completion broadcast (includes correlation ID).

**Payload**:
```typescript
{
  printerId: string;
  correlationId: string;
  success: boolean;
  error?: string;
  message?: string;
  timestamp: string;
  processingTime?: number;
  receivedAt: string;
  sourceClient: string;          // Socket ID of Desktop App
}
```

---

## REST API Endpoints

### Base URL
`http://31.57.166.18:3001`

### Authentication
All endpoints require JWT token in `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

---

### 1. Get Desktop App Health Metrics

**Endpoint**: `GET /printing/desktop-health`

**Authorization**: `super_admin`, `company_owner`, `branch_manager`

**Query Parameters**:
- `companyId` (optional): Filter by company
- `branchId` (optional): Filter by branch

**Response** (200 OK):
```json
{
  "success": true,
  "timestamp": "2025-10-07T12:34:56.789Z",
  "totalClients": 5,
  "healthMetrics": [
    {
      "clientId": "socket-abc123",
      "branchId": "branch-uuid-1",
      "deviceId": "desktop-device-001",
      "uptime": 3600,
      "reconnectionCount": 0,
      "averageLatency": 45,
      "packetLossRate": 0.5,
      "connectionQuality": "excellent",
      "lastHeartbeat": "2025-10-07T12:34:00Z",
      "lastHealthReport": "2025-10-07T12:30:00Z"
    }
  ],
  "summary": {
    "excellent": 3,
    "good": 1,
    "fair": 1,
    "poor": 0
  }
}
```

**Error** (404):
```json
{
  "success": false,
  "message": "No connected desktop apps found"
}
```

---

### 2. Get Specific Device Health Details

**Endpoint**: `GET /printing/desktop-health/:deviceId`

**Authorization**: `super_admin`, `company_owner`, `branch_manager`

**Path Parameters**:
- `deviceId`: Desktop device identifier

**Response** (200 OK):
```json
{
  "success": true,
  "deviceId": "desktop-device-001",
  "clientId": "socket-abc123",
  "branchId": "branch-uuid-1",
  "uptime": 3600,
  "reconnectionCount": 0,
  "averageLatency": 45,
  "packetLossRate": 0.5,
  "connectionQuality": "excellent",
  "lastHeartbeat": "2025-10-07T12:34:00Z",
  "lastHealthReport": "2025-10-07T12:30:00Z",
  "metricsHistory": [
    {
      "timestamp": "2025-10-07T12:33:45Z",
      "latency": 42,
      "quality": "excellent"
    },
    {
      "timestamp": "2025-10-07T12:33:30Z",
      "latency": 48,
      "quality": "excellent"
    }
    // ... up to 100 entries
  ]
}
```

**Error** (404):
```json
{
  "success": false,
  "message": "Device not found or not connected"
}
```

---

### 3. Execute Printer Test

**Endpoint**: `POST /printing/printers/:printerId/test`

**Authorization**: `super_admin`, `company_owner`, `branch_manager`, `cashier`

**Path Parameters**:
- `printerId`: Printer UUID

**Request Body**: (optional)
```json
{
  "testType": "receipt" | "kitchen" | "label",
  "content": "Custom test content"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Physical print test completed successfully",
  "timestamp": "2025-10-07T12:34:56.789Z",
  "correlationId": "printer_test_1234567890_001_abc123",
  "clientsAvailable": 1,
  "processingTime": 245
}
```

**Error** (503 Service Unavailable):
```json
{
  "success": false,
  "message": "RestaurantPrint Pro desktop app is not connected",
  "error": "PrinterMaster offline",
  "suggestion": "Please start the RestaurantPrint Pro desktop application",
  "correlationId": "printer_test_1234567890_001_abc123"
}
```

---

### 4. Get All Printers

**Endpoint**: `GET /printing/printers`

**Authorization**: All authenticated roles

**Query Parameters**:
- `companyId` (optional): Filter by company
- `branchId` (optional): Filter by branch
- `status` (optional): Filter by status

**Response** (200 OK):
```json
{
  "success": true,
  "printers": [
    {
      "id": "printer-uuid-1",
      "name": "POS-80C Receipt Printer",
      "type": "thermal",
      "connection": "usb",
      "status": "online",
      "model": "POS-80C",
      "manufacturer": "Epson",
      "capabilities": ["receipt", "cut", "barcode"],
      "branchId": "branch-uuid-1",
      "companyId": "company-uuid-1",
      "lastSeen": "2025-10-07T12:34:00Z",
      "createdAt": "2025-10-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

### 5. Get Service Registry Status

**Endpoint**: `GET /printing/service-registry/status`

**Authorization**: `super_admin`

**Response** (200 OK):
```json
{
  "success": true,
  "stats": {
    "totalServices": 3,
    "healthyServices": 2,
    "unhealthyServices": 1,
    "servicesByType": {
      "desktop_app": 2,
      "backend": 1
    },
    "averageConnectionCount": 1.5,
    "totalRequests": 1234
  },
  "services": [
    {
      "id": "desktop-device-001",
      "name": "PrinterMaster Desktop",
      "type": "desktop_app",
      "host": "192.168.1.100",
      "port": 8182,
      "version": "2.0.0",
      "isHealthy": true,
      "lastSeen": "2025-10-07T12:34:00Z",
      "connectionCount": 1,
      "requestCount": 45
    }
  ]
}
```

---

## Request/Response Schemas

### Correlation ID Format

```typescript
correlationId = `${type}_${timestamp}_${counter}_${random}`

Example: "printer_test_1696700000000_42_abc123xy"
```

**Components**:
- `type`: Event type (e.g., "printer_test", "print_job")
- `timestamp`: Unix timestamp in milliseconds
- `counter`: Sequential counter (0-999999)
- `random`: Random alphanumeric string (7 chars)

---

### Connection Quality Ratings

| Quality | Latency | Packet Loss |
|---------|---------|-------------|
| excellent | < 100ms | < 1% |
| good | < 250ms | < 5% |
| fair | < 500ms | < 10% |
| poor | >= 500ms | >= 10% |

---

## Error Codes

### WebSocket Error Events

| Event | Code | Description |
|-------|------|-------------|
| `error:authentication` | `AUTH_FAILED` | Invalid JWT or license key |
| `error:unauthorized` | `UNAUTHORIZED` | Insufficient permissions |
| `error:printer_not_found` | `PRINTER_NOT_FOUND` | Printer ID not found |
| `error:printer_offline` | `PRINTER_OFFLINE` | Printer not connected |
| `error:timeout` | `TIMEOUT` | Request timeout (15s) |
| `error:correlation_mismatch` | `CORRELATION_MISMATCH` | Invalid correlation ID |

### HTTP Error Codes

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| 400 | Bad Request | Invalid request body, missing required fields |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions for operation |
| 404 | Not Found | Printer, device, or resource not found |
| 503 | Service Unavailable | Desktop app not connected |
| 500 | Internal Server Error | Unexpected server error |

---

## Authentication

### JWT Token Structure

**Header**:
```json
{
  "typ": "JWT",
  "alg": "HS256"
}
```

**Payload**:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "branch_manager",
  "companyId": "company-uuid",
  "branchId": "branch-uuid",
  "iat": 1696700000,
  "exp": 1696786400
}
```

### WebSocket Authentication

**Connection Handshake**:
```javascript
const socket = io('http://31.57.166.18:3001/printing-ws', {
  auth: {
    token: 'jwt_token_here',           // For web clients
    licenseKey: 'license_key_here',    // For desktop apps
    branchId: 'branch-uuid',
    companyId: 'company-uuid',
    deviceId: 'desktop-device-001',    // Desktop apps only
    userRole: 'desktop_app' | 'web_user',
    appVersion: '2.0.0'                // Desktop apps only
  }
});
```

---

## Examples

### Complete Printer Test Flow

**1. Web Client Initiates Test**:
```javascript
// Frontend sends test request via REST API
const response = await fetch('http://31.57.166.18:3001/printing/printers/printer-uuid-1/test', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + jwtToken,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log('Correlation ID:', result.correlationId);
```

**2. Backend Emits to Desktop App**:
```typescript
// Backend gateway generates correlation ID and emits
socket.emit('printer:test', {
  printerName: 'POS-80C',
  correlationId: 'printer_test_1696700000000_42_abc123xy',
  requestTimestamp: '2025-10-07T12:34:56.789Z',
  branchId: 'branch-uuid-1',
  metadata: {
    requestSource: 'backend_gateway',
    expectedResponseEvent: 'printer:test:result',
    timeout: 15000
  }
}, (ack) => {
  console.log('ACK received from Desktop App');
});
```

**3. Desktop App Executes and Responds**:
```javascript
// Desktop App receives test request
socket.on('printer:test', async (testData) => {
  const result = await executePrintTest(testData.printerName);

  // Send result back with correlation ID
  socket.emit('printer:test:result', {
    printerId: 'printer-uuid-1',
    correlationId: testData.correlationId,
    success: result.success,
    message: result.message,
    timestamp: new Date().toISOString(),
    processingTime: result.duration
  });
});
```

**4. Backend Resolves Promise**:
```typescript
// Backend receives result and resolves pending request
this.resolvePendingRequest(correlationId, result);
// Returns result to original web client request
```

---

### Health Monitoring Integration

**Frontend Dashboard**:
```javascript
// Subscribe to health alerts
socket.on('desktop:health:alert', (alert) => {
  if (alert.severity === 'critical') {
    showNotification('Critical', `Connection degraded: ${alert.reason}`);
  }
});

// Fetch current health metrics
const healthData = await fetch('http://31.57.166.18:3001/printing/desktop-health', {
  headers: { 'Authorization': `Bearer ${jwtToken}` }
}).then(r => r.json());

// Display on dashboard
healthData.healthMetrics.forEach(device => {
  addDeviceCard({
    id: device.deviceId,
    quality: device.connectionQuality,
    latency: device.averageLatency,
    uptime: device.uptime
  });
});
```

---

**Document Maintained By**: Backend API Team
**Last Review Date**: October 7, 2025
**Next Review Date**: January 7, 2026
