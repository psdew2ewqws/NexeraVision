# API Endpoints and Integration Patterns

## API Architecture Overview

The Delivery Integration Platform exposes a comprehensive RESTful API designed for multi-tenant operations, with specialized endpoints for each delivery provider integration. The API follows OpenAPI 3.0 specifications and implements industry-standard patterns for scalability, security, and maintainability.

## API Structure and Versioning

### Base API Structure
```
https://api.integration-platform.com/api/v1/
├── auth/                    # Authentication endpoints
├── companies/               # Company management
├── users/                   # User management
├── integrations/           # Integration configurations
├── orders/                 # Order management
├── menu-sync/              # Menu synchronization
├── webhooks/               # Webhook receivers
├── analytics/              # Business intelligence
└── admin/                  # Platform administration
```

### API Versioning Strategy
- **Current Version**: v1
- **Versioning Method**: URL path versioning
- **Backward Compatibility**: 6 months minimum support
- **Deprecation Notice**: 90 days advance notice

## Authentication Endpoints

### Core Authentication API
```yaml
Authentication API:
  base_path: /api/v1/auth
  security: Public (login/register), JWT (profile/refresh)
```

#### POST /api/v1/auth/login
**Purpose**: Authenticate user and obtain access tokens
```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
  companyDomain?: string; // Optional for multi-company users
}

// Response
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  company: {
    id: string;
    name: string;
    domain: string;
  };
  permissions: string[];
  expiresIn: number;
}

// Example
curl -X POST /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@restaurant.com",
    "password": "securePassword123"
  }'
```

#### POST /api/v1/auth/register
**Purpose**: Register new user account
```typescript
interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyId?: string; // Required for non-super-admin registration
  role?: UserRole;    // Defaults to USER
}

interface RegisterResponse {
  message: string;
  user: UserProfile;
  requiresActivation: boolean;
}
```

#### GET /api/v1/auth/profile
**Purpose**: Get current user profile
**Authentication**: JWT required
```typescript
interface ProfileResponse {
  user: UserProfile;
  company: CompanyProfile;
  permissions: Permission[];
  lastLoginAt: Date;
  sessionInfo: SessionInfo;
}
```

#### POST /api/v1/auth/refresh
**Purpose**: Refresh access token using refresh token
```typescript
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

## Company Management API

### Company Operations
```yaml
Company API:
  base_path: /api/v1/companies
  security: JWT required
  tenant_isolation: Automatic company filtering
```

#### GET /api/v1/companies/profile
**Purpose**: Get current company profile and statistics
```typescript
interface CompanyProfileResponse {
  company: {
    id: string;
    name: string;
    email: string;
    phone: string;
    businessType: string;
    isActive: boolean;
    createdAt: Date;
  };
  statistics: {
    totalOrders: number;
    totalRevenue: number;
    activeIntegrations: number;
    menuItems: number;
  };
  subscription: {
    plan: string;
    status: string;
    expiresAt: Date;
  };
}
```

#### PATCH /api/v1/companies/:id
**Purpose**: Update company information
**Authorization**: COMPANY_ADMIN or SUPER_ADMIN
```typescript
interface UpdateCompanyRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  businessType?: string;
  settings?: CompanySettings;
}
```

#### GET /api/v1/companies/stats
**Purpose**: Get company operational statistics
```typescript
interface CompanyStatsResponse {
  orders: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  integrations: IntegrationStats[];
  performance: PerformanceMetrics;
}
```

## Integration Management API

### Integration Configuration
```yaml
Integrations API:
  base_path: /api/v1/integrations
  security: JWT required
  permissions: integration:read, integration:write
```

#### GET /api/v1/integrations
**Purpose**: List all company integrations
```typescript
interface IntegrationsResponse {
  integrations: IntegrationConfig[];
  total: number;
  active: number;
  inactive: number;
}

interface IntegrationConfig {
  id: string;
  platform: DeliveryPlatform;
  isEnabled: boolean;
  lastSyncAt: Date;
  status: IntegrationStatus;
  configuration: PlatformConfig;
  statistics: IntegrationStatistics;
}
```

#### POST /api/v1/integrations
**Purpose**: Create new integration configuration
```typescript
interface CreateIntegrationRequest {
  platform: DeliveryPlatform;
  apiKey?: string;
  apiSecret?: string;
  merchantId?: string;
  storeId?: string;
  webhookSecret?: string;
  configuration?: Record<string, any>;
  isEnabled?: boolean;
}

