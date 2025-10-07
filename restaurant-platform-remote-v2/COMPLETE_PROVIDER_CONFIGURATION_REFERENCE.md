# Complete Provider Configuration Reference

**Last Updated**: October 1, 2025
**Platform Version**: 2.0
**Purpose**: Comprehensive configuration guide for all delivery provider integrations

---

## Table of Contents

1. [Configuration Overview](#configuration-overview)
2. [Provider-by-Provider Details](#provider-by-provider-details)
3. [Backend API Endpoints](#backend-api-endpoints)
4. [Frontend Configuration UI](#frontend-configuration-ui)
5. [Database Schema](#database-schema)
6. [Security Requirements](#security-requirements)
7. [Testing Procedures](#testing-procedures)

---

## Configuration Overview

### Two-Level Configuration System

```
Company Level (CompanyProviderConfig)
    ├─ Provider credentials (API keys, OAuth tokens)
    ├─ Global provider settings
    └─ Priority and pricing
        ↓
Branch Level (BranchProviderMapping)
    ├─ Branch-to-provider site mapping
    ├─ Branch-specific overrides
    └─ Per-location settings
```

### Configuration DTO Structure

**Company Level** (`CreateCompanyProviderConfigDto`):
```typescript
{
  companyId: string;              // UUID
  providerType: ProviderType;     // Enum: dhub, talabat, careem, etc.

  // Provider configuration
  configuration: {
    apiKey?: string;              // For API key auth
    secretKey?: string;           // For HMAC signatures
    apiBaseUrl?: string;          // Provider API URL
    clientId?: string;            // For OAuth 2.0
    clientSecret?: string;        // For OAuth 2.0
    brandId?: string;             // Provider-specific brand ID
    merchantId?: string;          // Provider-specific merchant ID
    webhookSecret?: string;       // For webhook validation
    oauthTokenUrl?: string;       // OAuth token endpoint
    oauthHost?: string;           // OAuth server
    apiHost?: string;             // API server
  };

  // Secure credentials (encrypted)
  credentials: {
    username?: string;
    password?: string;
    accessToken?: string;         // Cached OAuth token
    refreshToken?: string;        // For token refresh
    tokenExpiresAt?: string;      // ISO date string
  };

  // Operational settings
  isActive: boolean;              // Enable/disable provider
  priority: number;               // 1 = highest priority
  maxDistance: number;            // Max delivery distance (KM)
  baseFee: number;                // Base delivery fee
  feePerKm: number;               // Per-kilometer fee
  avgDeliveryTime: number;        // Average delivery time (minutes)
}
```

**Branch Level** (`CreateBranchProviderMappingDto`):
```typescript
{
  branchId: string;                       // UUID
  companyProviderConfigId: string;        // UUID (links to company config)
  providerBranchId: string;               // Provider's branch ID
  providerSiteId?: string;                // Provider's site/location ID

  // Branch-specific overrides
  branchConfiguration: {
    deliveryRadius?: number;              // KM
    minimumOrderAmount?: number;          // Currency amount
    preparationTimeMinutes?: number;      // Minutes
    acceptsScheduledOrders?: boolean;
    specialInstructions?: string;
    menuId?: string;                      // Provider menu ID
    locationId?: string;                  // Provider location ID
    autoAccept?: boolean;                 // Auto-accept orders
    autoPrint?: boolean;                  // Auto-print receipts
  };

  // Branch operational settings
  isActive: boolean;
  priority: number;
  minOrderValue?: number;
  maxOrderValue?: number;
  supportedPaymentMethods: string[];      // ['cash', 'card', 'online', 'wallet']
}
```

---

## Provider-by-Provider Details

### 1. Deliveroo (OAuth 2.0)

**Status**: ✅ Fully documented from Picolinate analysis

#### Company Configuration
```typescript
{
  providerType: 'deliveroo',
  configuration: {
    clientId: 'deliveroo_client_id',                 // From Deliveroo developer portal
    clientSecret: 'deliveroo_client_secret',         // ENCRYPT THIS
    oauthHost: 'https://auth.developers.deliveroo.com',  // Production
    // oauthHost: 'https://auth-sandbox.developers.deliveroo.com',  // Sandbox
    apiHost: 'https://api.developers.deliveroo.com', // Production
    // apiHost: 'https://api-sandbox.developers.deliveroo.com',  // Sandbox
    brandId: 'brand-uuid',                           // Deliveroo brand ID
    webhookSecret: 'webhook_signing_secret'          // For HMAC validation
  },
  credentials: {
    accessToken: null,        // Populated on first auth
    tokenExpiresAt: null,     // Set to (now + 3600 seconds)
    refreshToken: null        // Not used (client_credentials)
  }
}
```

#### Branch Configuration
```typescript
{
  providerSiteId: 'site-uuid',  // Deliveroo site/location ID
  branchConfiguration: {
    locationId: 'site-uuid',     // Same as providerSiteId
    menuId: 'menu-uuid',         // Generated per menu upload
    autoAccept: false,           // Manual order acceptance
    autoPrint: true
  }
}
```

#### Authentication Details
- **Type**: OAuth 2.0 Client Credentials
- **Token Endpoint**: `POST {oauthHost}/oauth2/token`
- **Headers**: `Authorization: Basic {base64(clientId:clientSecret)}`
- **Body**: `grant_type=client_credentials`
- **Token Expiration**: 3600 seconds (1 hour)
- **Token Refresh**: Request new token when expired

#### Menu Sync Requirements
- **Endpoint**: `PUT {apiHost}/menu/v1/brands/{brandId}/menus/{menuId}`
- **Price Format**: CENTS (multiply by 100)
- **Structure**: categories, items, modifiers (2-level), mealtimes
- **Languages**: Multi-language support (ar, en)

#### Webhook Events
- `order.new` - New order received
- `order.status_update` - Order status changed
- **Validation**: HMAC-SHA256 on `x-deliveroo-sequence-guid` header

---

### 2. Jahez (API Key + Secret)

**Status**: ✅ Fully documented from Picolinate analysis

#### Company Configuration
```typescript
{
  providerType: 'jahez',
  configuration: {
    apiKey: 'jahez_api_key',          // x-api-key header
    secretKey: 'jahez_secret_key',    // For token generation (ENCRYPT)
    apiHost: 'https://integration-api-staging.jahez.net',  // Staging
    // apiHost: 'https://integration-api.jahez.net',  // Production (TBD)
    webhookSecret: null               // Not used (no signature validation documented)
  },
  credentials: {
    accessToken: null,     // Populated after /token call
    tokenExpiresAt: null   // Unknown expiration (refresh on 401)
  }
}
```

#### Branch Configuration
```typescript
{
  providerBranchId: 'branch-uuid',  // Jahez branch UUID
  branchConfiguration: {
    locationId: 'branch-uuid',       // Same as providerBranchId
    excludeBranches: [],             // Array of branch UUIDs to exclude from menu
    autoAccept: false,
    autoPrint: true
  }
}
```

#### Authentication Details
- **Type**: API Key + Secret Token
- **Token Endpoint**: `POST {apiHost}/token`
- **Headers**: `x-api-key: {apiKey}`, `Content-Type: application/json`
- **Body**: `{"secret": "{secretKey}"}`
- **Token Usage**: `Authorization: Bearer {token}` + `x-api-key: {apiKey}`
- **Expiration**: Unknown (re-auth on 401 responses)

#### Menu Sync Requirements
- **Two-Step Process**:
  1. `POST /categories/categories_upload` - Upload categories first
  2. `POST /products/products_upload` - Upload products with modifiers
- **Price Format**: DECIMAL (e.g., 5.50, not cents)
- **Branch Exclusion**: `exclude_branches` array per category/product
- **Availability**: Full week schedule required per product

#### Webhook Events
- Incoming order webhook (custom endpoint)
- Status update webhook from Jahez
- **Validation**: No signature validation (IP whitelist recommended)

---

### 3. Careem (INCOMPLETE - Build from Official Docs)

**Status**: ⚠️ Not fully implemented in Picolinate

#### Company Configuration
```typescript
{
  providerType: 'careem',
  configuration: {
    apiKey: 'careem_api_key',        // TBD based on Careem docs
    secretKey: 'careem_secret',      // TBD (ENCRYPT)
    clientId: 'careem_client_id',    // If OAuth 2.0
    clientSecret: 'careem_client_secret',  // If OAuth 2.0 (ENCRYPT)
    apiBaseUrl: 'https://api.careem.com',  // TBD
    merchantId: 'merchant_id',       // Careem merchant ID
    webhookSecret: 'webhook_secret'  // For HMAC validation
  },
  credentials: {
    accessToken: null,
    tokenExpiresAt: null,
    refreshToken: null
  }
}
```

#### Branch Configuration
```typescript
{
  providerBranchId: 'careem_store_id',  // Careem store identifier
  branchConfiguration: {
    storeId: 'careem_store_id',
    menuId: 'menu-uuid',
    autoAccept: false,
    autoPrint: true
  }
}
```

#### Implementation Notes
- ⚠️ **DO NOT use Picolinate as reference** (incomplete)
- ✅ Build from Careem's official API documentation
- ✅ Follow Deliveroo/Jahez patterns for consistency
- ✅ Implement complete OAuth flow or API key auth
- ✅ Add comprehensive webhook handling

---

### 4. Talabat (RESEARCH REQUIRED)

**Status**: ⚠️ No implementation reference available

#### Company Configuration
```typescript
{
  providerType: 'talabat',
  configuration: {
    apiKey: 'talabat_api_key',       // TBD from Talabat docs
    secretKey: 'talabat_secret',     // TBD (ENCRYPT)
    apiBaseUrl: 'https://api.talabat.com',  // TBD
    restaurantId: 'restaurant_id',   // Talabat restaurant identifier
    webhookSecret: 'webhook_secret'  // For HMAC validation
  },
  credentials: {
    accessToken: null,
    tokenExpiresAt: null
  }
}
```

#### Branch Configuration
```typescript
{
  providerBranchId: 'talabat_branch_id',
  branchConfiguration: {
    restaurantId: 'talabat_restaurant_id',
    menuId: 'menu-uuid',
    autoAccept: false,
    autoPrint: true
  }
}
```

#### Implementation Requirements
1. Research Talabat Partner API documentation
2. Determine authentication method (OAuth vs API Key)
3. Understand menu format requirements
4. Document webhook event structure
5. Test in Talabat sandbox environment

---

### 5. Uber Eats (RESEARCH REQUIRED)

**Status**: ❌ Not found in Picolinate

#### Company Configuration
```typescript
{
  providerType: 'ubereats',
  configuration: {
    clientId: 'uber_client_id',         // OAuth 2.0 (likely)
    clientSecret: 'uber_client_secret', // ENCRYPT
    apiBaseUrl: 'https://api.uber.com', // TBD
    storeUuid: 'uber_store_uuid',      // Uber Eats store identifier
    webhookSecret: 'webhook_secret'
  },
  credentials: {
    accessToken: null,
    tokenExpiresAt: null,
    refreshToken: null
  }
}
```

#### Branch Configuration
```typescript
{
  providerBranchId: 'uber_store_uuid',
  branchConfiguration: {
    storeUuid: 'uber_store_uuid',
    menuId: 'menu-uuid',
    autoAccept: false,
    autoPrint: true
  }
}
```

#### Implementation Requirements
1. Access Uber Eats Integration API documentation
2. Implement OAuth 2.0 authentication
3. Build menu upload transformer
4. Handle Uber Eats webhook events
5. Test in Uber sandbox

---

### 6. Zomato (RESEARCH REQUIRED)

**Status**: ❌ Not found in Picolinate

#### Company Configuration
```typescript
{
  providerType: 'zomato',
  configuration: {
    apiKey: 'zomato_api_key',          // API Key based (likely)
    secretKey: 'zomato_secret',        // ENCRYPT
    apiBaseUrl: 'https://api.zomato.com',  // TBD
    restaurantId: 'zomato_restaurant_id',
    webhookSecret: 'webhook_secret'
  },
  credentials: {
    accessToken: null
  }
}
```

#### Branch Configuration
```typescript
{
  providerBranchId: 'zomato_restaurant_id',
  branchConfiguration: {
    restaurantId: 'zomato_restaurant_id',
    menuId: 'menu-uuid',
    autoAccept: false,
    autoPrint: true
  }
}
```

#### Implementation Requirements
1. Access Zomato Partner API documentation
2. Understand authentication mechanism
3. Build menu sync system
4. Implement webhook handling
5. Test in Zomato sandbox

---

## Backend API Endpoints

### Company Provider Configuration

**Create Provider Configuration**
```
POST /api/v1/delivery/company-config
Authorization: Bearer {jwt_token}
Roles: super_admin, company_owner

Body: CreateCompanyProviderConfigDto
Response: {
  id: string,
  companyId: string,
  providerType: string,
  isActive: boolean,
  createdAt: string
}
```

**Update Provider Configuration**
```
PATCH /api/v1/delivery/company-config/:id
Authorization: Bearer {jwt_token}
Roles: super_admin, company_owner

Body: Partial<CreateCompanyProviderConfigDto>
```

**Get Company Provider Configurations**
```
GET /api/v1/delivery/company-config?companyId={uuid}
Authorization: Bearer {jwt_token}

Response: CompanyProviderConfig[]
```

**Test Provider Connection**
```
POST /api/v1/delivery/company-config/:id/test
Authorization: Bearer {jwt_token}
Roles: super_admin, company_owner, branch_manager

Response: {
  success: boolean,
  message: string,
  authStatus: string,
  apiReachable: boolean,
  latency: number
}
```

---

### Branch Provider Mapping

**Create Branch Mapping**
```
POST /api/v1/delivery/branch-mapping
Authorization: Bearer {jwt_token}
Roles: super_admin, company_owner, branch_manager

Body: CreateBranchProviderMappingDto
```

**Update Branch Mapping**
```
PATCH /api/v1/delivery/branch-mapping/:id
Authorization: Bearer {jwt_token}
Roles: super_admin, company_owner, branch_manager

Body: Partial<CreateBranchProviderMappingDto>
```

**Get Branch Mappings**
```
GET /api/v1/delivery/branch-mapping?branchId={uuid}
Authorization: Bearer {jwt_token}

Response: BranchProviderMapping[]
```

**Delete Branch Mapping**
```
DELETE /api/v1/delivery/branch-mapping/:id
Authorization: Bearer {jwt_token}
Roles: super_admin, company_owner
```

---

### Menu Synchronization

**Trigger Manual Menu Sync**
```
POST /api/v1/delivery/menu-sync/:branchMappingId
Authorization: Bearer {jwt_token}
Roles: super_admin, company_owner, branch_manager

Body: {
  syncType: 'full' | 'prices' | 'availability',
  force: boolean
}

Response: {
  syncJobId: string,
  status: 'queued',
  estimatedDuration: number
}
```

**Get Menu Sync Status**
```
GET /api/v1/delivery/menu-sync/:syncJobId/status
Authorization: Bearer {jwt_token}

Response: {
  jobId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  progress: number,
  totalItems: number,
  processedItems: number,
  errors: string[]
}
```

**Schedule Automatic Menu Sync**
```
POST /api/v1/delivery/menu-sync/:branchMappingId/schedule
Authorization: Bearer {jwt_token}
Roles: super_admin, company_owner

Body: {
  enabled: boolean,
  syncInterval: number,  // minutes
  syncType: 'full' | 'prices' | 'availability'
}
```

---

## Frontend Configuration UI

### Provider Management Page
**URL**: `/integration/providers`

**Features**:
- View all configured providers
- Toggle provider active/inactive
- View provider statistics
- Configure provider settings
- Test provider connection

### Branch Configuration Page
**URL**: `/integration/branch-config`

**Features**:
- Select branch and provider
- Configure branch-provider mapping
- Set branch-specific overrides
- Map provider site/branch IDs
- Configure auto-accept/auto-print

### Menu Sync Dashboard
**URL**: `/integration/menu-sync`

**Features**:
- Trigger manual menu sync
- View sync job history
- Monitor sync progress
- Schedule automatic syncs
- View sync logs and errors

---

## Database Schema

### `company_provider_config` Table
```sql
CREATE TABLE company_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  provider_type VARCHAR(50) NOT NULL,
  configuration JSONB NOT NULL,        -- Public config
  credentials JSONB NOT NULL,          -- Encrypted credentials
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  max_distance DECIMAL(10,2) DEFAULT 15.0,
  base_fee DECIMAL(10,2) DEFAULT 2.5,
  fee_per_km DECIMAL(10,2) DEFAULT 0.5,
  avg_delivery_time INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,

  UNIQUE(company_id, provider_type)
);

CREATE INDEX idx_company_provider_active ON company_provider_config(company_id, is_active);
```

### `branch_provider_mapping` Table
```sql
CREATE TABLE branch_provider_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  company_provider_config_id UUID REFERENCES company_provider_config(id) ON DELETE CASCADE,
  provider_branch_id VARCHAR(255) NOT NULL,
  provider_site_id VARCHAR(255) NULL,
  branch_configuration JSONB NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  min_order_value DECIMAL(10,2) NULL,
  max_order_value DECIMAL(10,2) NULL,
  supported_payment_methods JSONB DEFAULT '["cash","card"]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,

  UNIQUE(branch_id, company_provider_config_id)
);

CREATE INDEX idx_branch_mapping_active ON branch_provider_mapping(branch_id, is_active);
CREATE INDEX idx_branch_mapping_provider ON branch_provider_mapping(company_provider_config_id);
```

### `menu_sync_jobs` Table
```sql
CREATE TABLE menu_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_mapping_id UUID REFERENCES branch_provider_mapping(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,     -- 'full', 'prices', 'availability'
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  error_log JSONB NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_menu_sync_status ON menu_sync_jobs(status, created_at);
CREATE INDEX idx_menu_sync_mapping ON menu_sync_jobs(branch_mapping_id);
```

---

## Security Requirements

### Credential Encryption

**CRITICAL**: All provider credentials MUST be encrypted at rest.

```typescript
// Use Prisma encryption middleware or dedicated encryption service
import { encrypt, decrypt } from '@/lib/encryption';

// Before saving
const encryptedCredentials = encrypt(JSON.stringify(credentials));

// After retrieving
const decryptedCredentials = JSON.parse(decrypt(row.credentials));
```

### Webhook Signature Validation

**CRITICAL**: All webhooks MUST validate signatures.

```typescript
// Deliveroo example
import crypto from 'crypto';

function validateDeliverooWebhook(
  sequenceGuid: string,
  receivedHmac: string,
  webhookSecret: string
): boolean {
  const computed = crypto
    .createHmac('sha256', webhookSecret)
    .update(sequenceGuid)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(receivedHmac)
  );
}
```

### API Key Storage

**NEVER**:
- ❌ Store API keys in plain text
- ❌ Commit secrets to git
- ❌ Hardcode credentials in code
- ❌ Log credentials in application logs

**ALWAYS**:
- ✅ Encrypt credentials in database
- ✅ Use environment variables for system secrets
- ✅ Rotate credentials periodically
- ✅ Audit credential access

---

## Testing Procedures

### Pre-Integration Testing

**1. Company Configuration Test**
```bash
curl -X POST http://localhost:3001/api/v1/delivery/company-config/test/:id \
  -H "Authorization: Bearer {token}"

Expected: { success: true, authStatus: 'authenticated', apiReachable: true }
```

**2. Branch Mapping Validation**
```bash
curl -X GET http://localhost:3001/api/v1/delivery/branch-mapping?branchId={uuid} \
  -H "Authorization: Bearer {token}"

Expected: Array of configured mappings
```

**3. Menu Sync Dry Run**
```bash
curl -X POST http://localhost:3001/api/v1/delivery/menu-sync/:mappingId \
  -H "Authorization: Bearer {token}" \
  -d '{"syncType":"full","force":false}'

Expected: { syncJobId: "uuid", status: "queued" }
```

### Provider-Specific Tests

**Deliveroo**:
- [ ] OAuth token generation succeeds
- [ ] Token caching works (no re-auth within 1 hour)
- [ ] Menu upload converts prices to cents correctly
- [ ] Webhook signature validation passes
- [ ] Order webhook creates internal order

**Jahez**:
- [ ] API key + secret auth succeeds
- [ ] Token persists across requests
- [ ] Category upload succeeds
- [ ] Product upload with modifiers succeeds
- [ ] Branch exclusion works correctly
- [ ] Order webhook processes successfully

**Careem**:
- [ ] Authentication mechanism works
- [ ] Menu sync completes without errors
- [ ] Webhook handling implemented
- [ ] Status updates work bidirectionally

### Integration Testing

**End-to-End Flow**:
1. Configure provider at company level
2. Create branch mapping
3. Trigger menu sync
4. Verify menu visible on provider platform
5. Place test order via provider
6. Verify webhook received and processed
7. Confirm order created in internal system
8. Update order status
9. Verify status synced to provider

---

## Troubleshooting

### Common Issues

**Issue**: Provider configuration test fails
**Solution**:
1. Verify credentials are correct
2. Check API base URL
3. Confirm provider account is active
4. Test network connectivity to provider API

**Issue**: Menu sync succeeds but items not visible
**Solution**:
1. Check item `is_visible` flag
2. Verify branch not in `exclude_branches`
3. Confirm menu linked to correct site/location ID
4. Check availability schedule

**Issue**: Webhooks not being received
**Solution**:
1. Verify webhook URL configured in provider dashboard
2. Check firewall allows incoming webhooks
3. Confirm webhook secret matches provider config
4. Review webhook logs for errors

**Issue**: Authentication token expired
**Solution**:
1. Implement token refresh logic
2. Cache tokens with expiration
3. Handle 401 responses by re-authenticating

---

## Next Steps

### Implementation Priority

**Week 1**: Deliveroo (Most Complete Reference)
- Company configuration
- Branch mapping
- OAuth authentication
- Menu synchronization
- Webhook handling

**Week 2**: Jahez
- API key authentication
- Two-step menu upload
- Order processing
- Status synchronization

**Week 3**: Talabat (Research + Implement)
- Research official documentation
- Determine authentication method
- Build menu transformer
- Implement webhooks

**Week 4**: Careem (Complete Implementation)
- Research official documentation
- Full implementation (not from Picolinate)
- Testing and validation

**Week 5-6**: Uber Eats & Zomato
- Research APIs
- Build integrations
- Complete testing

---

## Support & Documentation

**Official Provider Documentation**:
- Deliveroo: [Deliveroo Developer Portal](https://developers.deliveroo.com)
- Jahez: Contact Jahez Partner Support
- Talabat: Contact Talabat Integration Team
- Careem: [Careem Developer Portal](https://developers.careem.com)
- Uber Eats: [Uber Eats Integration Docs](https://developer.uber.com)
- Zomato: [Zomato Partner API](https://www.zomato.com/partner-with-us)

**Internal Documentation**:
- `PICOLINATE_INTEGRATION_ARCHITECTURE_ANALYSIS.md` - Complete Picolinate analysis
- `PROVIDER_INTEGRATION_QUICK_REFERENCE.md` - Quick lookup guide
- `INTEGRATION_PLATFORM_STATUS_REPORT.md` - Current implementation status

---

*Last Updated: October 1, 2025*
*Maintained by: Platform Integration Team*
*Database: postgres (Password: E$$athecode006)*
