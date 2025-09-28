# Picolinate Key Implementation Details

## Critical Implementation Insights from Picolinate Analysis

### 1. Multi-Platform Authentication Architecture

#### OAuth2 + API Key Hybrid System
```php
// Deliveroo: OAuth2 Client Credentials
private function sendGetRequestToken() {
    $headers = [
        'authorization: Basic ' . $this->clinetEncoded,
        'content-type: application/x-www-form-urlencoded'
    ];
    $data = ["grant_type" => "client_credentials"];

    // Token caching with file system fallback
    $storeCredintialDirectory = storage_path("app/credintals/" . $this->foodAggrigatorData->id . ".json");
    if ($getAccessTokenRequestResponceCode == 200) {
        $getAccessTokenRequestResponce['expires_at'] = microtime(true) + $getAccessTokenRequestResponce['expires_in'];
        $this->_saveCredintialData($getAccessTokenRequestResponce);
    }
}

// Jahez: X-API-Key + Secret Token
private function _getAuthticationToken() {
    $getAuthRequestBody = ["secret" => $this->secret];
    $getAuthRequestHeaders = [
        'x-api-key: ' . $this->x_api_key,
        'Content-Type: application/json'
    ];

    // Database credential storage with auto-refresh
    $foodAggrigatorObject->update([
        "credintial" => [
            "x-api-key" => $this->x_api_key,
            "secret" => $this->secret,
            "token" => $token,
        ]
    ]);
}
```

### 2. Universal Menu Data Transformation

#### Core Menu Structure
```php
// Standard Ishbek Format (Input from POS)
$ishbekMenuFormat = [
    'categories' => [
        'id' => 'uuid',
        'name' => ['ar' => 'string', 'en' => 'string'],
        'description' => ['ar' => 'string', 'en' => 'string'],
        'isdeleted' => 'boolean',
        'branches' => [] // Branch-specific availability
    ],
    'products' => [
        'id' => 'uuid',
        'name' => ['ar' => 'string', 'en' => 'string'],
        'description' => ['ar' => 'string', 'en' => 'string'],
        'price' => 'decimal',
        'image' => 'url',
        'categoryid' => 'uuid',
        'isdeleted' => 'boolean',
        'isavailable' => 'boolean'
    ],
    'question' => [ // Modifier groups
        'id' => 'uuid',
        'productid' => 'uuid',
        'name' => ['ar' => 'string', 'en' => 'string'],
        'minimumcount' => 'integer',
        'maximumcount' => 'integer'
    ],
    'group' => [ // Modifier options
        'id' => 'uuid',
        'questionid' => 'uuid',
        'name' => ['ar' => 'string', 'en' => 'string'],
        'price' => 'decimal'
    ]
];

// Platform-Specific Transformations

// Deliveroo Format
$deliverooFormat = [
    'name' => "THE ORGINAL MENU",
    'menu' => [
        'categories' => [
            'id' => 'string',
            'name' => 'string',
            'description' => 'string',
            'item_ids' => []
        ],
        'items' => [
            'id' => 'string',
            'name' => 'string',
            'description' => 'string',
            'price_info' => ['price' => 'integer'], // Price in cents
            'modifier_ids' => [],
            'type' => 'ITEM',
            'plu' => 'JOD',
            'tax_rate' => '0'
        ],
        'modifiers' => [
            'id' => 'string',
            'name' => 'string',
            'min_selection' => 'integer',
            'max_selection' => 'integer',
            'item_ids' => []
        ],
        'mealtimes' => [
            'id' => 'uuid',
            'name' => ['ar' => 'string', 'en' => 'string'],
            'schedule' => [
                'day_of_week' => 'integer', // 0-6
                'time_periods' => [
                    ['start' => 'HH:MM', 'end' => 'HH:MM']
                ]
            ]
        ]
    ],
    'site_ids' => [] // Branch mappings
];

// Jahez Format
$jahezFormat = [
    'categories' => [
        'category_id' => 'string',
        'name' => ['ar' => 'string', 'en' => 'string'],
        'index' => 'integer',
        'exclude_branches' => []
    ],
    'products' => [
        'product_id' => 'string',
        'product_price' => 'decimal',
        'category_id' => 'string',
        'name' => ['ar' => 'string', 'en' => 'string'],
        'description' => ['ar' => 'string', 'en' => 'string'],
        'exclude_branches' => [],
        'image_path' => 'url',
        'index' => 'integer',
        'calories' => 'integer',
        'is_visible' => 'boolean',
        'modifiers' => [
            'id' => 'string',
            'is_multiple' => 'boolean',
            'is_radio' => 'boolean',
            'max_option' => 'integer',
            'min_option' => 'integer',
            'name' => ['ar' => 'string', 'en' => 'string'],
            'options' => [
                'id' => 'string',
                'nameAr' => 'string',
                'nameEn' => 'string',
                'price' => 'decimal',
                'calories' => 'integer'
            ]
        ],
        'availability' => [
            'monday' => [
                'is_visible' => 'boolean',
                'times' => [['start' => 'HH:MM', 'end' => 'HH:MM']]
            ]
            // ... for all days
        ]
    ]
];
```