// Example: Careem integration setup
curl -X POST /api/v1/integrations \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "CAREEM",
    "apiKey": "careem_api_key_here",
    "apiSecret": "careem_secret_here",
    "merchantId": "merchant_123",
    "webhookSecret": "webhook_secret",
    "isEnabled": true
  }'
```

#### PATCH /api/v1/integrations/:id
**Purpose**: Update integration configuration
```typescript
interface UpdateIntegrationRequest {
  isEnabled?: boolean;
  apiKey?: string;
  apiSecret?: string;
  configuration?: Record<string, any>;
  webhookUrl?: string;
}
```

#### POST /api/v1/integrations/:id/test-connection
**Purpose**: Test integration connectivity
```typescript
interface TestConnectionResponse {
  success: boolean;
  platform: DeliveryPlatform;
  responseTime: number;
  status: string;
  details: {
    apiConnection: boolean;
    webhookUrl: boolean;
    authentication: boolean;
  };
  error?: string;
}
```

#### PATCH /api/v1/integrations/:id/toggle
**Purpose**: Enable/disable integration
```typescript
interface ToggleIntegrationResponse {
  id: string;
  platform: DeliveryPlatform;
  isEnabled: boolean;
  updatedAt: Date;
}
```

## Order Management API

### Unified Order Operations
```yaml
Orders API:
  base_path: /api/v1/orders
  security: JWT required
  real_time: WebSocket notifications enabled
```

#### GET /api/v1/orders
**Purpose**: Get paginated list of orders
```typescript
interface OrdersQuery {
  page?: number;
  limit?: number;
  platform?: DeliveryPlatform;
  status?: OrderStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

interface OrdersResponse {
  orders: DeliveryOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: OrdersSummary;
}
```

#### GET /api/v1/orders/:id
**Purpose**: Get detailed order information
```typescript
interface OrderDetailResponse {
  order: DeliveryOrder;
  timeline: OrderTimeline[];
  customer: CustomerInfo;
  items: OrderItem[];
  payments: PaymentInfo[];
  delivery: DeliveryInfo;
}
```

#### PATCH /api/v1/orders/:id/status
**Purpose**: Update order status
```typescript
interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
  estimatedDeliveryTime?: Date;
}

// Example: Accept order
curl -X PATCH /api/v1/orders/order-123/status \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACCEPTED",
    "notes": "Order confirmed, preparing now",
    "estimatedDeliveryTime": "2025-09-25T14:30:00Z"
  }'
```

#### GET /api/v1/orders/recent
**Purpose**: Get recent orders for dashboard
```typescript
interface RecentOrdersResponse {
  orders: RecentOrder[];
  statistics: {
    pending: number;
    accepted: number;
    inPreparation: number;
    ready: number;
    delivered: number;
  };
}
```

## Menu Synchronization API

### Cross-Platform Menu Management
```yaml
Menu Sync API:
  base_path: /api/v1/sync/menu
  security: JWT required
  permissions: menu:read, menu:write
```

#### POST /api/v1/sync/menu/all-platforms
**Purpose**: Synchronize menu across all enabled platforms
```typescript
interface SyncMenuRequest {
  menuData?: MenuData; // If not provided, fetches from POS
  platforms?: DeliveryPlatform[]; // Specific platforms, default: all enabled
  syncType?: 'full' | 'delta'; // Full sync or incremental
  options?: SyncOptions;
}

interface SyncMenuResponse {
  syncId: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  platforms: PlatformSyncResult[];
  totalItems: number;
  estimatedDuration: number;
}

// Example: Full menu sync
curl -X POST /api/v1/sync/menu/all-platforms \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "syncType": "full",
    "platforms": ["CAREEM", "TALABAT", "DHUB"],
    "options": {
      "updatePricing": true,
      "updateAvailability": true,
      "createNewItems": true
    }
  }'
```

#### GET /api/v1/sync/menu/status/:syncId
**Purpose**: Get menu sync status
```typescript
interface SyncStatusResponse {
  syncId: string;
  status: SyncStatus;
  progress: number; // 0-100
  platforms: PlatformSyncStatus[];
  startedAt: Date;
  completedAt?: Date;
  errors: SyncError[];
}
```

#### GET /api/v1/sync/menu/mappings
**Purpose**: Get menu item mappings across platforms
```typescript
interface MenuMappingsResponse {
  mappings: MenuMapping[];
  unmappedItems: UnmappedItem[];
  statistics: {
    totalMappings: number;
    activeMappings: number;
    platforms: PlatformMappingStats[];
  };
}
```

#### POST /api/v1/sync/menu/mappings
**Purpose**: Create or update menu item mappings
```typescript
interface CreateMappingRequest {
  localProductId: string;
  mappings: PlatformMapping[];
}

