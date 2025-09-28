# Delivery Providers Integration Guide

## Overview

The Delivery Integration Platform supports 9 major delivery providers across the Middle East and North Africa region. Each provider integration follows standardized patterns while accommodating platform-specific requirements and business logic.

## Delivery Providers Matrix

### Provider Status Overview
| Provider | Region | Status | Integration Level | Features |
|----------|---------|---------|-------------------|----------|
| Careem Now | Middle East | ✅ Production | Full | Menu sync, Orders, Webhooks, Analytics |
| Talabat | Regional | ✅ Production | Full | Menu sync, Orders, Webhooks, Analytics |
| DHUB | Saudi Arabia | ✅ Production | Full | API + Webhooks, Order tracking |
| HungerStation | Saudi Arabia | ✅ Production | Full | Restaurant API, Menu management |
| Nashmi | Local | 🟡 Expanding | Partial | Basic API, Order sync |
| Top Delivery | Regional | 🟡 Development | Partial | Order sync, Menu sync pending |
| Jood Delivery | Emerging | 🟡 Development | Partial | Webhooks, Analytics pending |
| Yallow | Multi-service | 🟡 Basic | Basic | Order management only |
| Tawasi | Local | 🟡 Initial | Basic | Initial implementation |

## Integration Architecture Patterns

### Standard Provider Interface
```typescript
interface DeliveryProvider {
  // Core identification
  platform: DeliveryPlatform;
  name: string;
  region: string[];

  // Authentication methods
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;
  refreshToken(refreshToken: string): Promise<AuthResult>;

  // Menu management
  syncMenu(menuData: MenuData): Promise<SyncResult>;
  updateMenuItem(itemId: string, updates: MenuItemUpdate): Promise<UpdateResult>;
  getMenuStatus(): Promise<MenuStatus>;

  // Order processing
  processOrder(orderData: OrderData): Promise<OrderResult>;
  getOrderStatus(orderId: string): Promise<OrderStatus>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;

  // Webhook handling
  handleWebhook(payload: WebhookPayload, headers: WebhookHeaders): Promise<void>;
  verifyWebhookSignature(payload: string, signature: string): boolean;

  // Analytics and monitoring
  getAnalytics(dateRange: DateRange): Promise<AnalyticsData>;
  getHealthStatus(): Promise<HealthStatus>;
}
```

## Provider-Specific Implementations

### 1. Careem Now Integration

**Market Position**: Leading delivery platform in Middle East
**Integration Maturity**: Full production with advanced features

#### Technical Specifications
- **API Version**: v2.1
- **Authentication**: OAuth 2.0 with client credentials
- **Webhook Security**: HMAC-SHA256 signature verification
- **Rate Limits**: 1000 requests/hour per merchant

#### Implementation Details
```typescript
// Careem-specific configuration
interface CareemConfig {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  sandboxMode: boolean;
  webhookSecret: string;
}

// Careem order structure
interface CareemOrder {
  order_id: string;
  merchant_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED';
  items: CareemOrderItem[];
  customer: CareemCustomer;
  delivery_address: CareemAddress;
  payment_method: string;
  total_amount: number;
  created_at: string;
}
```

#### Key Features
- **Menu Synchronization**: Real-time menu updates with category mapping
- **Order Management**: Full lifecycle management with status updates
- **Webhook Processing**: Instant order notifications and status changes
- **Analytics Integration**: Commission tracking and performance metrics

### 2. Talabat Integration

**Market Position**: Dominant regional platform with wide coverage
**Integration Maturity**: Full production with comprehensive features

#### Technical Specifications
- **API Version**: v3.0
- **Authentication**: API Key + HMAC request signing
- **Webhook Security**: Custom signature verification
- **Rate Limits**: 500 requests/minute per restaurant

#### Implementation Details
```typescript
// Talabat-specific configuration
interface TalabatConfig {
  apiKey: string;
  secretKey: string;
  restaurantId: string;
  branchId: string;
  webhookUrl: string;
}

// Talabat order structure
interface TalabatOrder {
  OrderId: number;
  RestaurantId: number;
  BranchId: number;
  OrderStatus: 'New' | 'Confirmed' | 'InPreparation' | 'ReadyForPickup' | 'Delivered';
  OrderItems: TalabatOrderItem[];
  CustomerInfo: TalabatCustomer;
  DeliveryInfo: TalabatDelivery;
  OrderTotal: number;
  CreatedDate: string;
}
```

#### Key Features
- **Advanced Menu Sync**: Category hierarchy with modifier support
- **Real-time Updates**: Instant order and status synchronization
- **Commission Tracking**: Detailed financial reporting
- **Multi-branch Support**: Single integration for multiple locations

### 3. DHUB Integration

