# Restaurant Platform Business Logic Documentation

## 📋 Overview

This document outlines the comprehensive business logic for the Restaurant Platform Enterprise system. The platform is designed as a multi-tenant SaaS solution serving restaurant chains with complex operational requirements.

## 🏗️ Core Business Domains

### 1. Company Management Domain

**Purpose:** Multi-tenant architecture with complete data isolation

**Key Entities:**
- `Company` - Restaurant brand/chain
- `License` - Subscription & feature control
- `CompanySettings` - Brand-specific configurations

**Business Rules:**
- Only Super Admins can create new companies
- Each company has complete data isolation
- License expiration automatically suspends company access
- Company deletion requires explicit confirmation and data archival

**Status Flow:**
```
trial -> active -> suspended -> archived
```

### 2. User Management Domain

**Purpose:** Role-based access control with hierarchical permissions

**Key Entities:**
- `User` - System users with roles
- `UserSession` - Active login sessions
- `UserActivityLog` - Audit trail

**Role Hierarchy:**
1. **Super Admin** - Platform-wide access
2. **Company Owner** - Full company access
3. **Branch Manager** - Branch-specific management
4. **Call Center** - Order processing
5. **Cashier** - POS operations

**Business Rules:**
- Users can only be created by higher-level roles
- Company Owners cannot create Super Admins
- Branch assignment restricts data access scope
- Failed login attempts trigger account lockout
- Session management with refresh token rotation

### 3. Menu Management Domain

**Purpose:** Multi-language product catalog with platform-specific pricing

**Key Entities:**
- `MenuCategory` - Product categories
- `MenuProduct` - Individual menu items
- `ProductImage` - Optimized product images
- `Modifier` & `ModifierCategory` - Add-ons and options

**Business Rules:**
- Multi-language support (English, Arabic, Turkish, etc.)
- Platform-specific pricing (Talabat, Careem, Website, Call Center)
- Smart preparation time calculation based on complexity
- Image optimization: Auto-resize to 1280x720, compress to ~1MB
- Priority system for delivery platform ordering

**Pricing Strategy:**
```typescript
interface PlatformPricing {
  talabat: number;
  careem: number;
  website: number;
  call_center: number;
  custom_channels: Record<string, number>;
}
```

### 4. Promotion System Domain

**Purpose:** Advanced marketing campaigns with analytics

**Key Entities:**
- `PromotionCampaign` - Marketing campaigns
- `PromotionCode` - Discount codes
- `PromotionUsage` - Usage tracking
- `PromotionAnalytics` - Performance metrics

**Campaign Types:**
1. **Percentage Discount** - Fixed percentage off
2. **Fixed Discount** - Fixed amount off
3. **Buy X Get Y** - Volume discounts
4. **Free Shipping** - Delivery fee waiver
5. **Happy Hour** - Time-based discounts
6. **Platform Exclusive** - Channel-specific offers

**Business Rules:**
- Time restrictions (day of week, time ranges)
- Platform targeting (Talabat, Careem, etc.)
- Usage limits (total and per-customer)
- Minimum order requirements
- Stackable/non-stackable promotions
- Real-time validation and application

**Analytics Tracking:**
- ROI calculation
- Customer segmentation
- Platform performance comparison
- A/B testing capabilities

### 5. Delivery Integration Domain

**Purpose:** Multi-provider delivery management with failover

**Supported Providers:**
- **Talabat** - Middle East leader
- **Careem** - Uber-backed platform
- **D-Hub** - Local delivery network
- **Jahez** - Saudi Arabia focused
- **Deliveroo** - International expansion

**Key Entities:**
- `DeliveryProvider` - Provider configurations
- `CompanyProviderConfig` - Tenant-specific settings
- `BranchProviderMapping` - Branch-provider relationships
- `DeliveryProviderOrder` - Order tracking
- `DeliveryErrorLog` - Error monitoring

**Business Rules:**
- Provider priority system for order routing
- Automatic failover on provider failures
- Real-time order status synchronization
- Provider-specific fee calculations
- Webhook processing for status updates

**Integration Features:**
- API authentication management
- Order payload transformation
- Status mapping standardization
- Error handling and retry logic
- Performance monitoring

### 6. Order Management Domain

