# Picolinate Integration Middleware - Deep Architectural Analysis

**Document Version:** 1.0
**Analysis Date:** 2025-10-01
**Analyzed By:** Claude (System Architect)
**Source:** `/home/admin/Downloads/Picolinate/middleware`

---

## Executive Summary

The Picolinate middleware is a **Laravel-based hub-and-spoke integration platform** that acts as a bidirectional translation layer between multiple external systems (POS systems, food aggregators, delivery providers) and the Ishbek backend ecosystem. This analysis reveals production-ready patterns, critical algorithms, and architectural decisions essential for building scalable integration middleware.

### Key Architectural Patterns Discovered
1. **Polymorphic Data Mapping** (IshbekData/PosData models)
2. **Provider Strategy Pattern** with dynamic driver instantiation
3. **Webhook Signature Validation** with HMAC-SHA256
4. **Hub-and-Spoke Request Routing** algorithm
5. **Credential Token Management** with file-based caching
6. **Comprehensive Audit Trail** system
7. **Multi-tenant Request Routing** with header-based resolution

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SYSTEMS LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │   POS    │  │   Food   │  │ Delivery │  │  Webhook │          │
│  │ Systems  │  │Aggregator│  │ Provider │  │ Sources  │          │
│  │(Foodics, │  │(Deliveroo│  │  (DHUB)  │  │ (Falcon) │          │
│  │TabSence) │  │  Jahez)  │  │          │  │          │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │             │             │             │                 │
└───────┼─────────────┼─────────────┼─────────────┼─────────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              MIDDLEWARE LAYER (Laravel Application)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               AUTHENTICATION MIDDLEWARE                      │  │
│  │  • AuthForFoodAggrigatorWebHook (HMAC-SHA256)               │  │
│  │  • AuthWebhookForTesting (Logging only)                     │  │
│  │  • SecretKey-based authentication                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  ROUTING LAYER (api.php)                     │  │
│  │  • /api/aggregator/* → Food Aggregator routes               │  │
│  │  • /api/integration/* → POS Integration routes              │  │
│  │  • /api/dhub/* → Delivery Provider routes                   │  │
│  │  • /api/order/* → Order Management routes                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              CONTROLLER ORCHESTRATION LAYER                  │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐                │  │
│  │  │FoodAggrigator    │  │    Orders        │                │  │
│  │  │Controller        │  │  Controller      │                │  │
│  │  │ • init()         │  │  • init()        │                │  │
│  │  │ • createProvider│  │  • getOrders()   │                │  │
│  │  │ • syncMenu()    │  │  • setStatus()   │                │  │
│  │  └──────────────────┘  └──────────────────┘                │  │
│  │                                                              │  │
│  │  ┌──────────────────┐  ┌──────────────────┐                │  │
│  │  │   Delivery       │  │    Webhook       │                │  │
│  │  │  (DHUB)          │  │  (Falcon)        │                │  │
│  │  │ • checkTask()    │  │ • syncProducts() │                │  │
│  │  │ • createTask()   │  │ • parseProduct() │                │  │
│  │  └──────────────────┘  └──────────────────┘                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              PROVIDER DRIVER LAYER                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │  │
│  │  │ Delivaroo   │  │   Jahez     │  │    DHUB     │          │  │
│  │  │   Driver    │  │   Driver    │  │   Driver    │          │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              DATA MAPPING LAYER                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │  │
│  │  │ IshbekData  │  │  PosData    │  │FoodAggrigator│         │  │
│  │  │  (Polymorphic)  (Polymorphic) │  │Data (Linker)│         │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                       │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              AUDIT & LOGGING LAYER                           │  │
│  │  • IncomingApiLog  • OutgoingApiLog  • SyncMenuErrorLog     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ISHBEK BACKEND ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────────┤
│  • Company Management API                                          │
│  • Order Management API                                            │
│  • Menu Synchronization API                                        │
│  • Authentication Service                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Patterns

### 2.1 Polymorphic Data Mapping Pattern

**Critical Discovery:** The middleware uses Laravel's polymorphic relationships to map external IDs to internal entities without rigid foreign keys.

#### IshbekData Model (Ishbek Backend → Middleware Mapping)

```php
// File: app/Models/IshbekData.php
class IshbekData extends Model
{
    protected $fillable = [
        'ishbek_id',           // UUID from Ishbek backend
        'connected_type',      // Polymorphic: Company, Branch, Category, Product
        'connected_id',        // UUID of local entity
        'data',               // Additional metadata storage
    ];

    // Polymorphic relationship to ANY model
    public function connected()
    {
        return $this->morphTo()->withTrashed();
    }

    // Static method to resolve Ishbek ID to local entity
    public static function getData($id, $type)
    {
        return self::where('ishbek_id', $id)
                   ->where('connected_type', $type)
                   ->withTrashed()
                   ->first();
    }
}
```

**Why This Matters:**
- **Decoupled Mapping:** External system IDs never pollute internal database schema
- **Multi-System Support:** Same entity can have mappings to multiple external systems
- **Soft Delete Support:** Maintains relationship integrity even with deleted entities
- **Type Safety:** `connected_type` provides polymorphic discrimination

#### PosData Model (External POS/Aggregator → Middleware Mapping)

```php
// File: app/Models/PosData.php
class PosData extends Model
{
    protected $fillable = [
        'company_id',          // Tenant isolation
        'pos_id',             // External system's ID
        'pos',                // System identifier (foodics, jahez, etc.)
        'data',               // Parent context (for nested entities)
        'connected_type',     // Polymorphic type
        'connected_id',       // Local entity UUID
        'extend_data'         // Additional hierarchical context
    ];

    // Get entity by external POS ID
    public static function getData($id, Company $company, $type)
    {
        return self::where('pos_id', $id)
                   ->where('company_id', $company->id)
                   ->where('connected_type', $type)
                   ->first();
    }

    // Get entity with hierarchical context
    public static function getDataExtended($id, Company $company, $type, $data)
    {
        return self::where('pos_id', $id)
                   ->where('data', $data)      // Parent reference
                   ->where('company_id', $company->id)
                   ->where('connected_type', $type)
                   ->first();
    }
}
```

**Hierarchical Mapping Example:**
```
Product (POS ID: 123)
  └─ Modifier Category (POS ID: 456, data: "123")
      └─ Modifier Option (POS ID: 789, data: "456", extend_data: "123")
```

**Production Insight:** This allows tracking of deeply nested menu structures (product → modifier groups → individual modifiers) without complex join tables.

---

### 2.2 Provider Strategy Pattern with Dynamic Instantiation

**Location:** `FoodAggrigatorController::createProvider()`

#### Algorithm: Dynamic Driver Creation

```php
// File: app/Http/Controllers/FoodAggrigatorController.php
private function createProvider()
{
    // Extract provider name from aggregator metadata
    $this->company_aggrigator = $this->aggregator_data->name['en'];

    // Convert provider name to method name using StudlyCase
    // Example: "deliveroo" → "createDeliverooDriver"
    $method = 'create' . Str::studly($this->company_aggrigator) . 'Driver';

    // Dynamically call the driver creation method if it exists
    if (method_exists($this, $method)) {
        return $this->$method();
    }
}

// Provider-specific driver instantiation methods
private function createDeliverooDriver()
{
    $this->driver = new Delivaroo($this->company_data, $this->aggregator_data);
}

private function createJahezDriver()
{
    $this->driver = new Jahez($this->company_data, $this->food_aggrigator_linker_data);
}
```

**Pseudocode for Pattern:**

```
FUNCTION createProvider():
    providerName = extractProviderName(aggregatorMetadata)
    methodName = "create" + toStudlyCase(providerName) + "Driver"

    IF method_exists(this, methodName):
        CALL this[methodName]()
        RETURN driver
    ELSE:
        THROW UnsupportedProviderException
```

**Benefits:**
- **Zero Configuration:** New providers require only a new `create{Provider}Driver` method
- **Type Safety:** Each driver implements specific provider API contracts
- **Maintainability:** Provider logic isolated in dedicated classes
- **Testability:** Mock providers easily for unit testing

---

### 2.3 Hub-and-Spoke Request Routing Algorithm

**Location:** `FoodAggrigatorController::init()`

#### Multi-Header Resolution Strategy

```php
// File: app/Http/Controllers/FoodAggrigatorController.php
private function init()
{
    // STEP 1: Extract tenant context from request headers
    $ishbekCompanyId = request()->header('ishbekCompany')
                    ?? request()->header('ishbek-company');

    $ishbekFoodAggrigatorId = request()->header('ishbekFoodaggrigator')
                           ?? request()->header('ishbek-foodaggrigator');

    // STEP 2: Resolve Ishbek backend entity
    $ishbek_company = IshbekData::getData($ishbekCompanyId, Company::class);
    if (!$ishbek_company) {
        return ["message" => "the company not found", "status" => 400];
    }

    // STEP 3: Resolve food aggregator configuration
    $checkCompanyFoodAggrigator = IshbekData::getData(
        $ishbekFoodAggrigatorId,
        FoodAggrigator::class
    );
    if (!$checkCompanyFoodAggrigator) {
        return ["message" => "the Food Aggrigator not found", "status" => 400];
    }

    // STEP 4: Verify company-aggregator link exists
    $this->food_aggrigator_linker_data = FoodAggrigatorLinker::where([
        'company_id' => $this->company_data->id,
        'food_aggrigator_id' => $this->aggregator_data->id
    ])->first();

    if (!$checkFoodAggrigatorLinker) {
        return [
            "message" => "the Food Aggrigator & Company Not Link",
            "status" => 400
        ];
    }

    // STEP 5: Instantiate appropriate provider driver
    $this->createProvider();
}
```

#### Request Routing Flow Diagram

```
Incoming Request
    │
    ├─ Extract Headers
    │   ├─ ishbekCompany (or ishbek-company)
    │   └─ ishbekFoodaggrigator (or ishbek-foodaggrigator)
    │
    ├─ Resolve Company Entity
    │   ├─ IshbekData::getData($companyId, Company::class)
    │   └─ Get connected Company object
    │
    ├─ Resolve Food Aggregator Config
    │   ├─ IshbekData::getData($aggrigatorId, FoodAggrigator::class)
    │   └─ Get credentials and metadata
    │
    ├─ Verify Link Exists
    │   ├─ FoodAggrigatorLinker query
    │   └─ Ensure company authorized for this aggregator
    │
    └─ Instantiate Provider Driver
        ├─ Extract provider name
        ├─ Call create{Provider}Driver()
        └─ Return configured driver instance
```

**Production Insight:** This routing algorithm ensures:
1. **Multi-tenancy:** Each request scoped to specific company
2. **Authorization:** Verifies company-aggregator relationship
3. **Provider Isolation:** Routes to correct provider implementation
4. **Fail-Fast Validation:** Returns errors before expensive operations

---

## 3. Security & Authentication Patterns

### 3.1 Webhook Signature Validation (HMAC-SHA256)

**Location:** `AuthForFoodAggrigatorWebHook` middleware

#### HMAC Signature Verification Algorithm

```php
// File: app/Http/Middleware/AuthForFoodAggrigatorWebHook.php
public function handle(Request $request, Closure $next): Response
{
    // STEP 1: Extract Deliveroo-specific headers
    $deliverooSequenceGuid = $request->header("x-deliveroo-sequence-guid");
    $deliverooHmacSha256 = $request->header("x-deliveroo-hmac-sha256");

    if (!is_null($deliverooSequenceGuid)) {
        // STEP 2: Define webhook secrets (should be env-based in production)
        $WebhookSecrets = [
            "r1J3oVdY7GcN17TO2fN-lPT1Zh4CR68QnQyAPccUFmRotsGPvwcv5XlDAaUzH_xaDD1x3mS2bDY72-oZm67JAQ",
            "66EB9uyPyZKXZ3o72ZIZ5zorDu9HIiCgWIxizezLxuwwCBwfFd3UTNyGGnSQSnhD7cIYT_mrssUC8F4gqcW0Eg"
        ];

        // STEP 3: Verify signature against all known secrets
        $legacyPOSWebhook = false;
        foreach ($WebhookSecrets as $WebhookSecret) {
            // Compute HMAC-SHA256 hash of sequence GUID
            $hashedWebhookSecret = hash_hmac(
                "sha256",
                $deliverooSequenceGuid,
                $WebhookSecret
            );

            // Compare hashes using MD5 (timing-attack safe comparison)
            if (md5($hashedWebhookSecret) === md5($deliverooHmacSha256)) {
                return $next($request);  // Signature valid
            }
        }

        // STEP 4: Reject invalid signature
        if (!$legacyPOSWebhook) {
            return response()->json([
                "NOT MATCH",
                [
                    'hashedWebhookSecret' => $hashedWebhookSecret,
                    'deliverooSequenceGuid' => $deliverooSequenceGuid,
                    'deliverooHmacSha256' => $deliverooHmacSha256,
                ]
            ], 401);
        }
    }

    return $next($request);
}
```

#### Signature Verification Pseudocode

```
FUNCTION verifyWebhookSignature(request):
    sequenceGuid = extractHeader("x-deliveroo-sequence-guid")
    providedSignature = extractHeader("x-deliveroo-hmac-sha256")

    IF sequenceGuid IS NULL:
        RETURN PASS  // No signature required

    secrets = loadWebhookSecrets()

    FOR EACH secret IN secrets:
        computedSignature = HMAC_SHA256(sequenceGuid, secret)

        IF MD5(computedSignature) == MD5(providedSignature):
            RETURN PASS  // Signature valid

    RETURN REJECT_401  // No valid signature found
```

**Security Considerations:**
1. **Multiple Secrets:** Supports key rotation without downtime
2. **Timing-Safe Comparison:** Uses MD5 hashing for constant-time comparison
3. **Sequence GUID:** Prevents replay attacks (should verify uniqueness in production)
4. **Production Hardening:** Move secrets to environment variables/vault

---

### 3.2 API Key Authentication Pattern

**Location:** `OrdersController::init()`

```php
private function init()
{
    // Extract SecretKey from request header
    if (request()->header('SecretKey') && !(is_null(request()->header('SecretKey')))) {

        // Lookup POS integration by secret key
        $posIntegration = (new PosIntegration)->findBySecretKey(
            request()->header('SecretKey')
        );

        $companyId = $posIntegration->company_id ?? null;
        if (!$companyId) {
            return ["message" => "check SecretKey", "status" => 401];
        }

        // Load company context
        $company = Company::where('id', $companyId)->first();
        $this->company = $company;
    }
}
```

**Production Pattern:**
- **Per-Integration Keys:** Each POS integration has unique SecretKey
- **Company Association:** SecretKey maps to specific company (multi-tenancy)
- **Stateless Authentication:** No session management required
- **Revocable:** Can invalidate keys without affecting other integrations

---

## 4. Data Transformation Algorithms

### 4.1 Menu Synchronization Pipeline (Deliveroo Example)

**Location:** `Delivaroo::syncMenu()`

#### Complete Menu Transformation Algorithm

```php
// File: app/FoodAggregator/Delivaroo.php
public function syncMenu(Request $request)
{
    // PHASE 1: Extract and Normalize Input
    $menuPayLoad = $request->json()->all()[0];
    $categories = $menuPayLoad['categories'];
    $products = $menuPayLoad['products'];
    $productsQuestions = $menuPayLoad['question'];      // Modifier groups
    $productsModifiers = $menuPayLoad['group'];         // Individual modifiers

    // PHASE 2: Initialize Menu Structure
    $finalMenuPayLoad = [];
    $finalMenuPayLoad['menu']["categories"] = [];
    $finalMenuPayLoad['menu']["items"] = [];
    $finalMenuPayLoad['menu']['modifiers'] = [];
    $finalMenuPayLoad['menu']["mealtimes"] = [];

    // PHASE 3: Map Branches to Site IDs
    $branches = $menuPayLoad['branches'] ?? [];
    foreach ($branches as $branch) {
        $branchOrginalData = IshbekData::getData($branch, Branch::class);
        $branchSiteArray = FoodAggrigatorData::getdata(
            $branchOrginalData->connected_id,
            Branch::class
        );
        $finalMenuPayLoad["site_ids"][] = $branchSiteArray->food_aggrigator_id;
    }

    // PHASE 4: Transform Categories
    foreach ($categories as $category) {
        if ($category['isdeleted'] == false) {
            $finalMenuPayLoad['menu']["categories"][] = [
                "id" => $category['id'],
                "name" => $category['name'],
                "description" => $category['description'] ?? $category['name'],
                "item_ids" => $this->getCategoryItemsIds($category['id'], $products),
            ];
        }
    }

    // PHASE 5: Transform Products with Modifiers
    foreach ($products as $product) {
        $productModifiers = $this->_getFirstLevelModifireIds(
            $product['id'],
            $productsQuestions
        );

        if ($product['isdeleted'] == false) {
            $productData = [
                "id" => $product['id'],
                "name" => $product['name'],
                "description" => $product['description'],
                "price_info" => [
                    "price" => (int)$product['price'] * 100  // Convert to cents
                ],
                "image" => ["url" => $product['image']],
                "type" => "ITEM",
            ];

            // Add modifiers if present
            if ($productModifiers != []) {
                $productData["modifier_ids"] = $productModifiers;
            }

            $finalMenuPayLoad['menu']["items"][] = $productData;
        }
    }

    // PHASE 6: Build Modifier Hierarchy
    $modifiresInfo = $this->_getModifireDetails(
        $productsQuestions,
        $productsModifiers
    );
    $finalMenuPayLoad['menu']['modifiers'] = $modifiresInfo;

    // PHASE 7: Authenticate and Send to Provider
    $this->_getAccessToken();
    $url = $this->APIHost . "/menu/v1/brands/" . $brandId . "/menus/" . $menuUniqueUuid;
    $updateMenu = $this->process("PUT", $url, $finalMenuPayLoad, [
        'Authorization: Bearer ' . $this->accessToken,
    ]);

    // PHASE 8: Log Synchronization
    $this->_syncMenuSaveLogs($menuUniqueUuid, $finalMenuPayLoad, $updateMenu);

    return [$finalMenuPayLoad, $updateMenu];
}
```

#### Data Flow Diagram

```
Ishbek Menu Format
    │
    ├─ Categories: [{id, name, description, branches}]
    ├─ Products: [{id, name, price, categoryid, image, branches}]
    ├─ Questions: [{id, productid, name, min, max}] (Modifier Groups)
    └─ Groups: [{id, questionid, name, price}] (Individual Modifiers)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                 TRANSFORMATION PIPELINE                     │
├─────────────────────────────────────────────────────────────┤
│ 1. Extract & Normalize                                      │
│ 2. Map Branches → External Site IDs                         │
│ 3. Filter Deleted Items (isdeleted == false)                │
│ 4. Transform Categories → item_ids linkage                  │
│ 5. Transform Products → Price conversion (JOD → cents)      │
│ 6. Build Modifier Hierarchy → modifier_ids linkage          │
│ 7. Add Provider-Specific Metadata                           │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Deliveroo API Format
    │
    ├─ site_ids: ["uuid1", "uuid2"]
    ├─ menu:
    │   ├─ categories: [{id, name, description, item_ids}]
    │   ├─ items: [{id, name, price_info, image, modifier_ids}]
    │   ├─ modifiers: [{id, name, min_selection, max_selection, item_ids}]
    │   └─ mealtimes: [{id, name, schedule, category_ids}]
```

**Critical Transformations:**

1. **Price Conversion:**
   ```php
   "price_info" => ["price" => (int)$product['price'] * 100]
   // JOD 4.50 → 450 cents (Deliveroo requirement)
   ```

2. **Modifier Hierarchy:**
   ```php
   Product
     └─ modifier_ids: ["question1", "question2"]  // Level 1 modifiers
          └─ Modifier Groups
               └─ item_ids: ["option1", "option2"]  // Level 2 options
   ```

3. **Branch Filtering:**
   ```php
   // Only sync products available at specific branches
   if (in_array($branchId, $product['branches'])) {
       // Include in sync
   }
   ```

---

### 4.2 Order Transformation Pipeline (Jahez Example)

**Location:** `Jahez::arrangeOrderArray()`

#### Jahez → Ishbek Order Transformation

```php
// File: app/FoodAggregator/Jahez.php
private function arrangeOrderArray($orderPayload, $ishbekCompanyId, $jahezOrderId, $ishbekBranchId, $orderSource)
{
    // Extract Jahez order components
    $paymentMethod = $orderPayload['payment_method'];
    $products = $orderPayload['products'];
    $priceBeforeDiscount = $orderPayload['final_price'];
    $offer = $orderPayload['offer']['amount'];
    $finalPrice = $priceBeforeDiscount - $offer;

    // Build Ishbek-compatible order structure
    $finalOrderArray = [
        'companyid' => $ishbekCompanyId,
        'branchId' => $ishbekBranchId,
        'paymentType' => $paymentMethod,
        'ordersource' => Constants::ISHBEK_JAHEZ_UUID["ordersource"],
        'customerId' => Constants::ISHBEK_JAHEZ_UUID["customerId"],
        'deliveryType' => Constants::ISHBEK_JAHEZ_UUID["deliveryType"],
        'deliveryAddress' => Constants::ISHBEK_JAHEZ_UUID["DeliveryAddress"],
        'notes' => $orderPayload['notes'],
        'createdBy' => "jahez",
        'referenceno' => ['jahez' => $jahezOrderId],

        // Price breakdown
        'price' => [
            "deliveryPrice" => 0,
            "finalPrice" => $finalPrice,
            "subTotal" => $finalPrice,
            "subTotalBeforeDiscount" => $priceBeforeDiscount,
            "discount" => ["value" => $offer],
            "taxing" => [
                "totalTaxValue" => 0,
                "taxes" => [[
                    "taxPercentage" => 0,
                    "productTaxValue" => 0,
                ]]
            ],
        ],
    ];

    // Transform products with modifiers
    $finalProducts = [];
    foreach ($products as $product) {
        $modifiers = $product['modifiers'] ?? [];
        $finalModifiers = [];
        $finalModifiersPrice = 0;

        // Transform modifier options
        foreach ($modifiers as $modifier) {
            $finalModifiersOptions = [];
            foreach ($modifier['options'] ?? [] as $modifierOption) {
                $finalModifiersOptions[] = [
                    "id" => $modifierOption['id'],
                    "count" => $modifierOption['quantity'],
                    "priceSubTotal" => $modifierOption['final_price'],
                    "children" => []
                ];
                $finalModifiersPrice += $modifierOption['final_price'];
            }

            $finalModifiers[] = [
                "id" => $modifier['modifier_id'],
                "children" => $finalModifiersOptions,
            ];
        }

        $finalProducts[] = [
            "productId" => $product['product_id'],
            "notes" => $product['notes'],
            "count" => $product['quantity'],
            "price" => [
                "attributesSubTotal" => $finalModifiersPrice,
                "productTotal" => $product['final_price'],
                "subTotal" => $product['original_price'],
            ],
            "attributes" => $finalModifiers
        ];
    }

    $finalOrderArray['products'] = $finalProducts;
    return $finalOrderArray;
}
```

#### Order Transformation Flow

```
Jahez Order Format
├─ jahez_id: "external_order_123"
├─ branch_id: "uuid"
├─ payment_method: "CASH"
├─ final_price: 45.00
├─ offer: {amount: 5.00}
└─ products: [
     {
       product_id: "uuid",
       quantity: 2,
       original_price: 20.00,
       final_price: 18.00,
       modifiers: [{
         modifier_id: "uuid",
         options: [{id: "uuid", quantity: 1, final_price: 2.00}]
       }]
     }
   ]
    │
    ▼
┌──────────────────────────────────────────────────────┐
│          ORDER TRANSFORMATION LOGIC                  │
├──────────────────────────────────────────────────────┤
│ 1. Map External IDs to Internal UUIDs               │
│ 2. Calculate Price Breakdown                        │
│    • subTotalBeforeDiscount = final_price           │
│    • discount = offer.amount                        │
│    • finalPrice = final_price - offer.amount        │
│ 3. Transform Modifier Hierarchy                     │
│    • Flatten nested structure                       │
│    • Calculate attributesSubTotal                   │
│ 4. Add Platform-Specific Metadata                   │
│    • ordersource, customerId, deliveryType          │
│ 5. Set Reference Numbers                            │
│    • referenceno.jahez = jahez_id                   │
└──────────────────────────────────────────────────────┘
    │
    ▼
Ishbek Order Format
├─ companyid: "uuid"
├─ branchId: "uuid"
├─ ordersource: "jahez_uuid"
├─ referenceno: {jahez: "external_order_123"}
├─ price: {
│    finalPrice: 40.00,
│    subTotalBeforeDiscount: 45.00,
│    discount: {value: 5.00}
│  }
└─ products: [{
     productId: "uuid",
     count: 2,
     price: {
       attributesSubTotal: 2.00,
       productTotal: 18.00,
       subTotal: 20.00
     },
     attributes: [{id: "uuid", children: [{...}]}]
   }]
```

**Key Transformations:**

1. **Price Calculation:**
   ```php
   finalPrice = priceBeforeDiscount - offer
   ```

2. **Modifier Price Aggregation:**
   ```php
   attributesSubTotal = SUM(modifier_option.final_price)
   productTotal = original_price + attributesSubTotal - discount
   ```

3. **Reference Tracking:**
   ```php
   referenceno: {
     jahez: "external_order_id",
     // Allows bidirectional order lookup
   }
   ```

---

## 5. Token & Credential Management

### 5.1 OAuth Token Caching Strategy

**Location:** `Delivaroo::_getAccessToken()`

#### File-Based Token Cache with Expiration

```php
// File: app/FoodAggregator/Delivaroo.php
private function _getAccessToken()
{
    // STEP 1: Check file-based cache
    $storeCredintialDirectory = storage_path("app/credintals/")
                              . $this->foodAggrigatorData->id . ".json";

    if (is_file($storeCredintialDirectory)) {
        $storedCredintialData = file_get_contents($storeCredintialDirectory);
        $storedCredintialDataArray = json_decode($storedCredintialData, true);

        $storedCredintialExprationTime = $storedCredintialDataArray['expires_at'];
        $storedCredintialAccessToken = $storedCredintialDataArray['access_token'];
    } else {
        // Fallback to database credentials
        $storedCredintialExprationTime = $this->foodAggrigatorData['data']['expires_at'];
        $storedCredintialAccessToken = $this->foodAggrigatorData['data']['access_token'];
    }

    // STEP 2: Check token expiration (microtime = Unix timestamp with microseconds)
    if ($storedCredintialExprationTime > microtime(true)) {
        $this->accessToken = $storedCredintialAccessToken;
        return $storedCredintialAccessToken;
    }

    // STEP 3: Token expired → Request new token
    $responceofSendGetRequestToken = $this->sendGetRequestToken();
    return $responceofSendGetRequestToken;
}

private function sendGetRequestToken()
{
    $headers = [
        'accept: application/json',
        'authorization: Basic ' . $this->clinetEncoded,
        'content-type: application/x-www-form-urlencoded',
    ];

    $data = ["grant_type" => "client_credentials"];
    $requestUrl = $this->OAuthHost . "/oauth2/token";

    $getAccessTokenRequest = $this->process("POST", $requestUrl, $data, $headers);
    $getAccessTokenRequestResponce = $getAccessTokenRequest['response'];

    if ($getAccessTokenRequestResponce['response_code'] == 200) {
        // Calculate expiration timestamp
        $getAccessTokenRequestResponce['expires_at'] =
            microtime(true) + $getAccessTokenRequestResponce['expires_in'];

        // Update database
        $this->foodAggrigatorData->update([
            "data" => $getAccessTokenRequestResponce
        ]);

        // Save to file cache
        $this->_saveCredintialData($getAccessTokenRequestResponce);
    }

    return $getAccessTokenRequestResponce['access_token'];
}
```

#### Token Lifecycle Diagram

```
┌──────────────────────────────────────────────────────────┐
│              TOKEN LIFECYCLE MANAGEMENT                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Request Access Token                                    │
│         │                                                │
│         ▼                                                │
│  ┌─────────────────┐                                     │
│  │ Check File Cache│                                     │
│  │ storage/app/    │                                     │
│  │ credintals/     │                                     │
│  │ {provider_id}.  │                                     │
│  │ json            │                                     │
│  └────────┬────────┘                                     │
│           │                                              │
│           ├─ File Exists? ─────── NO ──────┐            │
│           │                                 │            │
│           YES                               ▼            │
│           │                        ┌────────────────┐    │
│           ▼                        │ Check Database │    │
│  ┌──────────────────┐             │  Credentials   │    │
│  │ Extract Token    │             └────────┬───────┘    │
│  │ and Expiration   │                      │            │
│  └────────┬─────────┘                      │            │
│           │                                 │            │
│           └──────────────┬──────────────────┘            │
│                          ▼                               │
│            ┌───────────────────────────┐                 │
│            │ expires_at > microtime()? │                 │
│            └───────┬───────────────────┘                 │
│                    │                                     │
│        YES ────────┼────────── NO                        │
│         │          │           │                         │
│         ▼          │           ▼                         │
│  ┌──────────┐     │    ┌─────────────────┐             │
│  │  Return  │     │    │ Request New     │             │
│  │  Cached  │     │    │ Token from OAuth│             │
│  │  Token   │     │    │ Provider        │             │
│  └──────────┘     │    └────────┬────────┘             │
│                    │             │                       │
│                    │             ▼                       │
│                    │    ┌─────────────────┐             │
│                    │    │ Calculate       │             │
│                    │    │ expires_at =    │             │
│                    │    │ now() +         │             │
│                    │    │ expires_in      │             │
│                    │    └────────┬────────┘             │
│                    │             │                       │
│                    │             ▼                       │
│                    │    ┌─────────────────┐             │
│                    │    │ Save to:        │             │
│                    │    │ 1. Database     │             │
│                    │    │ 2. File Cache   │             │
│                    │    └────────┬────────┘             │
│                    │             │                       │
│                    │             ▼                       │
│                    │    ┌─────────────────┐             │
│                    └───►│  Return Token   │             │
│                         └─────────────────┘             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Production Insights:**

1. **Dual Storage Strategy:**
   - **File Cache:** Fast read access for frequent API calls
   - **Database:** Persistent storage, backup if file deleted

2. **Expiration Calculation:**
   ```php
   expires_at = microtime(true) + expires_in
   // Stores absolute timestamp for expiration check
   ```

3. **Microtime vs. Time:**
   ```php
   microtime(true)  // 1696176234.5678 (Unix timestamp with microseconds)
   time()           // 1696176234 (Unix timestamp, integer)
   ```

**Why Microtime?** Provides sub-second precision, useful for short-lived tokens (< 1 hour).

---

### 5.2 Company-Specific Token Management (Ishbek Backend)

**Location:** `Jahez::checkAuthticationIshbekToken()`

```php
private function checkAuthticationIshbekToken($ishbekCompanyId, $integratedCompanyId)
{
    $filePath = storage_path('app/ishbek-company-token/')
              . $integratedCompanyId . ".json";

    if (is_file($filePath)) {
        $tokenFile = json_decode(file_get_contents($filePath), true);
        $expiresAt = $tokenFile['expires_at'];

        if ($expiresAt > microtime(true)) {
            $token = $tokenFile['access_token'];
        } else {
            $token = $this->getIshbekToken($integratedCompanyId);
        }
    } else {
        $token = $this->getIshbekToken($integratedCompanyId);
    }

    $this->ishbek_access_token = $token;
}

private function getIshbekToken($integratedCompanyId)
{
    // Extract company credentials from mapping
    $credintialIshbekCompany = IshbekData::where([
        'connected_id' => $integratedCompanyId
    ])->first()->data;

    $credintialIshbekCompany = json_decode($credintialIshbekCompany, true);

    // Authenticate with Ishbek backend
    $getTokenFromIshbek = $this->process(
        "POST",
        $this->ishbekkApiHost . "/api/Auth/UserLogin",
        $credintialIshbekCompany,
        ['content-type: application/json-patch+json']
    );

    if ($getTokenFromIshbek['response']['code'] == 200) {
        $accessToken = $getTokenFromIshbek['response']['data']['accessToken'];

        // Cache token with 14-day expiration
        $finalDataToken = [
            "access_token" => $accessToken,
            "expires_at" => microtime(true) + 1209600  // 14 days
        ];

        // Save to file
        $storeFileName = storage_path("app/ishbek-company-token/")
                       . $integratedCompanyId . ".json";
        file_put_contents($storeFileName, json_encode($finalDataToken));

        return $accessToken;
    }
}
```

**Per-Company Token Strategy:**
- **Filename:** `{companyId}.json` (unique per tenant)
- **Long-Lived Tokens:** 14-day expiration (1,209,600 seconds)
- **Centralized Storage:** All company tokens in `storage/app/ishbek-company-token/`

---

## 6. Audit & Logging System

### 6.1 Comprehensive Request Logging

#### IncomingApiLog Model

```php
// Every incoming webhook/API request is logged
IncomingApiLog::create([
    'url' => $request->url(),
    'headers' => json_encode($request->headers->all()),
    'data' => json_encode($request->all()),
    'request_event' => Requestevent::getUrlNameId($request),
]);
```

**Logged for:**
- All webhook endpoints (Deliveroo, Jahez, DHUB)
- POS integration requests
- Order status updates
- Menu synchronization

#### OutgoingApiLog Model

```php
// Every outgoing API call is logged (AFTER execution)
OutgoingApiLog::create([
    'url' => $url,
    'headers' => json_encode($headers),
    'request' => is_array($data) ? json_encode($data) : $data,
    "http_code" => $info['http_code'],
    "method" => $method,
    'response' => $result,
]);
```

**Logged for:**
- OAuth token requests
- Menu sync API calls
- Order forwarding to Ishbek
- Delivery provider API calls

### 6.2 Menu Sync Error Tracking

**Location:** `FalconController::syncIntegrationProductAndAttributte()`

#### Validation Error Accumulation Algorithm

```php
$validProducts = [];
$productErrors = [];

foreach ($products as $product) {
    // STEP 1: Validate product structure
    $validation = Validator::make($product, [
        "id" => ["required", "int"],
        "category_id" => ["int", "required"],
        "name" => "required|array",
        // ... extensive validation rules
    ]);

    $productsErrorsInner = [
        "type" => "product",
        "pos_id" => $product['id'],
        "name" => [
            "ar" => $product['name']['ar'] ?? $product['name']['en'],
            "en" => $product['name']['en'],
        ],
        "details" => []
    ];

    // STEP 2: Collect validation errors
    if ($validation->fails()) {
        $errors = $validation->getMessageBag()->getMessages();
        foreach ($errors as $field => $error) {
            $productsErrorsInner['details'][] = [
                "en" => "THERE IS ERROR IN " . $field,
                "ar" => "THERE IS ERROR IN " . $field,
            ];
        }
    }

    // STEP 3: Business logic validations
    list($categoryValid, $categoryReason) = $this->_validateProductCategory($product, $categories);
    list($priceValid, $priceReason) = $this->_validatePriceProduct($product);
    list($modifierValid, $modifierReason) = $this->_validateModifireProduct($product);

    // STEP 4: Aggregate results
    if ($categoryValid && $priceValid && $modifierValid && count($errors) == 0) {
        $validProducts[] = $product;  // Success
    } else {
        // Append all error reasons
        if ($modifierReason != []) $productsErrorsInner['details'][] = $modifierReason;
        if ($priceReason != []) $productsErrorsInner['details'][] = $priceReason;
        if ($categoryReason != []) $productsErrorsInner['details'][] = $categoryReason;

        $productErrors[] = $productsErrorsInner;
    }
}

// STEP 5: Save to database for UI display
SyncMenuErrorLog::updateSyncRequestDetails($this->company, $validProducts, $productErrors);
```

#### Error Log Structure

```php
// Database: sync_menu_error_logs table
[
    'company_id' => 'uuid',
    'sync_status' => false,  // Overall sync success/failure
    'target_environment' => 'production',
    'valid_items' => [
        ["type" => "product", "pos_id" => "123", "name" => ["en" => "Burger"]],
        // ... all successful items
    ],
    'error_items' => [
        [
            "type" => "product",
            "pos_id" => "456",
            "name" => ["en" => "Pizza", "ar" => "بيتزا"],
            "details" => [
                ["en" => "Product have no price for talabat", "ar" => "..."],
                ["en" => "Product Have Multiple Attributes Levels", "ar" => "..."]
            ]
        ]
    ]
]
```

**Production Usage:**
- **UI Error Display:** Frontend can query `sync_menu_error_logs` to show validation errors
- **Partial Sync:** System syncs valid items, reports failures separately
- **Multi-language Errors:** Both English and Arabic error messages

---

## 7. Delivery Provider Integration (DHUB Pattern)

### 7.1 Delivery Job Lifecycle

**Location:** `DHUB::createTask()`

#### Complete Delivery Job Creation Flow

```php
public function createTask(Request $request)
{
    // PHASE 1: Extract and Validate Input
    $branchId = $request->get("branchid") ?? $request->get("Branchid");
    $inputData = $request->json()->all();

    // PHASE 2: Resolve Branch to DHUB Branch ID
    $branchData = IshbekData::getdata($branchId, Branch::class);
    $branchInfo = $branchData->connected;
    $checkDhubBranch = Dhubdata::getdata($branchInfo->id, Branch::class);

    // PHASE 3: Get Access Token
    $companyMeta = $branchInfo->company->meta->first();
    $companyMetaArray = json_decode($companyMeta->data, true);
    $this->access_token = $companyMetaArray['access_token'];

    // PHASE 4: Build Delivery Request
    $finalRequest["tasks"][0] = [
        "taskTypeId" => 1,  // Pickup from restaurant
        "branchId" => $checkDhubBranch->dhup_id,
        "date" => date("Y-m-d H:i:s"),
    ];

    $finalRequest["tasks"][1] = [
        "taskTypeId" => 2,  // Delivery to customer
        "date" => date("Y-m-d H:i:s"),
        "amountToCollect" => $inputData['price']['FinalPrice'],
        "orderId" => (string)time(),  // Unique order ID
        "customer" => [
            "name" => $inputData['customername'],
            "phone" => $inputData['customerphoneno'],
            "latitude" => $inputData["address"]['en']['latitude'],
            "longitude" => $inputData["address"]['en']['longtitude'],
        ]
    ];

    // PHASE 5: Send to DHUB API
    $responce = $this->process("POST", self::CREATE_DELIVARY_JOB, $finalRequest, [
        'Authorization: Bearer ' . $this->access_token
    ]);

    // PHASE 6: Save Delivery Order Mapping
    if ((int)$responceCode / 100 == 2) {
        DeliveryDhubOrder::firstOrCreate([
            'ishbek_order_id' => $orderId,
            'dhup_id' => $responceBlade['data']['id'],
            'order_final_price' => $finalPrice,
            'order_net_price' => $productPrices,
            'order_delivery_price' => $productDelivaryPrice,
        ]);

        return $this->sendResponse([
            "order_id" => $orderId,
            "order_delivary_id" => $responceBlade['data']['id']
        ], "success");
    }
}
```

#### Delivery Job Flow Diagram

```
Order Created
    │
    ▼
┌────────────────────────────────────────────────────┐
│   1. Estimate Delivery Fee (checkMerchantTask)    │
│      • Request price quote from DHUB               │
│      • Return estimated fee and time               │
└─────────────────────┬──────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────┐
│   2. Create Delivery Job (createTask)              │
│      • Task 1: Pickup from restaurant branch       │
│      • Task 2: Deliver to customer location        │
│      • Attach payment collection amount            │
└─────────────────────┬──────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────┐
│   3. Save Delivery Order Mapping                   │
│      • ishbek_order_id → dhup_id                   │
│      • Track delivery status                       │
└─────────────────────┬──────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────┐
│   4. Monitor Delivery Status (getDelivaryTask)     │
│      • Poll DHUB API for status updates            │
│      • Update local database status                │
└─────────────────────┬──────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────┐
│   5. Cancel if Needed (cancelTask)                 │
│      • Send cancellation to DHUB                   │
│      • Soft delete delivery order record           │
└────────────────────────────────────────────────────┘
```

### 7.2 Delivery Fee Estimation Algorithm

**Location:** `DHUB::checkMerchantTask()`

```php
public function checkMerchantTask(Request $request)
{
    // Build delivery estimation request
    $finalRequest["tasks"][0] = [
        "taskTypeId" => 1,
        "branchId" => $checkDhubBranch->dhup_id,
        "date" => date("Y-m-d H:i:s"),
    ];

    $finalRequest["tasks"][1] = [
        "taskTypeId" => 2,
        "date" => date("Y-m-d H:i:s"),
        "customer" => [
            "name" => "Sibon",  // Placeholder
            "phone" => "22334455",
            "latitude" => $inputData['latitude'],
            "longitude" => $inputData['longitude'],
            "countryId" => Country::getBranchCountryCode($branchInfo)->country_code
        ]
    ];

    // Request delivery fee quote
    $responce = $this->process(
        "POST",
        self::VALIDATE_DELIVARY_MERCHANT_JOB,
        $finalRequest,
        ['Authorization: Bearer ' . $this->access_token]
    );

    if ((int)$responceCode / 100 == 2) {
        return $this->sendResponse([
            "code" => 200,
            "message" => "Success",
            "data" => [
                "estimated_delivery_fee" => $responceBlade['data']["merchantDeliveryCharge"]['price'] ?? 0.0,
                "estimated_delivery_time_mins" => $responceBlade['data']["merchantDeliveryCharge"]['estimationTimeInMinutes'] ?? 0.0,
            ],
        ], "success");
    }
}
```

**Key Concept:** Separation of fee estimation from job creation allows frontend to display accurate costs before order confirmation.

---

## 8. Production-Ready Patterns to Adopt

### 8.1 Polymorphic ID Mapping

**Implementation in NestJS:**

```typescript
// entities/external-mapping.entity.ts
@Entity('external_mappings')
export class ExternalMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @Column()
  externalSystem: string; // 'foodics', 'jahez', 'deliveroo'

  @Column()
  externalId: string; // External system's ID

  @Column()
  entityType: string; // 'Company', 'Branch', 'Product', 'Category'

  @Column('uuid')
  internalId: string; // Our internal UUID

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Hierarchical context

  @Index(['companyId', 'externalSystem', 'externalId', 'entityType'])
  @CreateDateColumn()
  createdAt: Date;
}

// services/mapping.service.ts
@Injectable()
export class MappingService {
  async resolveExternalId(
    companyId: string,
    externalSystem: string,
    externalId: string,
    entityType: string,
  ): Promise<string | null> {
    const mapping = await this.mappingRepo.findOne({
      where: {
        companyId,
        externalSystem,
        externalId,
        entityType,
      },
    });

    return mapping?.internalId ?? null;
  }

  async createMapping(data: CreateMappingDto): Promise<ExternalMapping> {
    return this.mappingRepo.save({
      companyId: data.companyId,
      externalSystem: data.externalSystem,
      externalId: data.externalId,
      entityType: data.entityType,
      internalId: data.internalId,
      metadata: data.metadata,
    });
  }
}
```

---

### 8.2 Provider Strategy Pattern

**Implementation in NestJS:**

```typescript
// interfaces/provider.interface.ts
export interface IIntegrationProvider {
  syncMenu(menuData: any): Promise<any>;
  createOrder(orderData: any): Promise<any>;
  updateOrderStatus(orderId: string, status: string): Promise<any>;
  authenticate(): Promise<string>; // Returns access token
}

// providers/deliveroo.provider.ts
@Injectable()
export class DeliverooProvider implements IIntegrationProvider {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async syncMenu(menuData: any): Promise<any> {
    const token = await this.authenticate();
    const transformed = this.transformMenuToDeliverooFormat(menuData);

    return this.httpService.put(
      `${this.apiHost}/menu/v1/brands/${brandId}/menus/${menuId}`,
      transformed,
      { headers: { Authorization: `Bearer ${token}` } }
    ).toPromise();
  }

  async authenticate(): Promise<string> {
    // Token caching logic
    const cached = await this.tokenCache.get(`deliveroo_token_${this.clientId}`);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.accessToken;
    }

    // Request new token
    const response = await this.httpService.post(
      `${this.oauthHost}/oauth2/token`,
      { grant_type: 'client_credentials' },
      { headers: { Authorization: `Basic ${this.encodedCredentials}` } }
    ).toPromise();

    const token = {
      accessToken: response.data.access_token,
      expiresAt: Date.now() + (response.data.expires_in * 1000),
    };

    await this.tokenCache.set(`deliveroo_token_${this.clientId}`, token, response.data.expires_in);
    return token.accessToken;
  }
}

// providers/jahez.provider.ts
@Injectable()
export class JahezProvider implements IIntegrationProvider {
  // Similar implementation for Jahez API
}

// services/provider-factory.service.ts
@Injectable()
export class ProviderFactory {
  constructor(
    private readonly deliverooProvider: DeliverooProvider,
    private readonly jahezProvider: JahezProvider,
    // ... other providers
  ) {}

  getProvider(providerName: string): IIntegrationProvider {
    const providers = {
      deliveroo: this.deliverooProvider,
      jahez: this.jahezProvider,
      // ... other providers
    };

    if (!providers[providerName]) {
      throw new UnsupportedProviderException(providerName);
    }

    return providers[providerName];
  }
}
```

---

### 8.3 Webhook Signature Verification

**Implementation in NestJS:**

```typescript
// guards/webhook-signature.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly webhookSecrets = [
    process.env.DELIVEROO_WEBHOOK_SECRET_PRIMARY,
    process.env.DELIVEROO_WEBHOOK_SECRET_SECONDARY, // Key rotation support
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const sequenceGuid = request.headers['x-deliveroo-sequence-guid'];
    const providedSignature = request.headers['x-deliveroo-hmac-sha256'];

    if (!sequenceGuid) {
      return true; // No signature required for this endpoint
    }

    for (const secret of this.webhookSecrets) {
      const computedSignature = createHmac('sha256', secret)
        .update(sequenceGuid)
        .digest('hex');

      // Timing-safe comparison
      if (this.timingSafeEqual(computedSignature, providedSignature)) {
        // TODO: Verify sequenceGuid uniqueness to prevent replay attacks
        return true;
      }
    }

    throw new UnauthorizedException('Invalid webhook signature');
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

// Usage in controller
@Controller('webhooks/deliveroo')
export class DeliverooWebhookController {
  @Post('order')
  @UseGuards(WebhookSignatureGuard)
  async handleOrderWebhook(@Body() payload: any) {
    // Process verified webhook
  }
}
```

---

### 8.4 Comprehensive Audit Logging

**Implementation in NestJS:**

```typescript
// interceptors/api-logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly incomingLogRepo: Repository<IncomingApiLog>,
    private readonly outgoingLogRepo: Repository<OutgoingApiLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Log incoming request
    const incomingLog = this.incomingLogRepo.create({
      url: request.url,
      method: request.method,
      headers: JSON.stringify(request.headers),
      body: JSON.stringify(request.body),
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return next.handle().pipe(
      tap({
        next: (response) => {
          incomingLog.responseStatusCode = context.switchToHttp().getResponse().statusCode;
          incomingLog.responseTime = Date.now() - startTime;
          incomingLog.responseBody = JSON.stringify(response);
          this.incomingLogRepo.save(incomingLog);
        },
        error: (error) => {
          incomingLog.responseStatusCode = error.status || 500;
          incomingLog.responseTime = Date.now() - startTime;
          incomingLog.errorMessage = error.message;
          this.incomingLogRepo.save(incomingLog);
        },
      }),
    );
  }
}

// entities/incoming-api-log.entity.ts
@Entity('incoming_api_logs')
export class IncomingApiLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  url: string;

  @Column()
  method: string;

  @Column({ type: 'jsonb' })
  headers: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  body: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  responseStatusCode: number;

  @Column({ nullable: true })
  responseTime: number; // milliseconds

  @Column({ type: 'jsonb', nullable: true })
  responseBody: Record<string, any>;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @Index(['url', 'createdAt'])
  @Index(['responseStatusCode', 'createdAt'])
}
```

---

## 9. Critical Algorithms Summary

### 9.1 Hub-and-Spoke Routing Algorithm

**Pseudocode:**

```
FUNCTION routeRequest(request):
    // PHASE 1: Tenant Resolution
    companyId = extractHeader("ishbekCompany") OR extractHeader("ishbek-company")
    aggregatorId = extractHeader("ishbekFoodaggrigator") OR extractHeader("ishbek-foodaggrigator")

    IF companyId IS NULL OR aggregatorId IS NULL:
        RETURN ERROR_400("Missing tenant headers")

    // PHASE 2: Entity Mapping
    company = resolveIshbekEntity(companyId, "Company")
    IF company IS NULL:
        RETURN ERROR_404("Company not found")

    aggregator = resolveIshbekEntity(aggregatorId, "FoodAggregator")
    IF aggregator IS NULL:
        RETURN ERROR_404("Food Aggregator not found")

    // PHASE 3: Authorization
    linkerExists = verifyCompanyAggregatorLink(company.id, aggregator.id)
    IF NOT linkerExists:
        RETURN ERROR_403("Company not authorized for this aggregator")

    // PHASE 4: Provider Instantiation
    providerName = aggregator.name.en  // e.g., "deliveroo", "jahez"
    driverMethod = "create" + toStudlyCase(providerName) + "Driver"

    IF method_exists(this, driverMethod):
        driver = CALL this[driverMethod]()
        RETURN driver
    ELSE:
        RETURN ERROR_501("Unsupported provider")
```

**Time Complexity:** O(1) for all database lookups (indexed queries)
**Space Complexity:** O(1) - no data structure scaling with input

---

### 9.2 Menu Transformation Pipeline

**Pseudocode:**

```
FUNCTION transformMenuToProviderFormat(ishbekMenu, providerName):
    providerFormat = {}

    // PHASE 1: Extract Components
    categories = ishbekMenu.categories
    products = ishbekMenu.products
    modifierGroups = ishbekMenu.question
    modifierOptions = ishbekMenu.group

    // PHASE 2: Transform Categories
    providerFormat.categories = []
    FOR EACH category IN categories:
        IF category.isdeleted == FALSE:
            transformedCategory = {
                id: category.id,
                name: category.name,
                itemIds: getProductIdsByCategoryId(category.id, products)
            }
            providerFormat.categories.APPEND(transformedCategory)

    // PHASE 3: Transform Products
    providerFormat.items = []
    FOR EACH product IN products:
        IF product.isdeleted == FALSE:
            modifierIds = getModifierGroupIdsByProductId(product.id, modifierGroups)

            transformedProduct = {
                id: product.id,
                name: product.name,
                price: convertPrice(product.price, providerName),  // Provider-specific conversion
                image: product.image,
                modifierIds: modifierIds
            }
            providerFormat.items.APPEND(transformedProduct)

    // PHASE 4: Build Modifier Hierarchy
    providerFormat.modifiers = []
    FOR EACH modifierGroup IN modifierGroups:
        IF modifierGroup.isdeleted == FALSE:
            optionIds = getOptionIdsByGroupId(modifierGroup.id, modifierOptions)

            transformedGroup = {
                id: modifierGroup.id,
                name: modifierGroup.name,
                minSelection: modifierGroup.minimumcount,
                maxSelection: modifierGroup.maximumcount,
                itemIds: optionIds
            }
            providerFormat.modifiers.APPEND(transformedGroup)

    // PHASE 5: Add Provider Metadata
    providerFormat = addProviderSpecificMetadata(providerFormat, providerName)

    RETURN providerFormat
```

**Time Complexity:** O(C + P + M + O) where:
- C = number of categories
- P = number of products
- M = number of modifier groups
- O = number of modifier options

**Space Complexity:** O(C + P + M + O) - output size proportional to input

---

### 9.3 Order Transformation Algorithm

**Pseudocode:**

```
FUNCTION transformOrderToIshbekFormat(providerOrder, providerName):
    ishbekOrder = {}

    // PHASE 1: Resolve Tenant Context
    ishbekOrder.companyId = resolveCompanyId(providerOrder.branchId)
    ishbekOrder.branchId = resolveBranchId(providerOrder.branchId)
    ishbekOrder.orderSource = getOrderSourceConstant(providerName)

    // PHASE 2: Transform Pricing
    ishbekOrder.price = {
        finalPrice: providerOrder.finalPrice - providerOrder.discount,
        subTotalBeforeDiscount: providerOrder.finalPrice,
        discount: { value: providerOrder.discount },
        deliveryPrice: providerOrder.deliveryFee OR 0,
        taxing: calculateTaxBreakdown(providerOrder)
    }

    // PHASE 3: Transform Products
    ishbekOrder.products = []
    FOR EACH providerProduct IN providerOrder.products:
        // Calculate modifier prices
        modifierSubTotal = 0
        transformedModifiers = []

        FOR EACH modifier IN providerProduct.modifiers:
            transformedOptions = []
            FOR EACH option IN modifier.options:
                transformedOptions.APPEND({
                    id: option.id,
                    count: option.quantity,
                    priceSubTotal: option.price
                })
                modifierSubTotal += option.price

            transformedModifiers.APPEND({
                id: modifier.id,
                children: transformedOptions
            })

        // Build product object
        ishbekProduct = {
            productId: resolveProductId(providerProduct.id),
            count: providerProduct.quantity,
            notes: providerProduct.notes,
            price: {
                attributesSubTotal: modifierSubTotal,
                productTotal: providerProduct.finalPrice,
                subTotal: providerProduct.originalPrice,
                tax: calculateProductTax(providerProduct)
            },
            attributes: transformedModifiers
        }

        ishbekOrder.products.APPEND(ishbekProduct)

    // PHASE 4: Add Reference Numbers
    ishbekOrder.referenceno = {
        [providerName]: providerOrder.externalOrderId
    }

    RETURN ishbekOrder
```

**Time Complexity:** O(P × M × O) where:
- P = number of products
- M = average modifiers per product
- O = average options per modifier

**Space Complexity:** O(P × M × O)

---

## 10. Database Schema Insights

### 10.1 Polymorphic Mapping Tables

```sql
-- IshbekData Table (Ishbek Backend Mapping)
CREATE TABLE ishbek_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ishbek_id UUID NOT NULL,                 -- External Ishbek ID
    connected_type VARCHAR(255) NOT NULL,    -- Polymorphic type (Company, Branch, etc.)
    connected_id UUID NOT NULL,              -- Internal entity UUID
    data JSONB,                              -- Additional metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,                    -- Soft delete support

    UNIQUE(ishbek_id, connected_type),
    INDEX idx_ishbek_lookup (ishbek_id, connected_type),
    INDEX idx_connected (connected_type, connected_id)
);

-- PosData Table (External System Mapping)
CREATE TABLE pos_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,                -- Tenant isolation
    pos VARCHAR(50) NOT NULL,                -- System name (foodics, jahez, etc.)
    pos_id VARCHAR(255) NOT NULL,            -- External system's ID
    connected_type VARCHAR(255) NOT NULL,    -- Polymorphic type
    connected_id UUID NOT NULL,              -- Internal entity UUID
    data VARCHAR(255),                       -- Parent reference for hierarchy
    extend_data VARCHAR(255),                -- Grandparent reference
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,

    UNIQUE(company_id, pos, pos_id, connected_type),
    INDEX idx_pos_lookup (company_id, pos, pos_id, connected_type),
    INDEX idx_hierarchical (company_id, pos, data, extend_data)
);

-- FoodAggregatorLinker Table (Company-Aggregator Authorization)
CREATE TABLE food_aggrigator_linkers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    food_aggrigator_id UUID NOT NULL,
    credintial JSONB NOT NULL,               -- OAuth tokens, API keys
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, food_aggrigator_id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (food_aggrigator_id) REFERENCES food_aggrigators(id)
);
```

### 10.2 Audit Log Tables

```sql
-- Incoming API Logs
CREATE TABLE incoming_api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    headers JSONB,
    data JSONB,
    request_event_id UUID,                   -- Categorization
    response_status_code INT,
    response_body JSONB,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_url_date (url, created_at),
    INDEX idx_status_date (response_status_code, created_at)
);

-- Outgoing API Logs
CREATE TABLE outgoing_api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    method VARCHAR(10) NOT NULL,
    headers JSONB,
    request JSONB,
    http_code INT,
    response JSONB,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_url_date (url, created_at),
    INDEX idx_http_code_date (http_code, created_at)
);

-- Menu Sync Error Logs
CREATE TABLE sync_menu_error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    sync_status BOOLEAN DEFAULT FALSE,
    target_environment VARCHAR(50),          -- 'production', 'uat'
    valid_items JSONB,                       -- Successfully synced items
    error_items JSONB,                       -- Failed items with reasons
    created_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (company_id) REFERENCES companies(id),
    INDEX idx_company_date (company_id, created_at)
);
```

---

## 11. Production Deployment Considerations

### 11.1 Security Hardening

**Recommendations:**

1. **Move Secrets to Environment/Vault:**
   ```php
   // CURRENT (Hardcoded)
   $WebhookSecrets = [
       "r1J3oVdY7GcN17TO2fN-lPT1Zh4CR68QnQyAPccUFmRotsGPvwcv5XlDAaUzH_xaDD1x3mS2bDY72-oZm67JAQ",
   ];

   // PRODUCTION
   $WebhookSecrets = [
       env('DELIVEROO_WEBHOOK_SECRET_PRIMARY'),
       env('DELIVEROO_WEBHOOK_SECRET_SECONDARY'),
   ];
   ```

2. **Implement Replay Attack Prevention:**
   ```php
   // Store used sequence GUIDs in Redis with expiration
   if (Cache::has("webhook_guid:{$sequenceGuid}")) {
       return response()->json(['error' => 'Duplicate request'], 409);
   }
   Cache::put("webhook_guid:{$sequenceGuid}", true, 600); // 10 min TTL
   ```

3. **Add Rate Limiting per Tenant:**
   ```php
   // Apply rate limiting based on company_id
   RateLimiter::for('webhook', function (Request $request) {
       return Limit::perMinute(100)->by($request->header('ishbekCompany'));
   });
   ```

4. **Enable HTTPS Only:**
   ```php
   // Middleware to enforce HTTPS
   if (!$request->secure()) {
       return redirect()->secure($request->getRequestUri());
   }
   ```

---

### 11.2 Performance Optimization

**Recommendations:**

1. **Database Connection Pooling:**
   ```yaml
   # config/database.php
   'connections' => [
       'pgsql' => [
           'pool' => [
               'min' => 2,
               'max' => 10,
           ],
       ],
   ],
   ```

2. **Cache Frequently Accessed Mappings:**
   ```php
   // Cache external ID mappings
   $cacheKey = "mapping:{$externalSystem}:{$externalId}:{$entityType}";
   return Cache::remember($cacheKey, 3600, function () use ($externalId) {
       return IshbekData::getData($externalId, Company::class);
   });
   ```

3. **Async Order Processing:**
   ```php
   // Queue order forwarding instead of synchronous processing
   dispatch(new ForwardOrderToIshbek($orderData))->onQueue('orders');
   ```

4. **Batch Menu Sync Operations:**
   ```php
   // Use database transactions for menu sync
   DB::transaction(function () use ($products) {
       foreach ($products as $product) {
           // Batch insert/update operations
       }
   });
   ```

---

### 11.3 Monitoring & Alerting

**Recommendations:**

1. **Track Key Metrics:**
   - Webhook processing time (P50, P95, P99)
   - Menu sync success rate
   - Order forwarding success rate
   - Token refresh failures

2. **Alert on Anomalies:**
   - Sudden increase in failed webhook signatures
   - Menu sync error rate > 5%
   - Order creation failures > 1%
   - Delivery API 5xx errors

3. **Logging Best Practices:**
   ```php
   // Add correlation IDs to logs
   $correlationId = Str::uuid();
   Log::info('Order received', [
       'correlation_id' => $correlationId,
       'order_id' => $orderId,
       'provider' => $providerName,
   ]);
   ```

---

## 12. Key Takeaways for New Platform

### 12.1 Must-Implement Patterns

1. **Polymorphic Data Mapping**
   - Avoid foreign keys to external systems
   - Use mapping tables with `(external_system, external_id, entity_type)` composite keys
   - Support hierarchical context with `data` and `extend_data` fields

2. **Provider Strategy with Dynamic Routing**
   - Abstract provider-specific logic behind common interface
   - Use factory pattern for provider instantiation
   - Support multiple versions of same provider API

3. **Comprehensive Audit Trail**
   - Log ALL incoming and outgoing API calls
   - Store request/response payloads for debugging
   - Index logs by timestamp, URL, and status code

4. **Webhook Signature Verification**
   - Implement HMAC-SHA256 verification
   - Support multiple secrets for key rotation
   - Prevent replay attacks with sequence ID tracking

5. **Token Management with Caching**
   - Cache access tokens with expiration
   - Support per-company and per-provider tokens
   - Implement automatic token refresh on expiration

### 12.2 Avoid These Pitfalls

1. **Hardcoded Credentials:** Always use environment variables
2. **Synchronous Processing:** Queue long-running operations
3. **Missing Validation:** Validate ALL webhook payloads
4. **No Rollback Strategy:** Implement compensation logic for failed syncs
5. **Tight Coupling:** Keep provider logic isolated from core business logic

---

## 13. Conclusion

The Picolinate middleware demonstrates production-grade patterns for building integration platforms:

- **Scalable Architecture:** Hub-and-spoke routing supports unlimited providers
- **Multi-Tenancy:** Company-scoped operations with authorization checks
- **Data Integrity:** Polymorphic mapping preserves referential integrity
- **Auditability:** Complete request/response logging for debugging
- **Security:** HMAC signature verification and token management
- **Maintainability:** Strategy pattern isolates provider-specific logic

**Critical Algorithms Extracted:**
1. Hub-and-Spoke Request Routing
2. Polymorphic ID Resolution
3. Menu Transformation Pipeline
4. Order Transformation Pipeline
5. Token Caching Strategy
6. Webhook Signature Verification
7. Error Accumulation System

**Next Steps:**
Implement these patterns in the NEXARA integration platform using NestJS, adapting the polymorphic mapping strategy for TypeORM and implementing provider factories with dependency injection.

---

**Document End**
