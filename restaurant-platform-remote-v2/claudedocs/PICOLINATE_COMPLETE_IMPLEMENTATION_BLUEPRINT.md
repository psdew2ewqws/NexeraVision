# Picolinate Delivery Integration - Complete Implementation Blueprint
**Research Date:** October 1, 2025
**Source:** `/home/admin/Downloads/Picolinate`
**Target Platform:** Restaurant Platform v2 (NestJS/Next.js)

---

## Executive Summary

This document provides a comprehensive implementation blueprint for building a production-grade delivery provider integration system based on the proven Picolinate architecture. The Picolinate system successfully handles **8+ delivery providers** (Talabat, Careem, Yallow, Nashmi, Dhub, Top Delivery, Jood, Tawasi) using a scalable hub-and-spoke middleware pattern.

**Key Insights:**
- ✅ Webhook-based order reception (zero polling overhead)
- ✅ Adapter pattern for provider isolation
- ✅ Branch-based routing for multi-tenant scaling
- ✅ Keycloak OAuth 2.0 / OIDC authentication
- ✅ Exponential backoff retry strategy
- ✅ Comprehensive audit logging
- ✅ Database connection pooling (0-120 connections)

---

## Part 1: System Architecture Overview

### 1.1 Microservices Architecture

**Discovered Services:**

| Service | Port | Purpose | Technology |
|---------|------|---------|------------|
| **OrderingS** | 44370 | Main ordering API | .NET Core 6.0 / ASP.NET Core |
| **Services (CompanyManagement)** | 44308 | Company/branch management | .NET Core 6.0 |
| **CustomerService** | 44310 | Customer data and auth | .NET Core 6.0 |
| **TalabatService** | 44395 | Talabat-specific integration | .NET Core 6.0 |
| **MenuIntegration** | 44368 | Menu synchronization | .NET Core 6.0 |
| **PrinterService** | 5003 | Printing orchestration | .NET Core 6.0 |
| **WhatsAppService** | 5001 | Notifications | .NET Core 6.0 |
| **Chatbot** | - | Customer support | .NET Core 5.0 |
| **ApiServices** | 44379 | Interface/API gateway | .NET Core 6.0 |
| **Integration Middleware** | 44391 | Webhook receiver/transformer | Laravel/PHP |