**Purpose:** Complete order lifecycle management

**Key Entities:**
- `Order` - Customer orders
- `OrderItem` - Individual line items
- `OrderStatus` - Workflow states

**Order Lifecycle:**
```
pending -> confirmed -> preparing -> ready_for_pickup/out_for_delivery -> delivered/picked_up
```

**Business Rules:**
- Automatic order numbering
- Delivery zone validation
- Payment method restrictions
- Order modification time limits
- Cancellation policies
- Refund processing

### 7. Availability Management Domain

**Purpose:** Real-time inventory and menu availability

**Key Entities:**
- `BranchAvailability` - Item availability per branch
- `AvailabilityTemplate` - Bulk management templates
- `AvailabilityAlert` - Stock alerts
- `AvailabilityAuditLog` - Change tracking

**Business Rules:**
- Real-time stock level tracking
- Platform-specific availability
- Time-based availability schedules
- Low stock threshold alerts
- Automatic stock level updates

### 8. Print Management Domain

**Purpose:** Thermal printer integration for receipts and kitchen orders

**Key Entities:**
- `Printer` - Printer configurations
- `PrintJob` - Print queue items
- `PrintTemplate` - Receipt templates

**Business Rules:**
- Network printer discovery
- Print job queuing and prioritization
- Template customization per company
- Error handling and retry logic
- Kitchen vs. receipt printer routing

### 9. Analytics & Reporting Domain

**Purpose:** Business intelligence and performance monitoring

**Key Entities:**
- `PromotionAnalytics` - Campaign performance
- `DeliveryProviderAnalytics` - Provider metrics
- `OrderAnalytics` - Sales performance

**Metrics Tracked:**
- Revenue and profit analysis
- Customer acquisition and retention
- Menu item performance
- Delivery provider efficiency
- Promotion campaign ROI
- User activity patterns

### 10. Payment Processing Domain

**Purpose:** Multi-channel payment handling

**Supported Methods:**
- Cash on delivery
- Credit/debit cards
- Online payment gateways
- Digital wallets

**Business Rules:**
- Payment method validation
- Transaction logging
- Refund processing
- Chargeback handling
- Currency conversion

## 🔄 Cross-Domain Interactions

### Order-to-Delivery Flow
1. Order created with delivery address
2. Delivery zone identified
3. Provider selected based on priority and availability
4. Order submitted to external provider API
5. Real-time status updates via webhooks
6. Customer notifications sent
7. Analytics data recorded

### Promotion Application Flow
1. Customer enters promotion code
2. Code validation (expiry, usage limits, platform restrictions)
3. Order eligibility check (minimum amount, items)
4. Discount calculation based on campaign type
5. Usage tracking and analytics update
6. Applied discount in order total

### Menu Availability Sync
1. Stock level update triggers availability check
2. Platform-specific availability calculated
3. External provider APIs notified
4. Real-time frontend updates via WebSocket
5. Alert generation for low stock

## 📊 Key Performance Indicators (KPIs)

### Business Metrics
- **Revenue per Company** - Monthly recurring revenue
- **Order Volume** - Orders per branch per day
- **Average Order Value** - Revenue optimization
- **Customer Acquisition Cost** - Marketing efficiency
- **Promotion ROI** - Campaign effectiveness

### Technical Metrics
- **API Response Time** - < 200ms average
- **Order Processing Time** - < 5 seconds
- **Provider Integration Uptime** - > 99.9%
- **Database Query Performance** - Optimized indexing
- **Real-time Update Latency** - < 1 second

## 🚨 Critical Business Rules

### Data Integrity
- All financial calculations must be precise to 2 decimal places
- Order modifications logged for audit trail
- Price changes require approval workflow
- Customer data must be encrypted at rest

### Security Requirements
- Multi-factor authentication for admin roles
- API rate limiting per tenant
- Input sanitization for all user data
- Comprehensive audit logging

### Scalability Considerations
- Database indexing for 25k+ locations
- Horizontal scaling for high-traffic periods
- Caching strategies for frequently accessed data
- Asynchronous processing for heavy operations

---

**Last Updated:** $(date +%Y-%m-%d)  
**Version:** 2.0.0  
**Review Cycle:** Monthly