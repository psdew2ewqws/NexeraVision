# Picolinate Delivery Platform Integration - Comprehensive Analysis

## Executive Summary

Deep analysis of Picolinate's delivery platform integration patterns reveals a sophisticated multi-platform ecosystem supporting **9+ delivery platforms** with standardized webhook handling, database schema, and order lifecycle management.

---

## 🏗️ Architecture Overview

### Core Components
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Laravel Middleware │◄──►│   .NET Services     │◄──►│  PostgreSQL DB      │
│   (Integration Hub)  │    │   (Business Logic)  │    │  (Data Store)       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Webhook Handlers  │    │   Order Processing  │    │   Delivery Tables   │
│   Platform APIs     │    │   Menu Sync        │    │   Order Tracking    │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

---

## 🚀 Delivery Platforms Integrated

### 1. **CAREEM NOW**
- **Type**: Major Middle East delivery platform
- **Integration Pattern**: Webhook-based + REST API
- **Base URL**: `https://integration.ishbek.com/CareemNow/Api/`
- **Key Features**:
  - Menu synchronization via catalog API
  - Order status webhooks
  - Branch management system
  - Company creation and mapping

**Key Endpoints**:
```php
"Careem": {
    "UpdateOrderStatus": "order/updatestateorder",
    "CreateMenu": "catalog/createbranchmenu",
    "CreateBranch": "branch/createbranch",
    "CreateCompany": "company/createcompany",
    "UpdateBranchMenu": "catalog/CreateBranchMenu",
    "GetMyCompanies": "company/GetMyCompanies",
    "UpdateBranchesStatus": "branch/UpdateBranchesStatus",
    "ListBranches": "branch/ListBranches",
    "GetBranchbyId": "branch/GetBranchbyId",
    "MarkFoodAsReady": "order/MarkCareemFoodAsReady"
}
```

**Database Integration**:
```sql
-- Careem logging and event tracking
CREATE TABLE public.careemlog (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    eventid public.citext NOT NULL,
    occurredat timestamp without time zone NOT NULL,
    eventtype public.citext NOT NULL,
    details jsonb,
    createdat timestamp without time zone DEFAULT now(),
    branchid uuid DEFAULT public.uuid_nil()
);
```

**Order Type Mapping**:
```php
const ISHBEK_ORDER_TYPES = [
    "b8fe602c-9bf4-4c13-bcf1-4a84325992e2" => "careemnow",
];
```

---

### 2. **TALABAT**
- **Type**: Leading MENA food delivery platform
- **Integration Pattern**: Database-driven with extensive credential management
- **Business Logic**: Branch-specific credential mapping with tax handling

**Database Schema**:
```sql
-- Talabat credentials management
CREATE TABLE public.talabatcredential (
    ishbekbranchid uuid,
    talabatbranchid public.citext,
    talabatbrandid public.citext,
    companyid uuid,
    createdat timestamp without time zone DEFAULT now(),
    istaxable boolean DEFAULT true
);

-- Talabat delivery tracking
CREATE TABLE public.talabatdelivery (
    orderid uuid NOT NULL,
    request jsonb,
    response jsonb,
    requesttype public.citext NOT NULL,
    createdat timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Amman'::text) NOT NULL,
    talabatorderid public.citext
);

-- Talabat menu versioning
CREATE TABLE public.talabatmenu (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    brandid public.citext NOT NULL,
    companyid uuid NOT NULL,
    menu json NOT NULL,
    createdat timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Amman'::text) NOT NULL,
    createdby public.citext NOT NULL,
    updatedat timestamp without time zone,
    updatedby public.citext,
    status boolean DEFAULT false NOT NULL,
    ispublished boolean DEFAULT false NOT NULL,
    version public.citext,
    versiontime timestamp without time zone DEFAULT (now() AT TIME ZONE 'Asia/Amman'::text) NOT NULL,
    menuversionnumber integer DEFAULT 1 NOT NULL
);
```