### 1.2 Integration Middleware Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   Integration Middleware                        │
│              (https://integration.ishbek.com)                   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Careem     │  │   Talabat    │  │    Yallow    │         │
│  │   Adapter    │  │   Adapter    │  │   Adapter    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                 │
│                            │                                     │
│                   ┌────────▼────────┐                           │
│                   │  Unified Order  │                           │
│                   │  Transformer    │                           │
│                   └────────┬────────┘                           │
└────────────────────────────┼───────────────────────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │   OrderingS API    │
                   │  (Order Creation)  │
                   └─────────┬──────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼──────┐   ┌────────▼────────┐   ┌────▼────────┐
│ PrinterService│   │ CustomerService  │   │  Database   │
│  (Auto Print) │   │  (Validation)    │   │ (postgres)  │
└───────────────┘   └─────────────────┘   └─────────────┘
```

### 1.3 Authentication Architecture

**Keycloak OAuth 2.0 / OpenID Connect:**

```yaml
Authentication Provider: Keycloak
Production: https://hauth.ishbek.com/auth/realms/
UAT: https://uat-auth.ishbek.com/auth/realms/
Development: Uses mobile realm

Flow Type: OAuth 2.0 Authorization Code + OIDC
Token Type: JWT (JSON Web Tokens)
Realm Structure:
  - mobile: Mobile app users
  - development: Dev environment
  - production: Live environment

Client Configuration:
  - ClientID: mobile
  - Grant Types: authorization_code, refresh_token
  - Token Endpoint: /protocol/openid-connect/token
  - UserInfo Endpoint: /protocol/openid-connect/userinfo
```

**Service-to-Service Authentication:**

```yaml
Pattern: API Key + Custom Header
Header: X-AUTH
Rotation: Manual (not automated in discovered config)
Validation: UUID-based tokens for POS plugins
```

---

## Part 2: Database Architecture

### 2.1 Connection String Analysis

**Production PostgreSQL Configuration:**
```yaml
Host: 65.21.157.87
Port: 5432
Database: CompanyDB
User: postgres

Connection Pool Settings:
  Minimum Pool Size: 0
  Maximum Pool Size: 120
  Connection Idle Lifetime: 180 seconds
  Timeout: 10 seconds
  Keepalive: 60 seconds
  Pooling: true
```

### 2.2 Key Tables for Integration

**Order Tables:**
```sql
-- Main order table
CREATE TABLE "order" (
  id UUID PRIMARY KEY,
  branch_id UUID REFERENCES branch(id),
  customer_id UUID,
  order_source VARCHAR(50), -- 'talabat', 'careem', 'yallow', etc.
  reference_number VARCHAR(255), -- Provider's order ID
  reference_number2 VARCHAR(255), -- Secondary reference
  order_status_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX order_referencenumber_talabat ON "order"(reference_number) WHERE order_source = 'talabat';
CREATE INDEX order_referencenumber_careem_idx ON "order"(reference_number) WHERE order_source = 'careem';
CREATE INDEX order_ordersource_idx ON "order"(order_source);
CREATE INDEX order_ordersource ON "order"(order_source);
CREATE INDEX order_customerid_idx ON "order"(customer_id);

-- Delayed orders for scheduling
CREATE TABLE delayedorders (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES "order"(id),
  action_time TIMESTAMP
);

-- Order history tracking
CREATE TABLE orderhistory (
  id UUID PRIMARY KEY,
  order_id UUID,
  status_change JSONB,
  created_at TIMESTAMP
);
```

**Delivery Provider Tables:**
```sql
-- Delivery company registration
CREATE TABLE deliverycompany (
  id UUID PRIMARY KEY,
  name JSONB, -- Multi-language support
  is_aggregated BOOLEAN,
  open_time TIMESTAMP,
  close_time TIMESTAMP,
  currency VARCHAR(10),
  address_id UUID,
  phone_number VARCHAR(50),
  is_available BOOLEAN DEFAULT true,
  logo TEXT,
  website TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Branch-specific delivery configuration
CREATE TABLE branchdelivery (
  id UUID PRIMARY KEY,
  branch_id UUID REFERENCES branch(id),
  delivery_company_id UUID REFERENCES deliverycompany(id),
  credentials JSONB, -- Provider-specific API keys
  is_active BOOLEAN DEFAULT true
);

-- Provider-specific zone/area configuration
CREATE TABLE branchdeliveryaddress (
  id UUID PRIMARY KEY,
  branch_delivery_id UUID REFERENCES branchdelivery(id),
  area_id UUID,
  delivery_fee DECIMAL(10,2),
  is_active BOOLEAN
);
```

**Integration Logging Tables:**
```sql
-- Request/response logging
CREATE TABLE requestlog (
  id SERIAL PRIMARY KEY,
  method VARCHAR(10),
  request_body TEXT,
  response_body TEXT,
  code INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for debugging
CREATE INDEX requestlog_method_idx ON requestlog(method);
CREATE INDEX requestlog_requestbody_code_idx ON requestlog(request_body, code);

-- Provider-specific order logs
CREATE TABLE ashyaeeorderlog (
  id UUID PRIMARY KEY,
  order_id UUID,
  provider_order_id VARCHAR(255),
  request_payload JSONB,
  response_payload JSONB,
  status VARCHAR(50),
  created_at TIMESTAMP
);
```

### 2.3 Stored Procedures for Integration

**Delivery Company Creation:**
```sql
CREATE PROCEDURE createdeliverycompany(
  IN _name JSONB,
  IN _isaggregated BOOLEAN,
  IN _phonenumber VARCHAR,
  IN _addressid UUID,
  IN _opentime TIMESTAMP DEFAULT NULL,
  IN _closetime TIMESTAMP DEFAULT NULL,
  IN _currency VARCHAR DEFAULT NULL,
  IN _isavailable BOOLEAN DEFAULT true,
  IN _logo TEXT DEFAULT NULL,
  IN _website TEXT DEFAULT NULL,
  INOUT _id UUID DEFAULT NULL,
  IN _createdby VARCHAR DEFAULT 'SYSTEM'
)
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO deliverycompany(
    name, isaggregated, opentime, closetime, currency,
    addressid, phonenumber, isavailable, logo, website, createdby
  )
  VALUES (
    _name, _isaggregated, _opentime, _closetime, _currency,
    _addressid, _phonenumber, _isavailable, _logo, _website, _createdby
  )
  RETURNING id INTO _id;
END;
$$;
```

**Delayed Order Creation:**
```sql
CREATE PROCEDURE createdelayedorders(
  INOUT _orderid UUID,
  IN _actiontime TIMESTAMP DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO delayedorders (orderid, actiontime)
  VALUES (_orderid, _actiontime);
END;
$$;
```

---

## Part 3: Service Endpoint Mapping

### 3.1 Integration Middleware Endpoints

**Base URL:** `https://integration.ishbek.com`

**Delivery Provider Endpoints:**

| Provider | Create Order Endpoint | Get Fees | Check Status |
|----------|----------------------|----------|--------------|
| **Careem** | `/CareemNow/Api/createOrder/branch/{branchId}` | - | - |
| **Yallow** | `/Yallow/Api/createOrder/branch/{branchId}` | - | - |
| **Nashmi** | `/Nashmi/Nashmi/createOrder/branch/{branchId}` | `/checkPreorderEstimationsTime/branch/{branchId}` | - |
| **Top Delivery** | `/TopDelivery/Api/createOrder/branch/{branchId}` | `/checkOrderEstimations/branch/{branchId}` | `/checkOrderStatus/orderId/{orderId}` |
| **Jood** | `/JoodDelivery/Api/createOrder/branch/{branchId}` | `/checkOrderEstimations/branch/{branchId}` | `/checkOrderStatus/orderId/{orderId}` |
| **Tawasi** | `/Tawasi/Api/createOrder/branch/{branchId}` | - | - |
| **Dhub** | `/api/dhub/createTask` | - | `/api/dhub/checkMerchantTask` |

**Menu Sync Endpoints:**
```
POST /MenuSync/SyncMenu
POST /MenuSync/FoodicsInstall
POST /MenuSync/SendOrder
POST /MenuSync/PosSendOrder
```

### 3.2 OrderingS API Endpoints

**Base URL:** `https://hordering.ishbek.com/api/` (Production)

**Key Endpoints:**
```
POST /orders/create                    # Create new order
GET  /orders/{id}                      # Get order details
PUT  /orders/{id}/status               # Update order status
POST /orders/HandleDeliveryCompanies   # Process delivery provider orders
GET  /orders/branch/{branchId}         # Get orders by branch
```

### 3.3 Printer Service Integration

**Base URL:** `https://hprinter.ishbek.com/`

**Endpoints:**
```
POST /api/Printer/AutoPrint            # Automatic print job
POST /api/Printer/ManualPrint          # Manual print trigger
PUT  /api/Printer/UpdatePrintingOrder  # Update print job status
```

### 3.4 Customer Service Endpoints

**Base URL:** `https://hcustomers.ishbek.com/api/Customers/`

**Endpoints:**
```
POST /Create                           # Create customer
POST /CreateRestaurantCustomers        # Link customer to restaurant
POST /AddPoint                         # Loyalty points
GET  /GetCustomers                     # Query customers
GET  /GetCustomerStatusHeader          # Get customer tier
POST /CreateRestaurantParams           # Configure customer rules
```

---

## Part 4: Authentication Implementation

### 4.1 Keycloak OAuth 2.0 Flow

**User Authentication Flow:**

```typescript
// NestJS Implementation for Restaurant Platform v2

import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class KeycloakAuthService {
  private readonly keycloakConfig = {
    authority: process.env.KEYCLOAK_AUTHORITY || 'https://auth.yourdomain.com/auth/realms/restaurant',
    clientId: process.env.KEYCLOAK_CLIENT_ID,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    tokenEndpoint: '/protocol/openid-connect/token',
    userInfoEndpoint: '/protocol/openid-connect/userinfo',
  };

  /**
   * Authenticate user with username/password
   */
  async authenticateUser(username: string, password: string) {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', this.keycloakConfig.clientId);
    params.append('client_secret', this.keycloakConfig.clientSecret);
    params.append('username', username);
    params.append('password', password);

    const response = await axios.post(
      `${this.keycloakConfig.authority}${this.keycloakConfig.tokenEndpoint}`,
      params,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', this.keycloakConfig.clientId);
    params.append('client_secret', this.keycloakConfig.clientSecret);
    params.append('refresh_token', refreshToken);

    const response = await axios.post(
      `${this.keycloakConfig.authority}${this.keycloakConfig.tokenEndpoint}`,
      params
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  }

  /**
   * Get user info from token
   */
  async getUserInfo(accessToken: string) {
    const response = await axios.get(
      `${this.keycloakConfig.authority}${this.keycloakConfig.userInfoEndpoint}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data;
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      await this.getUserInfo(token);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 4.2 Service-to-Service Authentication

**API Key Middleware:**

```typescript
// src/middleware/api-key.middleware.ts

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  private readonly validApiKeys = new Set([
    process.env.XAUTH_TOKEN,
    // Add more API keys as needed
  ]);

  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-auth'] as string;

    if (!apiKey || !this.validApiKeys.has(apiKey)) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    // Attach metadata to request
    req['apiKeyValid'] = true;
    next();
  }
}
```

**Apply to Integration Routes:**

```typescript
// src/modules/delivery/delivery.module.ts

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ApiKeyMiddleware } from '../../middleware/api-key.middleware';
import { WebhookController } from './controllers/webhook.controller';

@Module({
  controllers: [WebhookController],
  providers: [],
})
export class DeliveryModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiKeyMiddleware)
      .forRoutes('/delivery/webhook/*'); // Protect webhook endpoints
  }
}
```

### 4.3 JWT Token Validation Guard

```typescript
// src/guards/jwt-auth.guard.ts

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { KeycloakAuthService } from '../modules/auth/keycloak-auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly keycloakAuth: KeycloakAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    const isValid = await this.keycloakAuth.validateToken(token);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Attach user info to request
    const userInfo = await this.keycloakAuth.getUserInfo(token);
    request.user = userInfo;

    return true;
  }
}
```

---

## Part 5: Complete Implementation for Restaurant Platform v2

### 5.1 Project Structure

```
restaurant-platform-remote-v2/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── delivery-integration/
│   │   │   │   ├── adapters/
│   │   │   │   │   ├── careem.adapter.ts
│   │   │   │   │   ├── talabat.adapter.ts
│   │   │   │   │   ├── yallow.adapter.ts
│   │   │   │   │   └── adapter.interface.ts
│   │   │   │   ├── controllers/
│   │   │   │   │   ├── webhook.controller.ts
│   │   │   │   │   └── provider-config.controller.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── webhook-processor.service.ts
│   │   │   │   │   ├── order-transformer.service.ts
│   │   │   │   │   └── retry-handler.service.ts
│   │   │   │   ├── entities/
│   │   │   │   │   ├── webhook-log.entity.ts
│   │   │   │   │   ├── provider-config.entity.ts
│   │   │   │   │   └── delivery-order.entity.ts
│   │   │   │   └── delivery-integration.module.ts
│   │   │   └── auth/
│   │   │       ├── keycloak-auth.service.ts
│   │   │       └── api-key.middleware.ts
│   │   └── main.ts
│   └── prisma/
│       └── schema.prisma
└── frontend/
    └── pages/
        └── integration/
            ├── dashboard.tsx
            ├── providers.tsx
            └── webhooks.tsx
```

### 5.2 Prisma Schema for Integration

```prisma
// prisma/schema.prisma

// Delivery Provider Configuration
model DeliveryProvider {
  id            String   @id @default(uuid())
  name          Json     // Multi-language: { en: "Careem", ar: "كريم" }
  providerCode  String   @unique // "careem", "talabat", "yallow"
  baseUrl       String
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  branchConfigs BranchDeliveryConfig[]
  webhookLogs   WebhookLog[]
  orderLogs     ProviderOrderLog[]

  @@map("delivery_providers")
}

// Branch-specific provider configuration
model BranchDeliveryConfig {
  id               String   @id @default(uuid())
  branchId         String
  providerId       String
  credentials      Json     // Encrypted API keys, secrets
  webhookUrl       String?
  webhookSecret    String?
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  branch   Branch           @relation(fields: [branchId], references: [id])
  provider DeliveryProvider @relation(fields: [providerId], references: [id])

  @@unique([branchId, providerId])
  @@map("branch_delivery_configs")
}

// Webhook request logs
model WebhookLog {
  id               String   @id @default(uuid())
  providerId       String
  branchId         String
  providerOrderId  String
  method           String   // "POST", "PUT"
  url              String
  headers          Json
  requestBody      Json
  responseBody     Json?
  statusCode       Int?
  isProcessed      Boolean  @default(false)
  errorMessage     String?
  retryCount       Int      @default(0)
  nextRetryAt      DateTime?
  processedAt      DateTime?
  createdAt        DateTime @default(now())

  provider DeliveryProvider @relation(fields: [providerId], references: [id])

  @@index([providerOrderId])
  @@index([isProcessed, nextRetryAt])
  @@index([createdAt])
  @@map("webhook_logs")
}

// Provider order tracking
model ProviderOrderLog {
  id               String   @id @default(uuid())
  orderId          String
  providerId       String
  providerOrderId  String
  branchId         String
  requestPayload   Json
  responsePayload  Json?
  status           String   // "pending", "accepted", "rejected", "delivered"
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  order    Order            @relation(fields: [orderId], references: [id])
  provider DeliveryProvider @relation(fields: [providerId], references: [id])

  @@index([providerOrderId])
  @@index([orderId])
  @@map("provider_order_logs")
}

// Delivery error logs
model DeliveryErrorLog {
  id            String   @id @default(uuid())
  providerId    String
  orderId       String?
  errorType     String   // "webhook_failed", "validation_error", "provider_error"
  errorMessage  String
  errorStack    String?
  requestData   Json
  responseData  Json?
  severity      String   @default("error") // "info", "warning", "error", "critical"
  isResolved    Boolean  @default(false)
  resolvedAt    DateTime?
  createdAt     DateTime @default(now())

  @@index([providerId, createdAt])
  @@index([isResolved])
  @@map("delivery_error_logs")
}
```

### 5.3 Adapter Interface

```typescript
// src/modules/delivery-integration/adapters/adapter.interface.ts

export interface OrderDetails {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  notes?: string;
  scheduledTime?: Date;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  modifiers?: OrderItemModifier[];
}

export interface OrderItemModifier {
  name: string;
  price: number;
}

export interface ProviderOrderResponse {
  success: boolean;
  providerOrderId?: string;
  estimatedDeliveryTime?: Date;
  deliveryFee?: number;
  errorMessage?: string;
  errorCode?: string;
}

export interface IDeliveryProviderAdapter {
  /**
   * Transform provider webhook payload to internal order format
   */
  transformWebhookToOrder(webhookPayload: any): OrderDetails;

  /**
   * Create order with delivery provider
   */
  createOrder(orderDetails: OrderDetails, branchId: string): Promise<ProviderOrderResponse>;

  /**
   * Get estimated delivery fees
   */
  getDeliveryFees(orderDetails: Partial<OrderDetails>, branchId: string): Promise<number>;

  /**
   * Check order status
   */
  checkOrderStatus(providerOrderId: string): Promise<string>;

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: any, signature: string, secret: string): boolean;
}
```

### 5.4 Careem Adapter Implementation

```typescript
// src/modules/delivery-integration/adapters/careem.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  IDeliveryProviderAdapter,
  OrderDetails,
  ProviderOrderResponse,
} from './adapter.interface';

@Injectable()
export class CareemAdapter implements IDeliveryProviderAdapter {
  private readonly logger = new Logger(CareemAdapter.name);
  private readonly baseUrl = process.env.CAREEM_BASE_URL || 'https://integration.yourdomain.com/CareemNow/Api/';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Transform Careem webhook payload to internal order format
   */
  transformWebhookToOrder(webhookPayload: any): OrderDetails {
    this.logger.log('Transforming Careem webhook to order');

    return {
      customerName: webhookPayload.customer?.name || 'Unknown',
      customerPhone: webhookPayload.customer?.phone || '',
      deliveryAddress: this.formatAddress(webhookPayload.delivery_address),
      items: webhookPayload.items.map(item => ({
        productId: item.product_id || item.external_id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        modifiers: item.modifiers?.map(mod => ({
          name: mod.name,
          price: mod.price,
        })) || [],
      })),
      subtotal: webhookPayload.subtotal || 0,
      deliveryFee: webhookPayload.delivery_fee || 0,
      tax: webhookPayload.tax || 0,
      total: webhookPayload.total || 0,
      notes: webhookPayload.notes || '',
      scheduledTime: webhookPayload.scheduled_time ? new Date(webhookPayload.scheduled_time) : null,
    };
  }

  /**
   * Create order with Careem
   */
  async createOrder(orderDetails: OrderDetails, branchId: string): Promise<ProviderOrderResponse> {
    try {
      const url = `${this.baseUrl}createOrder/branch/${branchId}`;

      const payload = {
        customer: {
          name: orderDetails.customerName,
          phone: orderDetails.customerPhone,
        },
        delivery_address: orderDetails.deliveryAddress,
        items: orderDetails.items.map(item => ({
          product_id: item.productId,
          name: item.productName,
          quantity: item.quantity,
          price: item.price,
          modifiers: item.modifiers,
        })),
        subtotal: orderDetails.subtotal,
        delivery_fee: orderDetails.deliveryFee,
        tax: orderDetails.tax,
        total: orderDetails.total,
        notes: orderDetails.notes,
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'X-AUTH': process.env.XAUTH_TOKEN,
            'Content-Type': 'application/json',
          },
        })
      );

      return {
        success: true,
        providerOrderId: response.data.order_id,
        estimatedDeliveryTime: response.data.estimated_delivery_time
          ? new Date(response.data.estimated_delivery_time)
          : null,
        deliveryFee: response.data.delivery_fee,
      };
    } catch (error) {
      this.logger.error(`Careem order creation failed: ${error.message}`, error.stack);

      return {
        success: false,
        errorMessage: error.response?.data?.message || error.message,
        errorCode: error.response?.data?.code || 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Get delivery fees estimate
   */
  async getDeliveryFees(orderDetails: Partial<OrderDetails>, branchId: string): Promise<number> {
    try {
      const url = `${this.baseUrl}getEstimatedFees/branch/${branchId}`;

      const response = await firstValueFrom(
        this.httpService.post(url, {
          delivery_address: orderDetails.deliveryAddress,
          subtotal: orderDetails.subtotal,
        }, {
          headers: { 'X-AUTH': process.env.XAUTH_TOKEN },
        })
      );

      return response.data.delivery_fee || 0;
    } catch (error) {
      this.logger.warn(`Failed to get Careem delivery fees: ${error.message}`);
      return 0;
    }
  }

  /**
   * Check order status
   */
  async checkOrderStatus(providerOrderId: string): Promise<string> {
    try {
      const url = `${this.baseUrl}checkOrderStatus/${providerOrderId}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { 'X-AUTH': process.env.XAUTH_TOKEN },
        })
      );

      return response.data.status || 'unknown';
    } catch (error) {
      this.logger.error(`Failed to check Careem order status: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: any, signature: string, secret: string): boolean {
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );
  }

  private formatAddress(address: any): string {
    if (typeof address === 'string') return address;

    return [
      address.street,
      address.building,
      address.area,
      address.city,
    ].filter(Boolean).join(', ');
  }
}
```

### 5.5 Webhook Controller

```typescript
// src/modules/delivery-integration/controllers/webhook.controller.ts

import { Controller, Post, Body, Headers, Param, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { WebhookProcessorService } from '../services/webhook-processor.service';

@Controller('delivery/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookProcessor: WebhookProcessorService,
  ) {}

  /**
   * Careem webhook endpoint
   */
  @Post('careem/:branchId')
  async handleCareemWebhook(
    @Param('branchId') branchId: string,
    @Body() payload: any,
    @Headers('x-careem-signature') signature: string,
  ) {
    this.logger.log(`Received Careem webhook for branch: ${branchId}`);

    try {
      const result = await this.webhookProcessor.processWebhook({
        provider: 'careem',
        branchId,
        payload,
        signature,
      });

      return {
        success: true,
        orderId: result.orderId,
        message: 'Order received successfully',
      };
    } catch (error) {
      this.logger.error(`Careem webhook processing failed: ${error.message}`, error.stack);

      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Talabat webhook endpoint
   */
  @Post('talabat/:branchId')
  async handleTalabatWebhook(
    @Param('branchId') branchId: string,
    @Body() payload: any,
    @Headers('x-talabat-signature') signature: string,
  ) {
    this.logger.log(`Received Talabat webhook for branch: ${branchId}`);

    try {
      const result = await this.webhookProcessor.processWebhook({
        provider: 'talabat',
        branchId,
        payload,
        signature,
      });

      return {
        success: true,
        orderId: result.orderId,
        message: 'Order received successfully',
      };
    } catch (error) {
      this.logger.error(`Talabat webhook processing failed: ${error.message}`, error.stack);

      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Generic webhook endpoint for future providers
   */
  @Post(':providerCode/:branchId')
  async handleGenericWebhook(
    @Param('providerCode') providerCode: string,
    @Param('branchId') branchId: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(`Received ${providerCode} webhook for branch: ${branchId}`);

    try {
      const signature = headers[`x-${providerCode}-signature`] || '';

      const result = await this.webhookProcessor.processWebhook({
        provider: providerCode,
        branchId,
        payload,
        signature,
      });

      return {
        success: true,
        orderId: result.orderId,
        message: 'Order received successfully',
      };
    } catch (error) {
      this.logger.error(`${providerCode} webhook processing failed: ${error.message}`, error.stack);

      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
```

### 5.6 Webhook Processor Service

```typescript
// src/modules/delivery-integration/services/webhook-processor.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CareemAdapter } from '../adapters/careem.adapter';
import { TalabatAdapter } from '../adapters/talabat.adapter';
import { OrderTransformerService } from './order-transformer.service';
import { PrintingService } from '../../printing/printing.service';

interface WebhookRequest {
  provider: string;
  branchId: string;
  payload: any;
  signature: string;
}

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);
  private readonly adapters = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly careemAdapter: CareemAdapter,
    private readonly talabatAdapter: TalabatAdapter,
    private readonly orderTransformer: OrderTransformerService,
    private readonly printingService: PrintingService,
  ) {
    // Register adapters
    this.adapters.set('careem', this.careemAdapter);
    this.adapters.set('talabat', this.talabatAdapter);
  }

  async processWebhook(request: WebhookRequest) {
    const { provider, branchId, payload, signature } = request;

    // Log webhook immediately
    const webhookLog = await this.prisma.webhookLog.create({
      data: {
        providerId: await this.getProviderId(provider),
        branchId,
        providerOrderId: payload.order_id || payload.id || 'unknown',
        method: 'POST',
        url: `/delivery/webhook/${provider}/${branchId}`,
        headers: { signature },
        requestBody: payload,
        statusCode: null,
        isProcessed: false,
      },
    });

    try {
      // Get adapter for provider
      const adapter = this.adapters.get(provider);
      if (!adapter) {
        throw new BadRequestException(`Unsupported provider: ${provider}`);
      }

      // Get branch configuration
      const branchConfig = await this.prisma.branchDeliveryConfig.findFirst({
        where: {
          branchId,
          provider: { providerCode: provider },
          isActive: true,
        },
        include: { provider: true },
      });

      if (!branchConfig) {
        throw new BadRequestException(`No active configuration for provider: ${provider} and branch: ${branchId}`);
      }

      // Validate webhook signature
      const isValid = adapter.validateWebhookSignature(
        payload,
        signature,
        branchConfig.webhookSecret,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }

      // Transform to internal order format
      const orderDetails = adapter.transformWebhookToOrder(payload);

      // Create order in database
      const order = await this.orderTransformer.createOrder({
        branchId,
        providerId: branchConfig.providerId,
        providerOrderId: payload.order_id || payload.id,
        orderDetails,
      });

      // Trigger auto-print if configured
      await this.printingService.autoPrintOrder(order.id, branchId);

      // Update webhook log as processed
      await this.prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          isProcessed: true,
          processedAt: new Date(),
          responseBody: { orderId: order.id },
          statusCode: 200,
        },
      });

      this.logger.log(`Successfully processed webhook from ${provider} for order: ${order.id}`);

      return { orderId: order.id };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);

      // Update webhook log with error
      await this.prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          errorMessage: error.message,
          retryCount: { increment: 1 },
          nextRetryAt: this.calculateNextRetry(1),
        },
      });

      // Log delivery error
      await this.prisma.deliveryErrorLog.create({
        data: {
          providerId: await this.getProviderId(provider),
          errorType: 'webhook_failed',
          errorMessage: error.message,
          errorStack: error.stack,
          requestData: payload,
          severity: 'error',
        },
      });

      throw error;
    }
  }

  private async getProviderId(providerCode: string): Promise<string> {
    const provider = await this.prisma.deliveryProvider.findUnique({
      where: { providerCode },
    });

    if (!provider) {
      throw new BadRequestException(`Unknown provider: ${providerCode}`);
    }

    return provider.id;
  }

  private calculateNextRetry(retryCount: number): Date {
    // Exponential backoff: 1min, 2min, 4min, 8min, 16min, 32min, 1hr, 2hr, 4hr, 8hr
    const delays = [1, 2, 4, 8, 16, 32, 60, 120, 240, 480]; // minutes
    const delayMinutes = delays[Math.min(retryCount, delays.length - 1)];

    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);

    return nextRetry;
  }
}
```

### 5.7 Environment Configuration

```env
# .env.example

# Database
DATABASE_URL="postgresql://postgres:E$$athecode006@localhost:5432/postgres?schema=public"

# Keycloak OAuth
KEYCLOAK_AUTHORITY="https://auth.yourdomain.com/auth/realms/restaurant"
KEYCLOAK_CLIENT_ID="restaurant-platform"
KEYCLOAK_CLIENT_SECRET="your-client-secret"

# Service-to-Service Auth
XAUTH_TOKEN="your-xauth-token-here"

# Delivery Providers
CAREEM_BASE_URL="https://integration.yourdomain.com/CareemNow/Api/"
TALABAT_BASE_URL="https://integration.yourdomain.com/Talabat/Api/"
YALLOW_BASE_URL="https://integration.yourdomain.com/Yallow/Api/"

# Integration Middleware
INTEGRATION_MIDDLEWARE_URL="https://integration.yourdomain.com/api/"

# Printer Service
PRINTER_SERVICE_URL="http://localhost:8182"

# Webhook Secrets (per provider, per branch)
CAREEM_WEBHOOK_SECRET="your-careem-secret"
TALABAT_WEBHOOK_SECRET="your-talabat-secret"
```

---

## Part 6: Deployment & Operations

### 6.1 Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed delivery providers
npx prisma db seed
```

**Seed Script:**

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed delivery providers
  const providers = [
    {
      providerCode: 'careem',
      name: { en: 'Careem Now', ar: 'كريم الآن' },
      baseUrl: 'https://integration.yourdomain.com/CareemNow/Api/',
      isActive: true,
    },
    {
      providerCode: 'talabat',
      name: { en: 'Talabat', ar: 'طلبات' },
      baseUrl: 'https://integration.yourdomain.com/Talabat/Api/',
      isActive: true,
    },
    {
      providerCode: 'yallow',
      name: { en: 'Yallow', ar: 'يالو' },
      baseUrl: 'https://integration.yourdomain.com/Yallow/Api/',
      isActive: true,
    },
  ];

  for (const provider of providers) {
    await prisma.deliveryProvider.upsert({
      where: { providerCode: provider.providerCode },
      update: provider,
      create: provider,
    });
  }

  console.log('Delivery providers seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 6.2 Background Worker for Retries

```typescript
// src/workers/webhook-retry.worker.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookProcessorService } from '../modules/delivery-integration/services/webhook-processor.service';

@Injectable()
export class WebhookRetryWorker {
  private readonly logger = new Logger(WebhookRetryWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookProcessor: WebhookProcessorService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processFailedWebhooks() {
    const failedWebhooks = await this.prisma.webhookLog.findMany({
      where: {
        isProcessed: false,
        retryCount: { lt: 10 }, // Max 10 retries
        nextRetryAt: { lte: new Date() },
      },
      include: { provider: true },
      take: 10, // Process 10 at a time
    });

    if (failedWebhooks.length === 0) {
      return;
    }

    this.logger.log(`Processing ${failedWebhooks.length} failed webhooks`);

    for (const webhook of failedWebhooks) {
      try {
        await this.webhookProcessor.processWebhook({
          provider: webhook.provider.providerCode,
          branchId: webhook.branchId,
          payload: webhook.requestBody,
          signature: webhook.headers['signature'] || '',
        });

        this.logger.log(`Successfully retried webhook: ${webhook.id}`);
      } catch (error) {
        this.logger.error(`Retry failed for webhook ${webhook.id}: ${error.message}`);
      }
    }
  }
}
```

### 6.3 Monitoring & Metrics

```typescript
// src/modules/delivery-integration/controllers/monitoring.controller.ts

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('delivery/monitoring')
export class MonitoringController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async getStats() {
    const [totalWebhooks, processedWebhooks, failedWebhooks, activeProviders] = await Promise.all([
      this.prisma.webhookLog.count(),
      this.prisma.webhookLog.count({ where: { isProcessed: true } }),
      this.prisma.webhookLog.count({ where: { isProcessed: false } }),
      this.prisma.deliveryProvider.count({ where: { isActive: true } }),
    ]);

    const successRate = totalWebhooks > 0 ? (processedWebhooks / totalWebhooks) * 100 : 0;

    return {
      totalWebhooks,
      processedWebhooks,
      failedWebhooks,
      activeProviders,
      successRate: successRate.toFixed(2),
    };
  }

  @Get('errors')
  async getRecentErrors() {
    const errors = await this.prisma.deliveryErrorLog.findMany({
      where: { isResolved: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return errors;
  }
}
```

---

## Part 7: Security Best Practices

### 7.1 Credential Management

**Use Environment Variables + Secrets Manager:**

```typescript
// src/config/secrets.config.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecretsConfig {
  constructor(private configService: ConfigService) {}

  getDatabaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL');
  }

  getKeycloakConfig() {
    return {
      authority: this.configService.get<string>('KEYCLOAK_AUTHORITY'),
      clientId: this.configService.get<string>('KEYCLOAK_CLIENT_ID'),
      clientSecret: this.configService.get<string>('KEYCLOAK_CLIENT_SECRET'),
    };
  }

  getProviderConfig(provider: string) {
    return {
      baseUrl: this.configService.get<string>(`${provider.toUpperCase()}_BASE_URL`),
      webhookSecret: this.configService.get<string>(`${provider.toUpperCase()}_WEBHOOK_SECRET`),
    };
  }

  getXAuthToken(): string {
    return this.configService.get<string>('XAUTH_TOKEN');
  }
}
```

### 7.2 Rate Limiting

```typescript
// src/modules/delivery-integration/guards/rate-limit.guard.ts

import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimiterMemory } from 'rate-limiter-flexible';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private rateLimiter = new RateLimiterMemory({
    points: 100, // 100 requests
    duration: 60, // per 60 seconds (1 minute)
  });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = request.ip || 'unknown';

    try {
      await this.rateLimiter.consume(key);
      return true;
    } catch {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
```

### 7.3 Input Sanitization

```typescript
// src/modules/delivery-integration/pipes/sanitize-webhook.pipe.ts

import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import * as DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class SanitizeWebhookPipe implements PipeTransform {
  transform(value: any) {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Invalid webhook payload');
    }

    // Sanitize string fields
    return this.sanitizeObject(value);
  }

  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = this.sanitizeObject(obj[key]);
      }
      return sanitized;
    }

    if (typeof obj === 'string') {
      return DOMPurify.sanitize(obj);
    }

    return obj;
  }
}
```

---

## Part 8: Frontend Integration Portal

### 8.1 Provider Configuration Page

```typescript
// frontend/pages/integration/providers.tsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@headlessui/react';