**Market Position**: Saudi Arabia focused with growing market share
**Integration Maturity**: Full production with specialized features

#### Technical Specifications
- **API Version**: v1.2
- **Authentication**: Bearer token with refresh capability
- **Webhook Security**: IP whitelist + signature verification
- **Rate Limits**: 300 requests/minute

#### Implementation Details
```typescript
// DHUB-specific configuration
interface DHubConfig {
  apiUrl: string;
  accessToken: string;
  refreshToken: string;
  storeId: string;
  webhookSecret: string;
}

// DHUB order structure
interface DHubOrder {
  id: string;
  store_id: string;
  order_number: string;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'dispatched' | 'delivered';
  items: DHubOrderItem[];
  customer: DHubCustomer;
  delivery_details: DHubDelivery;
  payment_info: DHubPayment;
  timestamps: DHubTimestamps;
}
```

#### Key Features
- **Delivery Tracking**: GPS-based real-time delivery tracking
- **Order Scheduling**: Support for scheduled deliveries
- **Payment Integration**: Multiple payment method support
- **Custom Notifications**: SMS and push notification integration

### 4. HungerStation Integration

**Market Position**: Major player in Saudi Arabian market
**Integration Maturity**: Full production with restaurant-focused features

#### Technical Specifications
- **API Version**: Restaurant API v2.0
- **Authentication**: Restaurant credentials with session management
- **Webhook Security**: Token-based verification
- **Rate Limits**: 200 requests/minute per restaurant

#### Implementation Details
```typescript
// HungerStation-specific configuration
interface HungerStationConfig {
  restaurantUsername: string;
  restaurantPassword: string;
  restaurantId: string;
  apiBaseUrl: string;
  webhookToken: string;
}

// HungerStation order structure
interface HungerStationOrder {
  OrderId: string;
  RestaurantId: string;
  OrderStatus: 'Pending' | 'Accepted' | 'InKitchen' | 'Ready' | 'OutForDelivery' | 'Delivered';
  OrderItems: HSOrderItem[];
  CustomerDetails: HSCustomer;
  DeliveryAddress: HSAddress;
  OrderValue: number;
  OrderDate: string;
}
```

#### Key Features
- **Restaurant Dashboard Integration**: Direct integration with restaurant portal
- **Menu Management**: Full menu CRUD operations
- **Order Analytics**: Detailed performance reporting
- **Multi-language Support**: Arabic and English menu support

### 5. Nashmi Integration

**Market Position**: Local delivery service with growing presence
**Integration Maturity**: Expanding features, partial implementation

#### Current Implementation
- **Order Synchronization**: Basic order receipt and processing
- **Status Updates**: Manual status update capability
- **API Integration**: RESTful API with basic authentication

#### Development Roadmap
- **Menu Synchronization**: Full menu sync implementation
- **Webhook Support**: Real-time order notifications
- **Analytics Integration**: Performance metrics collection

### 6. Top Delivery Integration

**Market Position**: Regional presence with competitive features
**Integration Maturity**: Development phase, order sync implemented

#### Current Implementation
- **Order Processing**: Order receipt and basic processing
- **Authentication**: API key-based authentication
- **Status Management**: Order status update capability

#### Development Roadmap
- **Menu Synchronization**: Cross-platform menu management
- **Advanced Features**: Delivery tracking and analytics
- **Webhook Implementation**: Real-time notification system

### 7. Jood Delivery Integration

**Market Position**: Emerging platform with growth potential
**Integration Maturity**: Development phase, webhook processing implemented

#### Current Implementation
- **Webhook Processing**: Order notification handling
- **Basic Authentication**: API key management
- **Order Management**: Basic order lifecycle support

#### Development Roadmap
- **Analytics Integration**: Performance metrics and reporting
- **Menu Synchronization**: Full menu management capabilities
- **Advanced Features**: Customer data integration

### 8. Yallow Integration

**Market Position**: Multi-service platform with delivery component
**Integration Maturity**: Basic implementation, order management only

#### Current Implementation
- **Order Management**: Basic order processing
- **API Integration**: Simple REST API connectivity
- **Status Updates**: Manual order status management

#### Development Roadmap
- **Feature Expansion**: Menu sync and webhook support
- **Service Integration**: Multi-service platform capabilities
- **Enhanced Analytics**: Performance tracking implementation

### 9. Tawasi Integration

**Market Position**: Local market focus with specialized features
**Integration Maturity**: Initial implementation phase

#### Current Implementation
- **Initial Setup**: Basic API connectivity established
- **Order Processing**: Simple order handling capability
- **Authentication**: Basic API key authentication

#### Development Roadmap
- **Full Feature Set**: Complete integration implementation
- **Menu Management**: Synchronization capabilities
- **Advanced Features**: Analytics and monitoring

## Integration Implementation Patterns