**Key Database Functions**:
```sql
-- Create Talabat delivery order payload
CREATE FUNCTION public.createtalabatdeliveryorder(_id uuid)
RETURNS TABLE(id uuid, deliveryprice numeric, totalprice numeric, finalprice numeric, notes public.citext, customer jsonb, deliveryaddress jsonb, branch jsonb, deliverytype public.citext, paymenttype public.citext)

-- Update Talabat order delivery status
CREATE PROCEDURE public.updatetalabatorderdeliverystatus(IN _talabatorderid public.citext, IN _deliverystatus public.citext)

-- Get Talabat order body request
CREATE FUNCTION public.gettalabatorderbodyrequest(_deliveryplatformid public.citext)
RETURNS TABLE(requestbody public.citext)
```

**Order Processing**:
```sql
-- Reference number tracking
where referencenumber->>'Talabatdelivery' = _talabatorderid;

-- Order status updates
UPDATE "order" SET deliverystatus = _deliverystatus
where referencenumber->>'Talabatdelivery'= _talabatorderid;
```

---

### 3. **JAHEZ**
- **Type**: Saudi Arabia's leading food delivery platform
- **Integration Pattern**: Token-based authentication with webhook handling
- **API Host**: `https://integration-api-staging.jahez.net`
- **Ishbek API**: `https://uat-ishbek-api.ishbek.com`

**Authentication System**:
```php
private function _getAuthticationToken()
{
    if ($this->accessToken == "") {
        $getAuthRequestBody = [
            "secret" => $this->secret,
        ];
        $getAuthRequestHeaders = array(
            'x-api-key: ' . $this->x_api_key,
            'Content-Type: application/json'
        );
        $getTokenRequestResponce = $this->process("POST", $this->apiHost . "/token", $getAuthRequestBody, $getAuthRequestHeaders);
        // Store token in database
        $foodAggrigatorObject->update([
            "credintial" => [
                "x-api-key" => $this->x_api_key,
                "secret" => $this->secret,
                "token" => $token,
            ]
        ]);
    }
}
```

**Webhook Endpoints**:
```php
// Order creation webhook
Route::post("food_aggregator/jahez/create-order", [FoodAggrigatorController::class, "createJahezOrder"])->name("jahez.set.order.webhook");

// Order status update webhook
Route::post("food_aggregator/jahez/update_event", [FoodAggrigatorController::class, "updateJahezEvent"])->name("jahez.update_event.webhook");
```

**Order Status Mapping**:
```php
public const JAHEZ_STATUS = [
    "N" => "New",
    "A" => "Accepted",
    "O" => "Out for delivery",
    "D" => "Delivered",
    "C" => "Cancelled",
    "R" => "Rejected",
    "T" => "Timed-out",
];
```

**Order Creation Flow**:
```php
public function createOrder(Request $request)
{
    $orderPayload = $request->json()->all();
    $jahezOrderId = $orderPayload['jahez_id'];
    $ishbekBranchId = $orderPayload['branch_id'];
    $orderSource = Constants::ISHBEK_JAHEZ_UUID["ordersource"];

    // Create order in local system
    $createOrder = FoodAggregatorsOrders::create([
        'food_aggregator_id' =>  $foodAggregatorId,
        'company_id' => $integratedCompanyId,
        'branch_id' => $integratedBranchId,
        'food_aggregator_reference_id' => $jahezOrderId,
        'order_details' => $finalOrderArray,
    ]);

    // Forward to Ishbek API
    $this->sendOrderToIshbek($createOrder, $finalOrderArray, ...);
}
```

---

### 4. **DHUB DELIVERY**
- **Type**: Jordan-based delivery service
- **Integration Pattern**: Office/Branch creation + delivery task management
- **API Host**: `https://jordon.dhub.pro/`

**API Endpoints**:
```php
public const URL = "https://jordon.dhub.pro/";
public const CREATE_OFFICE = "external/api/Offices/CreateOffice";
public const CREATE_BRANCH = "external/api/Branches/CreateBranch";
public const VALIDATE_DELIVARY_JOB = "external/api/Order/Validate";
public const VALIDATE_DELIVARY_MERCHANT_JOB = "external/api/Order/ValidateWithDeliveryCharge";
public const CREATE_DELIVARY_JOB = "external/api/Order/Create";
public const CANCEL_DELIVARY_JOB = "external/api/Order/Cancel";
public const GET_DELIVARY_JOB_STATUS = "external/api/Order/GetStatus";
```

