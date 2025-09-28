# Restaurant Platform API Documentation

## 🚀 API Overview

The Restaurant Platform provides a comprehensive RESTful API designed for multi-tenant restaurant management with enterprise-grade features.

**Base URL:** `https://api.restaurant-platform.com/v1`  
**Authentication:** JWT Bearer Token  
**Content-Type:** `application/json`

## 🔐 Authentication

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@company.com",
    "role": "company_owner",
    "companyId": "company-uuid",
    "branchId": "branch-uuid",
    "language": "en",
    "timezone": "Asia/Amman"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Token Refresh
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## 🏢 Company Management API

### List Companies (Super Admin Only)
```http
GET /companies?page=1&limit=20&status=active
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "data": [
    {
      "id": "company-uuid",
      "name": "Pizza Palace",
      "slug": "pizza-palace",
      "businessType": "restaurant",
      "status": "active",
      "subscriptionPlan": "premium",
      "branchCount": 5,
      "userCount": 15,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Create Company
```http
POST /companies
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "New Restaurant Chain",
  "slug": "new-restaurant-chain",
  "businessType": "restaurant",
  "timezone": "Asia/Amman",
  "defaultCurrency": "JOD"
}
```

### Get Company Details
```http
GET /companies/{companyId}?include=branches,users,licenses
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## 📱 Menu Management API

### List Menu Products
```http
GET /menu/products?page=1&limit=20&categoryId=uuid&status=1&platform=talabat
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "data": [
    {
      "id": "product-uuid",
      "name": {
        "en": "Margherita Pizza",
        "ar": "بيتزا مارجريتا"
      },
      "description": {
        "en": "Classic pizza with tomatoes, mozzarella, and basil",
        "ar": "بيتزا كلاسيكية مع الطماطم والموتزاريلا والريحان"
      },
      "basePrice": 12.50,
      "pricing": {
        "talabat": 13.00,
        "careem": 12.75,
        "website": 12.00,
        "call_center": 12.50
      },
      "preparationTime": 15,
      "priority": 1,
      "status": 1,
      "tags": ["popular", "vegetarian"],
      "images": [
        {
          "id": "image-uuid",
          "url": "https://storage.com/pizza.jpg",
          "width": 1280,
          "height": 720
        }
      ],
      "category": {
        "id": "category-uuid",
        "name": {
          "en": "Pizzas",
          "ar": "البيتزا"
        }
      }
    }
  ],
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "totalPages": 6
  }
}
```

### Create Menu Product
```http
POST /menu/products
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: multipart/form-data

{
  "name": {
    "en": "Supreme Pizza",
    "ar": "بيتزا سوبريم"
  },
  "description": {
    "en": "Pizza with all the toppings",
    "ar": "بيتزا مع جميع الإضافات"
  },
  "categoryId": "category-uuid",
  "basePrice": 15.00,
  "pricing": {
    "talabat": 16.00,
    "careem": 15.50,
    "website": 14.50,
    "call_center": 15.00
  },
  "preparationTime": 20,
  "priority": 5,
  "tags": ["popular", "meat"],
  "images": [/* File objects */]
}
```

### Update Product Availability
```http
PUT /menu/products/{productId}/availability
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "branchId": "branch-uuid",
  "isInStock": true,
  "stockLevel": 50,
  "prices": {
    "talabat": 16.00,
    "careem": 15.50
  },
  "availableFrom": "06:00",
  "availableTo": "23:30",
  "availableDays": ["monday", "tuesday", "wednesday", "thursday", "friday"]
}
```

## 🎯 Promotion System API

### List Promotion Campaigns
```http
GET /promotions/campaigns?page=1&limit=20&status=active
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "data": [
    {
      "id": "campaign-uuid",
      "name": {
        "en": "Summer Special 30% Off",
        "ar": "عرض الصيف خصم 30%"
      },
      "type": "percentage_discount",
      "status": "active",
      "priority": 1,
      "discountValue": 30.00,
      "maxDiscountAmount": 10.00,
      "minimumOrderAmount": 25.00,
      "targetPlatforms": ["talabat", "careem"],
      "startsAt": "2024-06-01T00:00:00Z",
      "endsAt": "2024-08-31T23:59:59Z",
      "currentUsageCount": 1250,
      "totalUsageLimit": 5000,
      "codes": [
        {
          "id": "code-uuid",
          "code": "SUMMER30",
          "usageCount": 1250,
          "isActive": true
        }
      ],
      "analytics": {
        "totalRevenue": 35000.00,
        "totalDiscountGiven": 8500.00,
        "uniqueCustomers": 890
      }
    }
  ]
}
```

### Create Promotion Campaign
```http
POST /promotions/campaigns
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": {
    "en": "Happy Hour 50% Off",
    "ar": "ساعة سعيدة خصم 50%"
  },
  "description": {
    "en": "50% off all pizzas during happy hours",
    "ar": "خصم 50% على جميع البيتزا في الساعات السعيدة"
  },
  "type": "percentage_discount",
  "slug": "happy-hour-50-off",
  "discountValue": 50.00,
  "maxDiscountAmount": 15.00,
  "minimumOrderAmount": 20.00,
  "targetPlatforms": ["website", "call_center"],
  "daysOfWeek": [1, 2, 3, 4, 5],
  "timeRanges": [
    {"start": "15:00", "end": "18:00"}
  ],
  "startsAt": "2024-07-01T00:00:00Z",
  "endsAt": "2024-07-31T23:59:59Z",
  "totalUsageLimit": 1000,
  "perCustomerLimit": 3,
  "codes": ["HAPPY50", "AFTERNOON50"],
  "targets": [
    {
      "targetType": "category",
      "targetId": "pizza-category-uuid"
    }
  ]
}
```