interface PlatformMapping {
  platform: DeliveryPlatform;
  platformProductId: string;
  productName: string;
  productPrice: number;
  isAvailable: boolean;
}
```

## Webhook Management API

### Provider-Specific Webhook Endpoints
```yaml
Webhooks API:
  base_path: /api/v1/webhooks
  security: Signature verification
  rate_limiting: Provider-specific limits
```

#### POST /api/v1/webhooks/careem
**Purpose**: Receive Careem webhook notifications
**Security**: HMAC-SHA256 signature verification
```typescript
interface CareemWebhookPayload {
  order_id: string;
  merchant_id: string;
  event_type: 'order_created' | 'order_updated' | 'order_cancelled';
  order_data: CareemOrder;
  timestamp: string;
}

// Webhook signature verification
const signature = req.headers['x-careem-signature'];
const isValid = verifySignature(payload, signature, webhookSecret);
```

#### POST /api/v1/webhooks/talabat
**Purpose**: Receive Talabat webhook notifications
```typescript
interface TalabatWebhookPayload {
  OrderId: number;
  RestaurantId: number;
  EventType: 'NewOrder' | 'OrderStatusChanged' | 'OrderCancelled';
  OrderData: TalabatOrder;
  Timestamp: string;
}
```

#### POST /api/v1/webhooks/dhub
**Purpose**: Receive DHUB webhook notifications
```typescript
interface DHubWebhookPayload {
  id: string;
  store_id: string;
  event: 'order.created' | 'order.updated' | 'order.cancelled';
  data: DHubOrder;
  created_at: string;
}
```

#### GET /api/v1/webhooks/logs
**Purpose**: Get webhook activity logs
```typescript
interface WebhookLogsQuery {
  platform?: DeliveryPlatform;
  eventType?: string;
  status?: 'processed' | 'failed' | 'pending';
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

interface WebhookLogsResponse {
  logs: WebhookLog[];
  pagination: Pagination;
  statistics: WebhookStatistics;
}
```

## Order Synchronization API

### Real-time Order Sync
```yaml
Order Sync API:
  base_path: /api/v1/sync/orders
  security: JWT required
  real_time: WebSocket events
```

#### POST /api/v1/sync/orders/all-platforms
**Purpose**: Sync orders from all platforms
```typescript
interface SyncOrdersRequest {
  platforms?: DeliveryPlatform[];
  dateFrom?: Date;
  dateTo?: Date;
  syncType?: 'full' | 'recent' | 'failed';
}

interface SyncOrdersResponse {
  syncId: string;
  platforms: PlatformSyncResult[];
  totalOrders: number;
  newOrders: number;
  updatedOrders: number;
}
```

#### GET /api/v1/sync/orders/recent
**Purpose**: Get recently synced orders
```typescript
interface RecentOrdersQuery {
  hours?: number; // Last N hours, default: 24
  platforms?: DeliveryPlatform[];
  status?: OrderStatus[];
}

interface RecentOrdersResponse {
  orders: DeliveryOrder[];
  summary: {
    totalOrders: number;
    newOrders: number;
    platformBreakdown: PlatformOrderCount[];
  };
}
```

## Analytics and Reporting API

### Business Intelligence Endpoints
```yaml
Analytics API:
  base_path: /api/v1/analytics
  security: JWT required
  permissions: analytics:read
```

#### GET /api/v1/analytics/dashboard
**Purpose**: Get company dashboard analytics
```typescript
interface DashboardAnalyticsResponse {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
  };
  trends: {
    ordersToday: number;
    ordersYesterday: number;
    revenueToday: number;
    revenueYesterday: number;
  };
  platforms: PlatformAnalytics[];
  recentActivity: Activity[];
}
```

#### GET /api/v1/analytics/metrics
**Purpose**: Get detailed performance metrics
```typescript
interface MetricsQuery {
  dateFrom: Date;
  dateTo: Date;
  platforms?: DeliveryPlatform[];
  metrics?: MetricType[];
  groupBy?: 'day' | 'week' | 'month';
}

interface MetricsResponse {
  metrics: AnalyticsMetric[];
  aggregates: MetricAggregates;
  comparisons: MetricComparisons;
}
```

#### GET /api/v1/analytics/performance
**Purpose**: Get integration performance metrics
```typescript
interface PerformanceMetricsResponse {
  integrations: IntegrationPerformance[];
  systemHealth: SystemHealthMetrics;
  alerts: PerformanceAlert[];
}
```

## WebSocket Real-time API

### Real-time Event Streaming
```yaml
WebSocket API:
  endpoint: wss://api.integration-platform.com/delivery
  authentication: JWT token required
  heartbeat: 30 seconds