### Authentication Strategies

#### OAuth 2.0 Implementation (Careem)
```typescript
class CareemAuthService {
  async authenticate(config: CareemConfig): Promise<AuthResult> {
    const tokenRequest = {
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'orders menu'
    };

    const response = await this.httpClient.post('/oauth/token', tokenRequest);
    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type
    };
  }
}
```

#### API Key Authentication (Talabat)
```typescript
class TalabatAuthService {
  async authenticateRequest(config: TalabatConfig, payload: any): Promise<Headers> {
    const timestamp = Date.now().toString();
    const signature = this.generateHMAC(config.secretKey, payload, timestamp);

    return {
      'X-API-Key': config.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json'
    };
  }
}
```

### Webhook Security Implementation

#### HMAC Signature Verification
```typescript
class WebhookSecurityService {
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}
```

### Menu Synchronization Patterns

#### Universal Menu Transformer
```typescript
class MenuTransformerService {
  transformForPlatform(menuData: UniversalMenu, platform: DeliveryPlatform): PlatformMenu {
    const transformer = this.getTransformer(platform);
    return transformer.transform(menuData);
  }

  private getTransformer(platform: DeliveryPlatform): MenuTransformer {
    switch (platform) {
      case 'CAREEM': return new CareemMenuTransformer();
      case 'TALABAT': return new TalabatMenuTransformer();
      case 'DHUB': return new DHubMenuTransformer();
      // ... other transformers
    }
  }
}
```

### Error Handling and Retry Logic

#### Standardized Error Processing
```typescript
class IntegrationErrorHandler {
  async handleApiError(error: ApiError, context: IntegrationContext): Promise<void> {
    const errorType = this.classifyError(error);

    switch (errorType) {
      case 'RATE_LIMIT':
        await this.handleRateLimit(error, context);
        break;
      case 'AUTH_EXPIRED':
        await this.refreshAuthentication(context);
        break;
      case 'TEMPORARY_FAILURE':
        await this.scheduleRetry(context);
        break;
      default:
        await this.logPermanentFailure(error, context);
    }
  }
}
```

## Monitoring and Analytics

### Integration Health Monitoring
```typescript
class IntegrationMonitorService {
  async checkPlatformHealth(platform: DeliveryPlatform): Promise<HealthStatus> {
    const provider = this.getProvider(platform);

    return {
      platform,
      isOnline: await provider.ping(),
      responseTime: await provider.measureResponseTime(),
      errorRate: await provider.getErrorRate(),
      lastSuccessfulSync: await provider.getLastSyncTime()
    };
  }
}
```

### Performance Metrics Collection
```typescript
interface IntegrationMetrics {
  platform: DeliveryPlatform;
  orderProcessingTime: number;
  menuSyncDuration: number;
  webhookResponseTime: number;
  errorCount: number;
  successRate: number;
}
```

## Best Practices and Recommendations

### Integration Development Guidelines
1. **Follow Interface Consistency**: Implement standardized provider interface
2. **Implement Proper Error Handling**: Comprehensive error classification and recovery
3. **Security First**: Always verify webhook signatures and secure credentials
4. **Monitor Performance**: Track response times and success rates
5. **Document Thoroughly**: Maintain clear integration documentation

### Testing Strategies
1. **Unit Testing**: Test individual provider methods
2. **Integration Testing**: End-to-end integration flows
3. **Webhook Testing**: Simulate webhook payloads
4. **Load Testing**: Performance under high volume
5. **Security Testing**: Verify authentication and authorization

### Deployment Considerations
1. **Staged Rollout**: Test in sandbox before production
2. **Feature Flags**: Control integration feature availability
3. **Monitoring Setup**: Implement comprehensive monitoring
4. **Rollback Plans**: Prepare for quick rollback if needed
5. **Documentation**: Maintain operational documentation

## Future Integration Roadmap

### Phase 1: Complete Current Providers
- **Nashmi**: Full feature implementation
- **Top Delivery**: Menu sync and analytics
- **Jood Delivery**: Complete integration
- **Yallow**: Feature expansion
- **Tawasi**: Full implementation

### Phase 2: Advanced Features
- **AI-Powered Optimization**: Intelligent order routing
- **Predictive Analytics**: Demand forecasting
- **Dynamic Pricing**: Real-time price optimization
- **Customer Journey Tracking**: Cross-platform analytics

### Phase 3: New Market Expansion
- **Additional Providers**: Market-specific platforms
- **Regional Customization**: Local market features
- **Compliance Features**: Regional regulatory requirements
- **Multi-language Support**: International expansion

---

**Document Version**: 1.0
**Last Updated**: September 25, 2025
**Coverage**: All 9 Delivery Providers
**Status**: Production Ready (5 providers), Development (4 providers)