**Route Configuration**:
```php
Route::prefix('/dhub')->group(function ($app) {
    $app->get('/createOffice', [DHUB::class, "CreateOffice"])->name('dhub.company.create');
    $app->get('/createBranch', [DHUB::class, "createBranch"])->name('dhub.branch.create');
    $app->post('/checkTask', [DHUB::class, "checkTask"])->name('dhub.task.check');
    $app->post('/checkMerchantTask', [DHUB::class, "checkMerchantTask"])->name('dhub.task.check.merchant');
    $app->post('/createTask', [DHUB::class, "createTask"])->name('dhub.task.create');
    $app->get('/task', [DHUB::class, "getDelivaryTask"])->name('dhub.task.get');
    $app->delete('/task', [DHUB::class, "cancelTask"])->name('dhub.task.cancel');
});
```

**Office Creation Logic**:
```php
public function CreateOffice(Request $request)
{
    $companyId = $request->get("companyId");
    $company = IshbekData::getdata($companyId, Company::class);

    $checkDhubCompany = Dhubdata::getdata($companyData->id, Company::class);
    if ($checkDhubCompany) {
        return $this->sendError([
            "message" => "Company already Exist",
            "id" => $checkDhubCompany->dhup_id,
        ], "there is error", 400);
    }
}
```

---

### 5. **Additional Delivery Services**

**CAREEM EXPRESS DELIVERY**:
```json
"CareemExpressDelivery": {
    "baseUrl": "https://integration.ishbek.com/CareemNow/Api/",
    "careteOrder": "createOrder/branch/",
    "checkOrderEstimations": "checkOrderEstimations/branch/",
    "cancelOrder": "cancelOrder/orderId/"
}
```

**YALLOW DELIVERY**:
```json
"YallowDelivery": {
    "baseUrl": "https://integration.ishbek.com/Yallow/Api/",
    "careteOrder": "createOrder/branch/"
}
```

**NASHMI DELIVERY**:
```json
"NashmiService": {
    "baseUrl": "https://integration.ishbek.com/Nashmi/Nashmi",
    "GetFees": "checkPreorderEstimationsTime/branch/",
    "createTask": "createOrder/branch/",
    "cancelTask": "/orderCancellation/branch/"
}
```

**TOP DELIVERY**:
```json
"TopDeliveryService": {
    "baseUrl": "https://integration.ishbek.com/TopDelivery/Api/",
    "checkOrderEstimations": "checkOrderEstimations/branch/",
    "createOrder": "createOrder/branch/",
    "cancelOrder": "cancelOrder/orderId/",
    "checkOrderStatus": "checkOrderStatus/orderId/"
}
```

**JOOD DELIVERY**:
```json
"JoodDeliveryService": {
    "baseUrl": "https://integration.ishbek.com/JoodDelivery/Api",
    "checkOrderEstimations": "checkOrderEstimations/branch/",
    "createOrder": "createOrder/branch/",
    "cancelOrder": "/cancelOrder/orderId/",
    "checkOrderStatus": "checkOrderStatus/orderId/"
}
```

**TAWASI DELIVERY**:
```json
"TawasiDeliveryService": {
    "baseUrl": "https://integration.ishbek.com/Tawasi/Api/",
    "createOrder": "createOrder/branch/"
}
```

---

## 📊 Database Architecture

### Core Delivery Tables

**1. Delivery Company Management**:
```sql
CREATE TABLE public.deliverycompany (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name jsonb NOT NULL,
    isaggregated boolean NOT NULL,
    opentime timestamp without time zone,
    closetime timestamp without time zone,
    currency public.citext,
    addressid uuid NOT NULL,
    phonenumber public.citext NOT NULL,
    isavailable boolean DEFAULT true,
    isdeleted boolean DEFAULT false NOT NULL,
    ispublished boolean DEFAULT true NOT NULL,
    logo public.citext,
    website public.citext,
    haspricelist boolean DEFAULT true
);
```