```

#### Connection Setup
```javascript
// Client connection
const socket = io('wss://api.integration-platform.com/delivery', {
  auth: {
    token: jwt_token
  }
});

// Join company room
socket.emit('join-company', {
  companyId: 'company-uuid',
  token: jwt_token
});
```

#### Client Events (Emit)
```javascript
// Join company room for updates
socket.emit('join-company', { companyId, token });

// Subscribe to specific order updates
socket.emit('subscribe-order', { orderId });

// Subscribe to integration status
socket.emit('subscribe-integration', { platform });
```

#### Server Events (Listen)
```javascript
// New order received
socket.on('order-update', (data) => {
  console.log('Order update:', data);
  // { orderId, status, platform, timestamp, details }
});

// Integration status change
socket.on('integration-status', (data) => {
  console.log('Integration status:', data);
  // { platform, isOnline, lastSync, errors }
});

// Menu sync progress
socket.on('sync-update', (data) => {
  console.log('Sync progress:', data);
  // { syncId, platform, progress, total, status }
});

// System alerts
socket.on('system-alert', (data) => {
  console.log('System alert:', data);
  // { type, severity, message, affectedServices }
});
```

## Integration Patterns

### Standard Request/Response Pattern
```typescript
// Standard API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: ApiError[];
  metadata?: ResponseMetadata;
}

interface ResponseMetadata {
  requestId: string;
  timestamp: Date;
  version: string;
  processingTime: number;
}
```

### Error Handling Pattern
```typescript
interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

// Standard error responses
const errorResponses = {
  400: 'Bad Request - Invalid request data',
  401: 'Unauthorized - Authentication required',
  403: 'Forbidden - Insufficient permissions',
  404: 'Not Found - Resource not found',
  409: 'Conflict - Resource already exists',
  422: 'Unprocessable Entity - Validation failed',
  429: 'Too Many Requests - Rate limit exceeded',
  500: 'Internal Server Error - Server error occurred'
};
```

### Pagination Pattern
```typescript
interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### Filtering and Search Pattern
```typescript
interface FilterQuery {
  search?: string;
  filters?: Record<string, any>;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

// Example: Advanced order filtering
GET /api/v1/orders?search=pizza&status=pending&platform=careem&dateFrom=2025-09-01
```

## Rate Limiting and Throttling

### Rate Limit Configuration
```typescript
interface RateLimitConfig {
  endpoint: string;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  burstLimit?: number;
  skipIf?: (req: Request) => boolean;
}

// Example rate limits
const rateLimits = {
  '/api/v1/auth/login': { windowMs: 900000, maxRequests: 5 }, // 5 attempts per 15 minutes
  '/api/v1/orders': { windowMs: 60000, maxRequests: 1000 },   // 1000 requests per minute
  '/api/v1/sync/*': { windowMs: 60000, maxRequests: 100 },    // 100 sync requests per minute
  '/api/v1/webhooks/*': { windowMs: 60000, maxRequests: 10000 } // 10k webhooks per minute
};
```

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1695648000
X-RateLimit-Window: 60
```

## API Documentation and Testing

### OpenAPI Specification
```yaml
openapi: 3.0.3
info:
  title: Delivery Integration Platform API
  description: Multi-tenant delivery integration management API
  version: 1.0.0
  contact:
    name: API Support
    email: support@integration-platform.com
servers:
  - url: https://api.integration-platform.com/api/v1
    description: Production server
  - url: https://staging-api.integration-platform.com/api/v1
    description: Staging server
```

### API Testing Examples
```bash
# Authentication
curl -X POST /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@restaurant.com","password":"password123"}'

# Get orders with filters
curl -X GET "/api/v1/orders?platform=careem&status=pending&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"

# Create integration
curl -X POST /api/v1/integrations \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"platform":"TALABAT","apiKey":"key123","merchantId":"merchant456"}'

# Test integration connection
curl -X POST /api/v1/integrations/integration-id/test-connection \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Performance Optimization

### Caching Strategy
- **Response Caching**: 5-minute cache for static data
- **Database Query Caching**: Redis-based query result caching
- **API Rate Limiting**: Token bucket algorithm
- **Connection Pooling**: Database connection optimization

### Performance Metrics
- **API Response Time**: <200ms average
- **Webhook Processing**: <100ms average
- **Database Query Time**: <50ms average
- **Throughput**: 10,000+ requests/minute supported

---

**Document Version**: 1.0
**Last Updated**: September 25, 2025
**API Version**: v1
**OpenAPI Specification**: 3.0.3