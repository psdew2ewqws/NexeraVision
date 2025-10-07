# Picolinate Delivery Provider Integration Architecture - Deep Analysis

**Analysis Date**: October 1, 2025
**Analyzed System**: Picolinate (Legacy Restaurant Platform)
**Purpose**: Understand delivery provider integration patterns for restaurant-platform-remote-v2 implementation

---

## Executive Summary

This document provides a comprehensive analysis of Picolinate's delivery provider integration architecture, examining how the legacy system handled integrations with Careem, Talabat, Uber Eats, Zomato, Deliveroo, and Jahez. The analysis reveals both successful patterns and critical mistakes to avoid in the new platform implementation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema Analysis](#database-schema-analysis)
3. [Provider Integration Patterns](#provider-integration-patterns)
4. [Webhook Handling Mechanism](#webhook-handling-mechanism)
5. [Menu Synchronization Implementation](#menu-synchronization-implementation)
6. [Authentication & Security](#authentication--security)
7. [Configuration Requirements Per Provider](#configuration-requirements-per-provider)
8. [Critical Lessons Learned](#critical-lessons-learned)
9. [Comparison with Current Platform](#comparison-with-current-platform)
10. [Recommendations](#recommendations)

---

## Architecture Overview

### System Structure

```
Picolinate Architecture:
┌─────────────────────────────────────────────────────────────────┐
│                     Laravel Middleware                           │
│                  (PHP - Central Integration Hub)                 │
│                                                                   │
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │  FoodAggregator  │    │   POS           │                  │
│  │   Controllers    │    │  Integration    │                  │
│  └──────────────────┘    └──────────────────┘                  │
│           │                       │                              │
│           ├─ Deliveroo           ├─ Foodics                    │
│           ├─ Jahez               ├─ Tabsence                   │
│           ├─ Careem              └─ Odoo                       │
│           ├─ Talabat                                            │
│           ├─ Uber Eats                                          │
│           └─ Zomato                                             │
└─────────────────────────────────────────────────────────────────┘
           │                                │
           ▼                                ▼
┌────────────────────┐           ┌────────────────────┐
│  .NET Core APIs    │           │   PostgreSQL DB    │
│  (Ordering/Menu)   │◄──────────│  (CompanyDB)       │
└────────────────────┘           └────────────────────┘
```

### Key Components

1. **Laravel Middleware**: Central integration orchestration layer
2. **.NET Core Services**: Business logic and data processing
3. **PostgreSQL Database**: Multi-tenant data storage
4. **File-based Storage**: Credentials and order caching

---

## Database Schema Analysis

### Core Integration Tables

#### 1. `food_aggrigators` Table
**Purpose**: Master registry of delivery providers

```sql
CREATE TABLE food_aggrigators (
    id UUID PRIMARY KEY,
    name JSONB,                    -- {"ar": "جاهز", "en": "Jahez"}
    data JSONB NULLABLE,           -- Provider-specific configuration
    credintial JSONB NULLABLE,     -- API keys, tokens, secrets
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULLABLE
);
```

**Key Features**:
- ✅ Multi-language support for provider names
- ✅ Flexible JSONB for provider-specific data
- ✅ Soft deletion for audit trails
- ⚠️ **CRITICAL MISTAKE**: Storing credentials in database without encryption

#### 2. `food_aggrigator_linkers` Table
**Purpose**: Company-to-provider relationship mapping

```sql
CREATE TABLE food_aggrigator_linkers (
    id UUID PRIMARY KEY,
    food_aggrigator_id UUID,       -- References food_aggrigators
    company_id UUID,               -- References companies
    credintial JSONB NULLABLE,     -- Company-specific API credentials
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULLABLE
);
```

**Key Features**:
- ✅ Multi-tenant provider configuration
- ✅ Company-specific credentials override
- ⚠️ **SECURITY ISSUE**: Credentials stored in plain JSONB

#### 3. `food_aggrigator_data` Table
**Purpose**: Branch/entity mapping to provider IDs

```sql
CREATE TABLE food_aggrigator_data (
    id UUID PRIMARY KEY,
    company_id UUID,
    connected_id UUID,              -- Internal entity ID (Branch/Company)
    connected_type VARCHAR,         -- "Branch" or "Company"
    food_aggrigator UUID,           -- Provider ID
    food_aggrigator_id VARCHAR,     -- External provider entity ID
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULLABLE
);
```

**Key Features**:
- ✅ Polymorphic entity mapping
- ✅ Bidirectional ID mapping (internal ↔ external)
- ✅ Enables multi-branch provider configurations

#### 4. `food_aggregators_orders` Table
**Purpose**: Order tracking and management

```sql
CREATE TABLE food_aggregators_orders (
    id UUID PRIMARY KEY,
    food_aggregator_id UUID,        -- Provider reference
    company_id UUID,
    branch_id UUID,
    food_aggregator_reference_id VARCHAR(200),  -- External order ID
    order_status VARCHAR DEFAULT 'Created',
    order_details JSONB,            -- Complete order payload
    ishbek_reference_id UUID NULLABLE,  -- Internal system order ID
    is_ishbek_accepted_order BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP NULLABLE
);
```

**Key Features**:
- ✅ Full order payload storage
- ✅ Bidirectional order ID mapping
- ✅ Order acceptance tracking
- ⚠️ **DESIGN ISSUE**: Status stored as string (not enum)

#### 5. `food_aggregator_sync_logs` Table
**Purpose**: Menu synchronization audit trail

```sql
CREATE TABLE food_aggregator_sync_logs (
    id UUID PRIMARY KEY,
    food_aggregator_id UUID,
    company_id UUID,
    menu_id UUID,
    sync_menu_payload JSONB,        -- Sent menu data
    sync_menu_response JSONB NULLABLE,  -- Provider response
    created_at TIMESTAMP(6),
    deleted_at TIMESTAMP(6) NULLABLE
);
```

**Key Features**:
- ✅ Complete sync history
- ✅ Request/response logging
- ✅ Debugging and audit support

#### 6. Supporting Tables

```sql
-- Order product details
food_aggregators_order_products
food_aggregators_order_products_modifer_categories
food_aggregators_order_products_modifers

-- Customer information
food_aggregators_order_customers

-- Pricing details
food_aggregators_order_discounts

-- Status tracking
food_aggregators_order_status_logs
```

---

## Provider Integration Patterns

### 1. Deliveroo Integration

**File**: `/home/admin/Downloads/Picolinate/middleware/var/www/html/app/FoodAggregator/Delivaroo.php`

#### Authentication Flow
```php
class Delivaroo {
    private $clientId;
    private $clientSecret;
    private $clinetEncoded;        // Base64 encoded credentials
    private $accessToken;
    private $expiresAt;

    // OAuth 2.0 Client Credentials Flow
    private function _getAccessToken() {
        // Check file-based token cache first
        $tokenFile = storage_path("app/credintals/{$providerId}.json");

        if (file_exists($tokenFile)) {
            $stored = json_decode(file_get_contents($tokenFile), true);
            if ($stored['expires_at'] > microtime(true)) {
                return $stored['access_token'];
            }
        }

        // Request new token
        $response = $this->process("POST",
            "{$this->OAuthHost}/oauth2/token",
            "grant_type=client_credentials",
            [
                'authorization: Basic ' . $this->clinetEncoded,
                'content-type: application/x-www-form-urlencoded'
            ]
        );

        // Cache token with expiration
        $token = [
            'access_token' => $response['response']['access_token'],
            'expires_at' => microtime(true) + $response['response']['expires_in']
        ];

        file_put_contents($tokenFile, json_encode($token));
        return $token['access_token'];
    }
}
```

**Key Learnings**:
- ✅ **Token Caching**: Reduces API calls by caching valid tokens
- ✅ **Expiration Handling**: Checks expiration before reuse
- ⚠️ **FILE-BASED STORAGE**: Security risk - tokens stored in files
- ⚠️ **NO ENCRYPTION**: Credentials and tokens unencrypted

#### Menu Synchronization
```php
public function syncMenu(Request $request) {
    $this->_getAccessToken();

    $menuPayload = $request->json()->all()[0];
    $finalMenuPayLoad = [];

    // Transform Ishbek menu format to Deliveroo format
    $finalMenuPayLoad['name'] = "THE ORGINAL MENU";
    $finalMenuPayLoad['menu']['categories'] = [];
    $finalMenuPayLoad['menu']['items'] = [];
    $finalMenuPayLoad['menu']['modifiers'] = [];

    // Map branches to site_ids
    foreach ($branches as $branch) {
        $branchSite = FoodAggrigatorData::getData($branchId, Branch::class);
        $finalMenuPayLoad["site_ids"][] = $branchSite->food_aggrigator_id;
    }

    // Transform categories
    foreach ($categories as $category) {
        $finalMenuPayLoad['menu']['categories'][] = [
            "id" => $category['id'],
            "name" => $category['name'],
            "description" => $category['description'],
            "item_ids" => $this->getCategoryItemsIds($categoryId, $products)
        ];
    }

    // Transform products
    foreach ($products as $product) {
        $finalMenuPayLoad['menu']['items'][] = [
            "id" => $product['id'],
            "name" => $product['name'],
            "description" => $product['description'],
            "price_info" => ["price" => (int)$product['price'] * 100],
            "image" => ["url" => $product['image']],
            "modifier_ids" => $this->_getFirstLevelModifireIds($productId, $questions)
        ];
    }

    // Send to Deliveroo
    $url = "{$this->APIHost}/menu/v1/brands/{$brandId}/menus/{$menuUuid}";
    $response = $this->process("PUT", $url, $finalMenuPayLoad, [
        'Authorization: Bearer ' . $this->accessToken
    ]);

    // Log sync
    $this->_syncMenuSaveLogs($menuUuid, $finalMenuPayLoad, $response);
}
```

**Key Learnings**:
- ✅ **Data Transformation**: Clear separation between internal and external formats
- ✅ **Branch Mapping**: Multi-branch menu support
- ✅ **Modifier Hierarchy**: Two-level modifier system (questions → groups)
- ✅ **Comprehensive Logging**: Full request/response logging
- ⚠️ **HARDCODED VALUES**: Menu name, default times, tax rates hardcoded
- ⚠️ **NO ERROR RECOVERY**: No retry mechanism for failed syncs

#### Webhook Handling (Order Reception)
```php
public function setOrder(Request $request) {
    // Log incoming webhook
    IncomingApiLog::create([
        'url' => $request->url(),
        'headers' => json_encode($request->headers->all()),
        'data' => json_encode($request->all())
    ]);

    $payload = $request->all();
    $orderId = $payload['body']['order']['id'];
    $event = $payload['event'];

    switch ($event) {
        case 'order.new':
            // Save order to file
            $this->_saveOrderFoodAggrigator($payload, $orderId);

            // Send to internal system
            helper::_sendCurlRequestInternally(
                "GET",
                "http://127.0.0.1:8000/api/food-aggrigator/send-order?orderid={$orderId}",
                [],
                $payload
            );

            // Acknowledge immediately
            return response()->json([
                'occurred_at' => date("Y-m-d\TH:i:s\Z"),
                'status' => 'succeeded'
            ]);

        case 'order.status_update':
            // Update order status
            $this->sendDelivarooOrderStatusSender($orderId);
            break;
    }
}
```

**Key Learnings**:
- ✅ **Immediate Acknowledgment**: Responds to webhook quickly
- ✅ **Asynchronous Processing**: Internal processing happens separately
- ✅ **File-based State Management**: Order state stored in files
- ⚠️ **LOCALHOST HARDCODING**: Internal API URL hardcoded
- ⚠️ **NO VALIDATION**: Webhook signature not verified

#### Order Status Updates
```php
public function sendDelivarooOrderStatusSender($orderId) {
    list($status, $payload, $time) = $this->_getDelivarooOrderStatus($orderId);

    $this->_getAccessToken();

    switch ($status) {
        case 'accepted':
            $url = "{$this->APIHost}/order/v1/orders/{$orderId}";
            $method = "PATCH";
            $body = [
                "status" => "accepted",
                "occurred_at" => date("Y-m-d\TH:i:s\Z")
            ];
            break;

        case 'in_kitchen':
            $url = "{$this->APIHost}/order/v1/orders/{$orderId}/prep_stage";
            $method = "POST";
            $body = [
                "status" => "in_kitchen",
                "occurred_at" => date("Y-m-d\TH:i:s\Z")
            ];
            break;

        // ... other statuses
    }

    $response = $this->process($method, $url, json_encode($body), [
        'Authorization: Bearer ' . $this->accessToken
    ]);

    return $response;
}
```

**Key Learnings**:
- ✅ **Status Mapping**: Clear mapping between internal and external statuses
- ✅ **Provider-Specific Endpoints**: Different endpoints for different statuses
- ⚠️ **STATE FROM FILES**: Order state read from filesystem

### 2. Jahez Integration

**File**: `/home/admin/Downloads/Picolinate/middleware/var/www/html/app/FoodAggregator/Jahez.php`

#### Authentication
```php
class Jahez {
    private $secret;
    private $x_api_key;
    private $accessToken;

    private function _getAuthticationToken() {
        if ($this->accessToken == "") {
            $response = $this->process("POST",
                "{$this->apiHost}/token",
                ["secret" => $this->secret],
                ['x-api-key: ' . $this->x_api_key]
            );

            if ($response['response_code'] == 200) {
                $token = $response['response']['token'];

                // Update database with token
                FoodAggrigatorLinker::find($this->foodAggrigatorData->id)
                    ->update([
                        "credintial" => [
                            "x-api-key" => $this->x_api_key,
                            "secret" => $this->secret,
                            "token" => $token
                        ]
                    ]);

                $this->accessToken = $token;
            }
        }
    }
}
```

**Key Learnings**:
- ✅ **Token Storage**: Tokens stored in database for reuse
- ⚠️ **NO EXPIRATION**: No token expiration handling
- ⚠️ **DATABASE UPDATES**: Every auth writes to database

#### Menu Upload
```php
public function syncMenu(Request $request) {
    $this->_getAuthticationToken();

    $menuPayload = $request->json()->all()[0];

    // Transform categories
    $finalMenuCategories = [];
    foreach ($categories as $category) {
        // Calculate excluded branches
        $excludeBranches = [];
        $availableBranches = $category['branches'] ?? null;

        foreach ($branches as $branch) {
            $ishbekBranch = IshbekData::where(['connected_id' => $branch->connected_id])->first();
            if (!in_array($ishbekBranch->ishbek_id, $availableBranches)) {
                $excludeBranches[] = $ishbekBranch->ishbek_id;
            }
        }

        $finalMenuCategories[] = [
            "category_id" => $category['id'],
            "name" => $category['name'],
            "index" => $category['displaynumber'],
            "exclude_branches" => $excludeBranches
        ];
    }

    // Transform products with modifiers
    $finalMenuProducts = [];
    foreach ($products as $product) {
        $modifiers = [];
        foreach ($questions as $question) {
            if ($question['productid'] == $product['id']) {
                $options = [];
                foreach ($answers as $answer) {
                    if ($answer['questionid'] == $question['id']) {
                        $options[] = [
                            "id" => $answer['id'],
                            "nameAr" => $answer['name']['ar'],
                            "nameEn" => $answer['name']['en'],
                            "price" => $answer['price']
                        ];
                    }
                }

                $modifiers[] = [
                    "id" => $question['id'],
                    "is_multiple" => $question['maximumcount'] > 1,
                    "is_radio" => $question['maximumcount'] == 1,
                    "max_option" => $question['maximumcount'],
                    "min_option" => $question['minimumcount'],
                    "name" => $question['name'],
                    "options" => $options
                ];
            }
        }

        $finalMenuProducts[] = [
            "product_id" => $product['id'],
            "product_price" => $product['price'],
            "category_id" => $product['categoryid'],
            "name" => $product['name'],
            "description" => $product['description'],
            "image_path" => $product['image'],
            "is_visible" => !$product['isdeleted'],
            "modifiers" => $modifiers,
            "availability" => [/* 7 days configuration */]
        ];
    }

    // Upload in two separate requests
    $categoriesResponse = $this->process("POST",
        "{$this->apiHost}/categories/categories_upload",
        ["categories" => $finalMenuCategories],
        [
            'x-api-key: ' . $this->x_api_key,
            'Authorization: Bearer ' . $this->accessToken
        ]
    );

    $productsResponse = $this->process("POST",
        "{$this->apiHost}/products/products_upload",
        ["products" => $finalMenuProducts],
        [
            'x-api-key: ' . $this->x_api_key,
            'Authorization: Bearer ' . $this->accessToken
        ]
    );

    return [
        "categories" => $categoriesResponse,
        "products" => $productsResponse
    ];
}
```

**Key Learnings**:
- ✅ **Branch Exclusion Logic**: Sophisticated branch availability handling
- ✅ **Separate Upload Endpoints**: Categories and products uploaded separately
- ✅ **Detailed Modifier Mapping**: Question/answer structure preserved
- ✅ **Availability Scheduling**: Full week scheduling support
- ⚠️ **HARDCODED AVAILABILITY**: Always available 00:00-23:59 all week
- ⚠️ **NO BATCH SIZE LIMITS**: Could fail with large menus

#### Order Processing
```php
public function createOrder(Request $request) {
    $orderPayload = $request->json()->all();
    $jahezOrderId = $orderPayload['jahez_id'];

    // Map to internal format
    $finalOrderArray = $this->arrangeOrderArray($orderPayload, ...);

    // Create order record
    $order = FoodAggregatorsOrders::create([
        'food_aggregator_id' => $foodAggregatorId,
        'company_id' => $integratedCompanyId,
        'branch_id' => $integratedBranchId,
        'food_aggregator_reference_id' => $jahezOrderId,
        'order_details' => $finalOrderArray
    ]);

    if ($order) {
        // Respond immediately
        response()->json(['message' => 'order created'], 200)->send();

        // Send to Ishbek asynchronously
        $this->sendOrderToIshbek($order, $finalOrderArray, ...);
    }
}

private function sendOrderToIshbek($order, $payload, ...) {
    $this->checkAuthticationIshbekToken($ishbekCompanyId, $companyId);

    $response = $this->process("POST",
        "{$this->ishbekkApiHost}/api/Order/CreateOrder/jahez",
        $payload,
        [
            'CompanyId: ' . $ishbekCompanyId,
            'Authorization: Bearer ' . $this->ishbek_access_token
        ]
    );

    if ($response['response']['code'] == 200) {
        $order->update([
            'ishbek_reference_id' => $response['response']['data'],
            'is_ishbek_accepted_order' => true
        ]);
    } else {
        // Reject order back to Jahez
        $this->process("POST",
            "{$this->apiHost}/webhooks/status_update",
            ["jahezOrderId" => $jahezOrderId, "status" => "R"],
            ['Authorization: Bearer ' . $this->accessToken]
        );
    }
}
```

**Key Learnings**:
- ✅ **Immediate Acknowledgment**: Webhook responds before processing
- ✅ **Asynchronous Processing**: Order forwarding happens after response
- ✅ **Error Handling**: Failed orders rejected back to provider
- ✅ **Dual Token Management**: Manages both Jahez and Ishbek tokens
- ⚠️ **COMPLEX TOKEN LOGIC**: Token management spread across multiple methods

### 3. Careem Integration

**File**: `/home/admin/Downloads/Picolinate/middleware/var/www/html/app/Http/Controllers/FoodAggregator/Careem.php`

```php
class Careem extends Controller {
    public function getSimulateMenu(Request $request) {
        $companyId = $request->get('companyId');
        $branchId = $request->get('branchId');

        $company = IshbekData::getData($companyId, Company::class);

        // Call internal .NET API
        $this->URL = "http://65.108.60.120:708/api/Menu/GetBranchMenuCareemmMap";
        $response = $this->process("POST",
            sprintf("%s?Branchid=%s", "", $branchId),
            [],
            ["accept: text/plain"]
        );

        return $this->sendResponse($response['response']['data'], "success");
    }
}
```

**Key Learnings**:
- ⚠️ **INCOMPLETE**: Only menu retrieval implemented
- ⚠️ **HARDCODED IP**: .NET API URL hardcoded
- ⚠️ **NO ORDER HANDLING**: Webhook handling not implemented
- ⚠️ **MINIMAL IMPLEMENTATION**: Appears to be work in progress

---

## Webhook Handling Mechanism

### Incoming Webhook Middleware

**File**: `/home/admin/Downloads/Picolinate/middleware/var/www/html/app/Http/Middleware/AuthForFoodAggrigatorWebHook.php`

```php
class AuthForFoodAggrigatorWebHook {
    public function handle(Request $request, Closure $next): Response {
        // CURRENTLY DISABLED - COMMENTED OUT
        /*
        $sequenceGuid = $request->header("x-deliveroo-sequence-guid");
        if ($sequenceGuid) {
            $hmacSha256 = $request->header("x-deliveroo-hmac-sha256");

            $webhookSecrets = [
                "r1J3oVdY7GcN17TO2fN-lPT1Zh4CR68QnQyAPccUFmRotsGPvwcv5XlDAaUzH_xaDD1x3mS2bDY72-oZm67JAQ",
                "66EB9uyPyZKXZ3o72ZIZ5zorDu9HIiCgWIxizezLxuwwCBwfFd3UTNyGGnSQSnhD7cIYT_mrssUC8F4gqcW0Eg"
            ];

            foreach ($webhookSecrets as $secret) {
                $hashed = hash_hmac("sha256", $sequenceGuid, $secret);
                if (md5($hashed) === md5($hmacSha256)) {
                    return $next($request);
                }
            }

            return response()->json(["NOT MATCH"], 401);
        }
        */

        return $next($request); // SECURITY DISABLED!
    }
}
```

**CRITICAL FINDINGS**:
- ❌ **SECURITY DISABLED**: Webhook signature validation completely commented out
- ❌ **EXPOSED SECRETS**: Webhook secrets hardcoded in middleware
- ❌ **AUTHENTICATION BYPASS**: All webhooks accepted without validation
- ⚠️ **NO RATE LIMITING**: No protection against webhook flooding

### Webhook Logging

```php
IncomingApiLog::create([
    'url' => $request->url(),
    'headers' => json_encode($request->headers->all()),
    'data' => json_encode($request->all()),
    'data_extened' => $specificId  // Order ID or reference
]);
```

**Features**:
- ✅ **Complete Request Logging**: Headers, body, URL captured
- ✅ **Extended Data Field**: Additional context storage
- ✅ **Debugging Support**: Full audit trail for troubleshooting

---

## Menu Synchronization Implementation

### Common Pattern

All providers follow similar menu sync pattern:

1. **Authenticate**: Get access token
2. **Transform**: Convert internal format to provider format
3. **Map Entities**: Link internal IDs to external IDs
4. **Upload**: Send menu to provider API
5. **Log**: Store sync payload and response

### Data Transformation Example

```php
// Internal Format (Ishbek)
{
    "branches": [
        {"id": "uuid", "name": "Branch 1"}
    ],
    "categories": [
        {
            "id": "uuid",
            "name": {"ar": "مشروبات", "en": "Beverages"},
            "isdeleted": false
        }
    ],
    "products": [
        {
            "id": "uuid",
            "categoryid": "uuid",
            "name": {"ar": "قهوة", "en": "Coffee"},
            "price": 5.50,
            "image": "https://...",
            "isdeleted": false
        }
    ],
    "question": [  // Modifier Groups
        {
            "id": "uuid",
            "productid": "uuid",
            "name": {"ar": "الحجم", "en": "Size"},
            "minimumcount": 1,
            "maximumcount": 1
        }
    ],
    "group": [  // Modifier Options
        {
            "id": "uuid",
            "questionid": "uuid",
            "name": {"ar": "كبير", "en": "Large"},
            "price": 2.00
        }
    ]
}

// Deliveroo Format
{
    "name": "THE ORGINAL MENU",
    "site_ids": ["site-123"],
    "menu": {
        "categories": [
            {
                "id": "uuid",
                "name": {"ar": "مشروبات", "en": "Beverages"},
                "description": {...},
                "item_ids": ["product-uuid"]
            }
        ],
        "items": [
            {
                "id": "uuid",
                "name": {"ar": "قهوة", "en": "Coffee"},
                "price_info": {"price": 550},  // Cents
                "image": {"url": "https://..."},
                "modifier_ids": ["modifier-uuid"]
            }
        ],
        "modifiers": [
            {
                "id": "modifier-uuid",
                "name": {"ar": "الحجم", "en": "Size"},
                "min_selection": 1,
                "max_selection": 1,
                "item_ids": ["option-uuid"]
            }
        ]
    }
}

// Jahez Format
{
    "categories": [
        {
            "category_id": "uuid",
            "name": {"ar": "مشروبات", "en": "Beverages"},
            "index": 1,
            "exclude_branches": []
        }
    ],
    "products": [
        {
            "product_id": "uuid",
            "category_id": "uuid",
            "name": {"ar": "قهوة", "en": "Coffee"},
            "product_price": 5.50,
            "image_path": "https://...",
            "is_visible": true,
            "modifiers": [
                {
                    "id": "modifier-uuid",
                    "is_multiple": false,
                    "is_radio": true,
                    "max_option": 1,
                    "min_option": 1,
                    "name": {"ar": "الحجم", "en": "Size"},
                    "options": [
                        {
                            "id": "option-uuid",
                            "nameAr": "كبير",
                            "nameEn": "Large",
                            "price": 2.00
                        }
                    ]
                }
            ],
            "availability": {
                "saturday": {
                    "is_visible": true,
                    "times": [{"start": "00:00", "end": "23:59"}]
                }
                // ... other days
            }
        }
    ]
}
```

---

## Authentication & Security

### Provider-Specific Authentication

| Provider | Auth Method | Token Storage | Expiration Handling | Security Issues |
|----------|-------------|---------------|---------------------|-----------------|
| Deliveroo | OAuth 2.0 Client Credentials | File-based | ✅ Checked before use | ⚠️ Unencrypted files |
| Jahez | API Key + Secret → Token | Database | ❌ No expiration check | ⚠️ Plain JSONB storage |
| Careem | None (WIP) | N/A | N/A | ❌ Not implemented |
| Talabat | (Not analyzed) | (Unknown) | (Unknown) | (Unknown) |

### Critical Security Issues

1. **Credential Storage**
   - ❌ Stored in plain JSONB columns
   - ❌ No encryption at rest
   - ❌ File-based token storage accessible
   - ❌ Hardcoded secrets in middleware

2. **Webhook Security**
   - ❌ Signature validation disabled
   - ❌ No request origin validation
   - ❌ No rate limiting
   - ❌ Exposed webhook secrets in code

3. **API Communication**
   - ⚠️ Hardcoded URLs and IPs
   - ⚠️ No certificate pinning
   - ⚠️ Mixed HTTP/HTTPS usage
   - ⚠️ No request signing

### Outgoing API Logging

```php
OutgoingApiLog::create([
    'url' => $url,
    'headers' => json_encode($headers),
    'request' => is_array($data) ? json_encode($data) : $data,
    'http_code' => $info['http_code'],
    'method' => $method,
    'response' => $result
]);
```

**Features**:
- ✅ Complete outgoing request logging
- ✅ Response capture
- ✅ HTTP status tracking
- ⚠️ **PERFORMANCE IMPACT**: Every API call writes to database

---

## Configuration Requirements Per Provider

### Deliveroo

**Required Credentials**:
```json
{
    "username": "client_id",
    "clientsecret": "secret_key",
    "clientencoding": "base64_encoded_credentials"
}
```

**API Endpoints**:
- OAuth: `https://auth-sandbox.developers.deliveroo.com/oauth2/token`
- Menu: `https://api-sandbox.developers.deliveroo.com/menu/v1/brands/{brandId}/menus/{menuId}`
- Orders: `https://api-sandbox.developers.deliveroo.com/order/v1/orders/{orderId}`

**Webhook Events**:
- `order.new` - New order received
- `order.status_update` - Status changed
- `order.failed` - Order processing failed

**Special Requirements**:
- OAuth 2.0 Client Credentials flow
- Token expiration: 3600 seconds
- Menu upload uses PUT (not POST)
- Prices in cents (multiply by 100)

### Jahez

**Required Credentials**:
```json
{
    "x-api-key": "api_key",
    "secret": "secret_key",
    "token": "access_token"  // Generated after auth
}
```

**API Endpoints**:
- Auth: `https://integration-api-staging.jahez.net/token`
- Categories: `https://integration-api-staging.jahez.net/categories/categories_upload`
- Products: `https://integration-api-staging.jahez.net/products/products_upload`
- Status Updates: `https://integration-api-staging.jahez.net/webhooks/status_update`

**Webhook Events**:
- Order creation webhook (endpoint not documented)
- Status update events

**Special Requirements**:
- Separate category and product upload endpoints
- Branch exclusion logic for availability
- Full week availability scheduling
- Token stored in database after first auth

### Careem (Incomplete)

**Implementation Status**:
- ❌ Menu sync only (via .NET API)
- ❌ No order handling
- ❌ No webhook processing
- ⚠️ Appears abandoned or work-in-progress

---

## Critical Lessons Learned

### ✅ What Worked Well

1. **Database Design**
   - Flexible JSONB for provider-specific data
   - Polymorphic entity mapping (`food_aggrigator_data`)
   - Multi-tenant company-provider relationships
   - Complete audit trail with sync logs

2. **Menu Transformation**
   - Clear separation of internal/external formats
   - Reusable transformation patterns
   - Multi-language support
   - Branch availability handling

3. **Async Order Processing**
   - Immediate webhook acknowledgment
   - Background order forwarding
   - State management for tracking

4. **Comprehensive Logging**
   - All incoming webhooks logged
   - All outgoing API calls logged
   - Menu sync request/response captured
   - Debugging-friendly data storage

### ❌ Critical Mistakes to Avoid

1. **Security Disasters**
   - Webhook validation completely disabled
   - Secrets hardcoded in middleware
   - Credentials stored unencrypted
   - File-based token storage
   - No rate limiting or abuse prevention

2. **Architectural Issues**
   - Hardcoded URLs and IPs throughout code
   - File-based state management (orders stored as JSON files)
   - Database writes on every API call (logging)
   - Mixed HTTP/HTTPS usage
   - Localhost API calls from middleware

3. **Code Quality Problems**
   - Inconsistent error handling
   - No retry mechanisms
   - Magic numbers and hardcoded values
   - Commented-out security code
   - Incomplete provider implementations

4. **Operational Challenges**
   - Token management scattered across multiple files
   - No centralized configuration
   - Manual credential management
   - No automatic token refresh
   - Limited monitoring capabilities

### 🎓 Key Takeaways

1. **Provider Abstraction**
   - Need unified provider interface
   - Common authentication patterns
   - Standardized webhook handling
   - Reusable transformation logic

2. **Security First**
   - Encrypted credential storage (vault or encrypted columns)
   - Proper webhook signature validation
   - Rate limiting on all endpoints
   - No hardcoded secrets

3. **Operational Excellence**
   - Centralized configuration management
   - Automatic token refresh
   - Retry mechanisms with exponential backoff
   - Health checks and monitoring

4. **Data Integrity**
   - Database transactions for critical operations
   - Proper error handling and recovery
   - Idempotent webhook processing
   - State machine for order status

---

## Comparison with Current Platform

### restaurant-platform-remote-v2 Implementation

**File**: `/home/admin/restaurant-platform-remote-v2/backend/src/modules/delivery/integrations/delivery-integration.service.ts`

```typescript
@Injectable()
export class DeliveryIntegrationService {
  private providerInstances = new Map<string, DeliveryProviderService>();

  constructor(private prisma: PrismaService) {}

  async getProviderService(providerId: string): Promise<DeliveryProviderService> {
    // Provider caching
    if (this.providerInstances.has(providerId)) {
      return this.providerInstances.get(providerId)!;
    }

    // Database configuration
    const provider = await this.prisma.deliveryProvider.findUnique({
      where: { id: providerId }
    });

    // Factory pattern
    switch (provider.name.toLowerCase()) {
      case 'dhub':
        providerService = new DHUBDeliveryService(config);
        break;
      case 'careem':
        providerService = new CareemDeliveryService(config);
        break;
      case 'talabat':
        providerService = new TalabatDeliveryService(config);
        break;
      case 'jahez':
        providerService = new JahezDeliveryService(config);
        break;
      case 'deliveroo':
        providerService = new DeliverooDeliveryService(config);
        break;
    }

    this.providerInstances.set(providerId, providerService);
    return providerService;
  }
}
```

### Advantages Over Picolinate

✅ **Better Architecture**:
- TypeScript type safety
- Provider interface abstraction
- Dependency injection
- Service caching

✅ **Cleaner Code**:
- No hardcoded values
- Consistent error handling
- Proper separation of concerns
- Testable components

### Missing from Current Platform

Based on Picolinate analysis, current platform needs:

1. **Menu Synchronization**
   - Provider-specific menu transformers
   - Branch availability mapping
   - Modifier hierarchy handling
   - Sync logging mechanism

2. **Webhook Processing**
   - Order reception webhooks
   - Status update webhooks
   - Signature validation
   - Async processing

3. **Order Management**
   - External order ID mapping
   - Status synchronization
   - Provider-specific formatting

4. **Configuration System**
   - Per-provider credentials
   - Company-provider linking
   - Branch-provider mapping

---

## Recommendations

### Immediate Actions

1. **DO NOT Copy Picolinate Security Model**
   - ❌ Never store credentials in plain JSONB
   - ❌ Never disable webhook validation
   - ❌ Never hardcode secrets in code
   - ❌ Never use file-based credential storage

2. **Implement Secure Credential Storage**
   ```typescript
   // Use encrypted columns or external vault
   import { EncryptedColumn } from '@prisma/client';

   model ProviderCredentials {
     id String @id
     providerId String
     credentials Bytes @encrypted  // Encrypted at rest
     expiresAt DateTime?
     updatedAt DateTime @updatedAt
   }
   ```

3. **Add Webhook Security Layer**
   ```typescript
   @Injectable()
   export class WebhookValidationService {
     validateSignature(
       provider: string,
       signature: string,
       payload: string,
       secret: string
     ): boolean {
       const computed = crypto
         .createHmac('sha256', secret)
         .update(payload)
         .digest('hex');
       return crypto.timingSafeEqual(
         Buffer.from(signature),
         Buffer.from(computed)
       );
     }
   }
   ```

4. **Centralize Configuration**
   ```typescript
   @Injectable()
   export class ProviderConfigService {
     async getProviderConfig(
       providerId: string,
       companyId: string
     ): Promise<ProviderConfig> {
       // Load from database
       // Decrypt credentials
       // Merge company-specific overrides
       // Return type-safe configuration
     }
   }
   ```

### Architecture Recommendations

1. **Provider Abstraction Layer**
   ```typescript
   interface DeliveryProvider {
     // Menu operations
     syncMenu(menu: InternalMenuFormat): Promise<SyncResult>;
     getMenuStatus(menuId: string): Promise<MenuStatus>;

     // Order operations
     createOrder(order: InternalOrderFormat): Promise<ExternalOrder>;
     updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
     cancelOrder(orderId: string, reason: string): Promise<void>;

     // Webhook handling
     validateWebhook(signature: string, payload: string): boolean;
     processWebhook(event: WebhookEvent): Promise<void>;
   }
   ```

2. **Menu Transformation Service**
   ```typescript
   @Injectable()
   export class MenuTransformationService {
     transform(
       menu: InternalMenu,
       provider: ProviderType
     ): ExternalMenu {
       const transformer = this.getTransformer(provider);
       return transformer.transform(menu);
     }
   }
   ```

3. **Order Synchronization Service**
   ```typescript
   @Injectable()
   export class OrderSyncService {
     async syncOrder(
       externalOrder: ExternalOrder,
       providerId: string
     ): Promise<InternalOrder> {
       // Map external IDs to internal IDs
       // Transform order structure
       // Create order in database
       // Trigger async processing
     }
   }
   ```

### Database Schema Additions

Based on Picolinate analysis, add these tables:

```prisma
model FoodAggregatorProvider {
  id            String   @id @default(uuid())
  name          Json     // {"ar": "string", "en": "string"}
  providerType  String   // 'deliveroo', 'jahez', etc.
  isActive      Boolean  @default(true)
  configuration Json?    // Provider-specific config
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
}

model CompanyProviderLink {
  id                String   @id @default(uuid())
  companyId         String
  providerId        String
  credentials       Bytes    // Encrypted credentials
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  company           Company  @relation(fields: [companyId], references: [id])
  provider          FoodAggregatorProvider @relation(fields: [providerId], references: [id])

  @@unique([companyId, providerId])
}

model ProviderEntityMapping {
  id                    String   @id @default(uuid())
  companyId             String
  providerId            String
  internalEntityId      String   // Branch or Company ID
  internalEntityType    String   // 'Branch' or 'Company'
  externalEntityId      String   // Provider's entity ID
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())

  @@unique([providerId, internalEntityId, internalEntityType])
  @@index([companyId, providerId])
}

model FoodAggregatorOrder {
  id                     String   @id @default(uuid())
  providerId             String
  companyId              String
  branchId               String
  externalOrderId        String   // Provider's order ID
  internalOrderId        String?  // Our order ID
  status                 OrderStatus
  orderDetails           Json     // Complete order payload
  isAccepted             Boolean  @default(false)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@unique([providerId, externalOrderId])
  @@index([companyId, branchId, status])
}

model MenuSyncLog {
  id                String   @id @default(uuid())
  providerId        String
  companyId         String
  menuId            String
  syncPayload       Json     // Sent data
  syncResponse      Json?    // Provider response
  status            SyncStatus
  errorMessage      String?
  createdAt         DateTime @default(now())

  @@index([companyId, providerId, status])
}

model WebhookLog {
  id              String   @id @default(uuid())
  providerId      String?
  url             String
  method          String
  headers         Json
  payload         Json
  isValid         Boolean  @default(false)
  processedAt     DateTime?
  errorMessage    String?
  createdAt       DateTime @default(now())

  @@index([providerId, createdAt])
}
```

### Implementation Priorities

**Phase 1: Foundation (Week 1-2)**
1. Secure credential storage system
2. Provider configuration management
3. Base provider interface
4. Webhook validation framework

**Phase 2: Core Integration (Week 3-4)**
1. Deliveroo integration (most complete in Picolinate)
2. Menu transformation service
3. Order synchronization
4. Webhook processing

**Phase 3: Additional Providers (Week 5-6)**
1. Jahez integration
2. Talabat integration
3. Provider-specific transformers
4. Comprehensive testing

**Phase 4: Operations (Week 7-8)**
1. Monitoring and health checks
2. Retry mechanisms
3. Admin dashboard
4. Analytics and reporting

---

## Conclusion

Picolinate's delivery provider integration implementation reveals both valuable patterns and critical mistakes:

**Successful Patterns**:
- Multi-tenant provider configuration
- Flexible entity mapping
- Comprehensive logging
- Asynchronous webhook processing

**Critical Failures**:
- Security completely compromised
- Hardcoded configurations
- File-based state management
- Incomplete implementations

The restaurant-platform-remote-v2 platform has a solid foundation with better architecture, but needs the menu synchronization, webhook handling, and configuration management capabilities demonstrated in Picolinate - implemented with proper security, type safety, and operational excellence.

**Next Steps**:
1. Review current integration implementation in disabled modules
2. Design secure credential storage system
3. Implement provider abstraction layer
4. Build menu transformation service
5. Deploy with comprehensive monitoring

---

*Analysis completed: October 1, 2025*
*Analyzed by: Claude Code Platform Analysis*
*Target platform: restaurant-platform-remote-v2*