**2. Branch Delivery Configuration**:
```sql
CREATE TABLE public.branchdelivery (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    branchid uuid NOT NULL,
    deliverycompanyid uuid NOT NULL,
    maxdistance numeric DEFAULT 0,
    priority integer DEFAULT 1,
    isavailable boolean DEFAULT true,
    isdeleted boolean DEFAULT false NOT NULL,
    createdat timestamp without time zone DEFAULT now(),
    createdby public.citext DEFAULT 'system'::public.citext
);
```

**3. Delivery Address Management**:
```sql
CREATE TABLE public.branchdeliveryaddress (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    branchdeliverycompany uuid NOT NULL,
    branchaddressid uuid NOT NULL,
    isavailable boolean DEFAULT true,
    isdeleted boolean DEFAULT false NOT NULL,
    createdat timestamp without time zone DEFAULT now()
);
```

**4. Scheduled Delivery Requests**:
```sql
CREATE TABLE public.scheduledeliveryorderrequest (
    orderid uuid NOT NULL,
    deliverycompanyid uuid NOT NULL,
    name public.citext,
    baseurl public.citext,
    apiurl public.citext,
    body jsonb,
    response jsonb,
    executiontime timestamp without time zone DEFAULT now(),
    createdat timestamp without time zone DEFAULT now()
);
```

---

## 🔄 Order Lifecycle Management

### Order Status Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PENDING   │───▶│ PREPARING   │───▶│    READY    │───▶│OUT FOR DELIVERY│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  CANCELED   │    │  REJECTED   │    │  FINISHED   │    │  DELIVERED  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Status Constants**:
```php
public const ORDER_STATUS = [
    "PINDING" => "0",
    "PREPARING" => "1",
    "READY" => "2",
    "OUT FOR DELIVARY" => "3",
    "FINISHED" => "4",
    "CANCELD" => "5",
    "REJECTED" => "6",
];
```

### Order Type Mapping
```php
public const ISHBEK_ORDER_TYPES = [
    "7f78870b-910a-4ece-9a78-f630c4a8df65" => "dine-in",
    "6d7b89d4-28a0-483d-a1fb-104719545138" => "delivery",
    "3b9f60af-a9d4-4bae-b267-f73b48ff06fc" => "pickup",
    "66770d92-8516-4e85-af94-3153c7b834eb" => "talabat",
    "b8fe602c-9bf4-4c13-bcf1-4a84325992e2" => "careemnow",
];
```

### Reference Number Tracking
Orders are tracked using JSON reference numbers that contain platform-specific identifiers:

```sql
-- Talabat tracking
where referencenumber->>'Talabatdelivery' = _talabatorderid;

-- Careem tracking
where referencenumber->>'careem' = _careemorderid;

-- General platform tracking
where referencenumber->>'deliveryPlatformID' = _platformorderid;
```

---

## 🔗 API Integration Patterns

### 1. **Webhook Authentication**
```php
Route::middleware("custom-auth-aggregator")->prefix("aggregator")->group(function () {
    Route::post("sync-menu", [FoodAggrigatorController::class, "syncMenuController"])->name("food-aggrigator-sync-menu");
});

Route::middleware(["incoming-api-middleware"])->group(function ($app) {
    Route::post('order-status', [orderStatusController::class, "updateOrderStatus"])->name("order.status");
});
```

### 2. **Request/Response Logging**
All delivery platform interactions are logged:

```php
OutgoingApiLog::create([
    'url' => $url,
    'headers' => json_encode($headers),
    'request' => is_array($data) ? json_encode($data) : $data,
    "http_code" => $info['http_code'],
    "method" => $method,
    'response' => $result,
]);

IncomingApiLog::create([
    'url' => $request->url(),
    'headers' => json_encode($request->headers->all()),
    'data' => json_encode($request->all()),
    'data_extened' => $platformOrderId
]);
```