### 3. Order Processing Pipeline

#### Universal Order Flow
```php
// 1. Order Reception (Webhook Handler)
public function setOrder(Request $request) {
    $setOrderData = $request->json()->all();
    $orderEvent = $setOrderData['event'];
    $orderStatus = $setOrderData['body']['order']['status'];

    switch ($orderEvent) {
        case 'order.new':
            // Store order locally
            $this->driver->_saveOrderFoodAggrigator($setOrderData, $orderId);

            // Send to internal system
            $responceSendRequestInternaly = helper::_sendCurlRequestInternally(
                "GET", "http://127.0.0.1:8000/api/food-aggrigator/send-order?orderid=" . $orderId
            );
            break;

        case 'order.status_update':
            // Sync status across platforms
            $this->driver->sendDelivarooOrderStatusSender($orderId);
            break;
    }
}

// 2. Order Transformation (Jahez Example)
private function arrangeOrderArray($orderPayload, $ishbekCompanyId, $jahezOrderId, $ishbekBranchId, $orderSource) {
    $finalOrderArray = [
        'companyid' => $ishbekCompanyId,
        'branchId' => $ishbekBranchId,
        'paymentType' => $orderPayload['payment_method'],
        'ordersource' => $orderSource,
        'customerId' => Constants::ISHBEK_JAHEZ_UUID["customerId"],
        'deliveryType' => Constants::ISHBEK_JAHEZ_UUID["deliveryType"],
        'referenceno' => ['jahez' => $jahezOrderId],
        'customer' => [
            'name' => '',
            'phoneno' => '',
            'email' => ''
        ],
        'price' => [
            'finalPrice' => $finalPrice,
            'subTotal' => $finalPrice,
            'total' => $finalPrice,
            'discount' => ['value' => $offer]
        ],
        'products' => [] // Transformed products with modifiers
    ];

    return $finalOrderArray;
}

// 3. Order Status State Machine
private function _getDelivarooOrderStatus($orderId) {
    $orderStatus = $orderFileGetContentArray['last_status']['status'] ?? "";

    switch ($orderStatus) {
        case 'canceled': return 'failed';
        case 'succeeded': return "accepted";
        case 'accepted': return "confirmed";
        case 'confirmed': return "in_kitchen";
        case 'in_kitchen':
            if (microtime(true) - strtotime($orderStatusTime) <= 1800) {
                return 'in_kitchen';
            }
            return "ready_for_collection_soon";
        case 'ready_for_collection_soon': return "ready_for_collection";
        case 'ready_for_collection': return "collected";
    }
}
```

### 4. Dynamic Driver Architecture