interface DeliveryProvider {
  id: string;
  name: { en: string; ar: string };
  providerCode: string;
  isActive: boolean;
}

export default function ProvidersPage() {
  const queryClient = useQueryClient();

  const { data: providers, isLoading } = useQuery({
    queryKey: ['delivery-providers'],
    queryFn: async () => {
      const res = await fetch('/api/delivery-integration/providers');
      return res.json();
    },
  });

  const toggleProviderMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/delivery-integration/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-providers'] });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Delivery Providers</h1>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {providers?.map((provider: DeliveryProvider) => (
            <li key={provider.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{provider.name.en}</h3>
                <p className="text-sm text-gray-500">{provider.providerCode}</p>
              </div>

              <Switch
                checked={provider.isActive}
                onChange={(checked) =>
                  toggleProviderMutation.mutate({ id: provider.id, isActive: checked })
                }
                className={`${
                  provider.isActive ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
              >
                <span className="sr-only">Enable provider</span>
                <span
                  className={`${
                    provider.isActive ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

---

## Conclusion

This blueprint provides a complete, production-ready implementation path for integrating delivery providers into Restaurant Platform v2 based on proven patterns from the Picolinate system. The architecture is scalable, maintainable, and follows industry best practices for authentication, error handling, and system design.

**Next Steps:**
1. Implement Prisma schema and run migrations
2. Create adapter implementations for each provider
3. Set up webhook endpoints with proper authentication
4. Configure background workers for retry logic
5. Build frontend integration portal
6. Set up monitoring and alerting
7. Test with provider sandbox environments

**Estimated Implementation Time:** 6-10 weeks for full deployment