### 3. **Menu Synchronization**
```php
public function syncMenuController(Request $request)
{
    $menuPayload = $request->json()->all();
    $categories = $menuPayload['categories'];
    $products = $menuPayload['products'];
    $questions = $menuPayload['question'];
    $answers = $menuPayload['group'];

    // Platform-specific menu transformation
    $this->driver->syncMenu($menuPayload);
}
```

---

## 🛡️ Security & Error Handling

### Token Management
```php
class Jahez {
    private function _getAuthticationToken() {
        if ($this->accessToken == "") {
            // Request new token
            $getTokenRequestResponce = $this->process("POST", $this->apiHost . "/token", $getAuthRequestBody, $getAuthRequestHeaders);

            // Store token with credentials
            $foodAggrigatorObject->update([
                "credintial" => [
                    "x-api-key" => $this->x_api_key,
                    "secret" => $this->secret,
                    "token" => $token,
                ]
            ]);
        }
    }
}
```

### Validation Patterns
```php
$validation = Validator::make($request->all(), [
    "companyId" => ["uuid", 'required'],
    "branchId" => ["uuid", 'required'],
]);

if (!$validation->passes()) {
    return $this->sendError([
        'error' => $validation->getMessageBag()->messages()
    ], "there is error");
}
```

---

## 📈 Integration Service Architecture

### Service Configuration Pattern
All delivery services follow a standardized configuration approach:

**1. Base URL Configuration**
**2. Endpoint Mapping**
**3. Authentication Handling**
**4. Request/Response Processing**
**5. Error Handling & Logging**

### Integration Middleware
```
Request → Authentication → Validation → Processing → Logging → Response
```

### Platform Factory Pattern
```php
private function createProvider()
{
    $this->company_aggrigator = $this->aggregator_data->name['en'];
    $method = 'create' . Str::studly($this->company_aggrigator) . 'Driver';
    if (method_exists($this, $method)) {
        return $this->$method();
    }
}

private function createDeliverooDriver() {
    $this->driver = new Delivaroo($this->company_data, $this->aggregator_data);
}

private function createJahezDriver() {
    $this->driver = new Jahez($this->company_data, $this->food_aggrigator_linker_data);
}
```

---

## 🎯 Key Implementation Insights

### 1. **Multi-Tenant Architecture**
- Company-based isolation with branch-level configurations
- Platform-specific credentials per branch
- Centralized order tracking with distributed processing

### 2. **Standardized Webhook Handling**
- Consistent request/response logging
- Unified authentication middleware
- Standardized error response format

### 3. **Robust Order Management**
- JSON-based reference number tracking
- Comprehensive status mapping
- Bi-directional status synchronization

### 4. **Database-Driven Configuration**
- Dynamic platform configuration
- Versioned menu management
- Audit trail for all operations

### 5. **Scalable Integration Pattern**
- Factory pattern for platform drivers
- Consistent API contracts
- Extensible service architecture

---

## 🚀 Implementation Benefits

### For Restaurant Platform v2:

1. **Proven Architecture**: Battle-tested multi-platform integration
2. **Comprehensive Coverage**: 9+ delivery platforms supported
3. **Robust Error Handling**: Extensive logging and validation
4. **Scalable Design**: Easy to add new platforms
5. **Database-Driven**: Configuration without code changes
6. **Security Focus**: Token management and validation
7. **Order Lifecycle**: Complete order tracking system
8. **Menu Synchronization**: Automated menu updates

---

## 📋 Implementation Recommendations

### Immediate Actions:
1. **Adopt webhook authentication patterns**
2. **Implement standardized logging system**
3. **Create platform factory architecture**
4. **Build reference number tracking system**
5. **Establish menu synchronization pipeline**

### Database Enhancements:
1. **Add delivery platform tables**
2. **Implement credential management**
3. **Create request/response logging**
4. **Build order status tracking**
5. **Add menu versioning system**

### API Improvements:
1. **Standardize webhook endpoints**
2. **Implement token management**
3. **Add request validation**
4. **Create error handling middleware**
5. **Build status synchronization**

---

*This analysis provides the foundation for implementing enterprise-grade delivery platform integration in Restaurant Platform v2, based on proven patterns from Picolinate's production system.*