#### Factory Pattern Implementation
```php
// PosIntegrationController.php - POS System Factory
private function createProvider() {
    $method = 'create' . Str::studly($this->integration->pos) . 'Driver';
    if (method_exists($this, $method)) {
        return $this->$method(json_decode($this->integration->settings) ?? $this->integration->settings);
    }
    return false;
}

// Available POS Drivers:
private function createFoodicsDriver($config) { $this->driver = new Foodics($this->company, $config); }
private function createMicrosDriver($config) { $this->driver = new Micros($this->company, $config); }
private function createBonanzaDriver($config) { $this->driver = new Bonanza($this->company, $config); }
private function createHermesDriver($config) { $this->driver = new Hermes($this->company, $config); }
private function createAquaDriver($config) { $this->driver = new Aqua($this->company, $config); }
private function createOodoDriver($config) { $this->driver = new Oodo($this->company, $config); }
private function createFalconDriver($config) { $this->driver = new FalconV2($this->company, $config); }
private function createTabsenseDriver($config) { $this->driver = new Tabsense($this->company, $config); }
private function createHameltonDriver($config) { $this->driver = new Hamelton($this->company, $config); }

// FoodAggrigatorController.php - Delivery Platform Factory
private function createProvider() {
    $method = 'create' . Str::studly($this->company_aggrigator) . 'Driver';
    return method_exists($this, $method) ? $this->$method() : false;
}

private function createDelivarooDriver() {
    $delivarooFoodAggrigator = FoodAggrigator::where("name->en", "Deliveroo")->first();
    $delivarooLinker = FoodAggrigatorLinker::where([
        'food_aggrigator_id' => $delivarooFoodAggrigator->id,
        'company_id' => $this->company->id
    ])->first();
    $this->driver = new Delivaroo($this->company, $delivarooLinker);
}

private function createJahezDriver() {
    $jahezFoodAggrigator = FoodAggrigator::where("name->en", "Jahez")->first();
    $jahezLinker = FoodAggrigatorLinker::where([
        'food_aggrigator_id' => $jahezFoodAggrigator->id,
        'company_id' => $this->company->id
    ])->first();
    $this->driver = new Jahez($this->company, $jahezLinker);
}
```

### 5. Branch-Level Multi-Tenancy

#### Branch-Specific Availability Management
```php
// Jahez branch exclusion logic
$excludeBranchesOfTheCategory = [];
$availabilityBranchesOfTheCategory = $category['branches'] ?? null;
$finalArrayAvailabilityBranchesOfTheCategory = [];

foreach ($availabilityBranchesOfTheCategory as $oneBranch) {
    $finalArrayAvailabilityBranchesOfTheCategory[] = $oneBranch['id'];
}

foreach ($branches as $branch) {
    $ishbekBranch = IshbekData::where(['connected_id' => $branch->connected_id])->first();

    if (!in_array($ishbekBranch->ishbek_id, $finalArrayAvailabilityBranchesOfTheCategory)) {
        $excludeBranchesOfTheCategory[] = $ishbekBranch->ishbek_id;
    }
}

$finalMenuCategories[] = [
    "category_id" => $category['id'],
    "name" => $category['name'],
    "index" => $category['displaynumber'] ?? $counter,
    "exclude_branches" => $excludeBranchesOfTheCategory,
];
```

### 6. Comprehensive Error Handling & Logging