### Validate Promotion Code
```http
POST /promotions/validate
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "code": "SUMMER30",
  "orderTotal": 45.00,
  "itemsCount": 3,
  "platform": "talabat",
  "customerId": "customer-uuid",
  "customerEmail": "customer@email.com",
  "branchId": "branch-uuid",
  "productIds": ["product1-uuid", "product2-uuid"],
  "categoryIds": ["category-uuid"]
}
```

**Response:**
```json
{
  "isValid": true,
  "campaign": {
    "id": "campaign-uuid",
    "name": {
      "en": "Summer Special 30% Off"
    },
    "type": "percentage_discount",
    "discountValue": 30.00,
    "maxDiscountAmount": 10.00
  },
  "discount": {
    "amount": 10.00,
    "percentage": 22.22,
    "type": "percentage_discount"
  },
  "code": {
    "id": "code-uuid",
    "code": "SUMMER30"
  }
}
```

## 🚚 Delivery Integration API

### List Delivery Providers
```http
GET /delivery/providers?isActive=true&companyId=uuid
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Create Order with Delivery Provider
```http
POST /delivery/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "providerId": "talabat-provider-uuid",
  "branchId": "branch-uuid",
  "order": {
    "customerName": "Ahmed Ali",
    "customerPhone": "+962791234567",
    "deliveryAddress": "Amman, Jordan",
    "deliveryLat": 31.9515694,
    "deliveryLng": 35.9239625,
    "items": [
      {
        "productId": "product-uuid",
        "quantity": 2,
        "unitPrice": 15.00,
        "modifiers": []
      }
    ],
    "subtotal": 30.00,
    "deliveryFee": 3.00,
    "totalAmount": 33.00,
    "paymentMethod": "cash"
  }
}
```

### Webhook Endpoint (Provider Callbacks)
```http
POST /delivery/webhook/{providerId}
Content-Type: application/json
X-Provider-Signature: sha256=...

{
  "eventType": "order_status_updated",
  "orderId": "external-order-id",
  "status": "out_for_delivery",
  "timestamp": "2024-01-15T14:30:00Z",
  "driverInfo": {
    "name": "Driver Name",
    "phone": "+962791234567",
    "location": {
      "lat": 31.9515694,
      "lng": 35.9239625
    }
  }
}
```

## 📋 Order Management API

### List Orders
```http
GET /orders?page=1&limit=20&status=pending&branchId=uuid&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Create Order
```http
POST /orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "branchId": "branch-uuid",
  "customerName": "John Doe",
  "customerPhone": "+962791234567",
  "customerEmail": "john@email.com",
  "orderType": "delivery",
  "deliveryAddress": "Downtown Amman",
  "deliveryZoneId": "zone-uuid",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2,
      "unitPrice": 15.00,
      "modifiers": [
        {
          "modifierId": "modifier-uuid",
          "quantity": 1,
          "unitPrice": 2.00
        }
      ],
      "specialRequests": "Extra cheese"
    }
  ],
  "subtotal": 34.00,
  "deliveryFee": 3.00,
  "taxAmount": 0.00,
  "promotionCode": "SUMMER30",
  "promotionDiscount": 10.20,
  "totalAmount": 26.80,
  "paymentMethod": "card",
  "notes": "Ring the doorbell twice"
}
```

### Update Order Status
```http
PATCH /orders/{orderId}/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "status": "preparing",
  "estimatedDeliveryTime": "2024-01-15T15:30:00Z",
  "notes": "Order is being prepared"
}
```

## 📊 Analytics API

### Get Company Dashboard
```http
GET /analytics/dashboard?period=30d&branchId=uuid
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "period": "30d",
  "summary": {
    "totalRevenue": 125000.00,
    "totalOrders": 2500,
    "averageOrderValue": 50.00,
    "newCustomers": 450,
    "returningCustomers": 2050
  },
  "trends": {
    "revenueGrowth": 15.5,
    "orderGrowth": 12.3,
    "customerGrowth": 8.7
  },
  "promotions": {
    "totalCampaigns": 5,
    "activeCampaigns": 3,
    "totalDiscountGiven": 15000.00,
    "promotionROI": 3.2
  },
  "delivery": {
    "totalDeliveries": 1800,
    "averageDeliveryTime": 35,
    "deliverySuccessRate": 96.5
  },
  "topProducts": [
    {
      "productId": "product-uuid",
      "name": "Margherita Pizza",
      "totalSold": 450,
      "revenue": 5625.00
    }
  ]
}
```

### Get Promotion Analytics
```http
GET /analytics/promotions/{campaignId}?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## 🔒 Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "timestamp": "2024-01-15T10:00:00Z",
    "requestId": "req_123456789"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid input data
- `RATE_LIMITED` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error

## 🔄 Rate Limiting

API requests are rate-limited per user/IP:
- **Standard Users**: 1000 requests/hour
- **Premium Users**: 5000 requests/hour
- **Enterprise**: 10000 requests/hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## 🔐 Security Headers

All API responses include security headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

## 📝 Pagination

All list endpoints support pagination:
```http
GET /resource?page=2&limit=50&sort=createdAt&order=desc
```

**Response includes:**
```json
{
  "data": [...],
  "meta": {
    "total": 1250,
    "page": 2,
    "limit": 50,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

**API Version:** v1.0.0  
**Last Updated:** $(date +%Y-%m-%d)  
**Support:** api-support@restaurant-platform.com