#### Multi-Level Logging System
```php
// 1. Incoming API Requests
IncomingApiLog::create([
    'url' => $request->url(),
    'headers' => json_encode($request->headers->all()),
    'data' => json_encode($request->all()),
    'request_event' => Requestevent::getUrlNameId($request),
]);

// 2. Outgoing API Requests
OutgoingApiLog::create([
    "url" => $url,
    "headers" => json_encode($headers),
    "request" => is_array($data) ? json_encode($data) : $data,
    "http_code" => $info["http_code"],
    "method" => $method,
    "response" => $result,
]);

// 3. Menu Sync Logging
FoodAggregatorSyncLog::create([
    'food_aggregator_id' => $this->foodAggrigatorData->id,
    'company_id' => $this->company->id,
    'menu_id' => $menuUniqueUuid,
    'sync_menu_payload' => $finalMenuPayLoad,
    'sync_menu_response' => $updateMenuResponce,
]);

// 4. File-based logging with structured directories
$storagePathOfMenuPayLoad = storage_path('app/sync-menu-logs');
$storagePathOfMenuPayLoad .= DIRECTORY_SEPARATOR . ($updateMenuResponce['response_code'] / 100 != 2 ? "error" : "success");
```

### 7. API Route Architecture

#### Multi-Tenant Routing with Middleware
```php
// Custom authentication middleware for different contexts
Route::middleware('custom-auth')->group(function () {
    Route::get("sync-menu", [PosIntegrationController::class, "syncMenuController"]);
    Route::post("send-order", [PosIntegrationController::class, "sendOrderByGetRequest"]);
});

Route::middleware("custom-auth-aggregator")->prefix("aggregator")->group(function () {
    Route::post("sync-menu", [FoodAggrigatorController::class, "syncMenuController"]);
});

Route::middleware(["incoming-api-middleware"])->group(function ($app) {
    Route::post('order-status', [orderStatusController::class, "updateOrderStatus"]);
});

// Platform-specific route groups
Route::prefix('/dhub')->group(function ($app) {
    $app->post('/createTask', [DHUB::class, "createTask"]);
    $app->delete('/task', [DHUB::class, "cancelTask"]);
});

Route::prefix("/ishbek")->group(function ($app) {
    $app->get("/menu", [Careem::class, "getSimulateMenu"]);
});
```

### 8. Configuration Constants

#### Platform-Specific Constants
```php
// Order type mappings
public const ISHBEK_ORDER_TYPES = [
    "7f78870b-910a-4ece-9a78-f630c4a8df65" => "dine-in",
    "6d7b89d4-28a0-483d-a1fb-104719545138" => "delivery",
    "66770d92-8516-4e85-af94-3153c7b834eb" => "talabat",
    "b8fe602c-9bf4-4c13-bcf1-4a84325992e2" => "careemnow"
];

// Platform-specific transformations
public const FOODICS_ORDER_TYPE = [
    "talabat" => 3,
    "careemnow" => 3,
    "delivery" => 3
];

public const JAHEZ_STATUS = [
    "N" => "New",
    "A" => "Accepted",
    "O" => "Out for delivery",
    "D" => "Delivered",
    "C" => "Cancelled",
    "R" => "Rejected"
];

// Universal UUIDs for system integration
public const ISHBEK_JAHEZ_UUID = [
    "ordersource" => "uuid-for-jahez-order-source",
    "customerId" => "uuid-for-default-customer",
    "deliveryType" => "uuid-for-delivery-type",
    "DeliveryAddress" => "uuid-for-delivery-address"
];
```

## Key Lessons for Implementation

1. **Multi-Level Authentication**: Each platform requires different auth mechanisms, store credentials securely with automatic refresh
2. **Universal Data Models**: Create a standard internal format, then transform to/from platform-specific formats
3. **State Management**: Implement robust order state machines with file-based persistence for reliability
4. **Branch-Level Granularity**: Support branch-specific availability and exclusions for multi-location businesses
5. **Comprehensive Logging**: Log every API call, transformation, and error for debugging and auditing
6. **Factory Patterns**: Use dynamic driver creation for scalable platform support
7. **Error Recovery**: Implement retry mechanisms with exponential backoff for API failures
8. **Configuration Management**: Centralize platform-specific constants and mappings
9. **Multi-Tenant Architecture**: Design for company-level isolation with shared platform integrations
10. **Real-Time Processing**: Support webhook-based real-time order and status updates

This architecture demonstrates enterprise-level integration platform design with production-ready reliability and scalability.