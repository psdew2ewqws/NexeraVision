# Delivery Provider Integration System - Comprehensive Architecture Analysis

**Analysis Date**: October 1, 2025
**Focus**: Branch-Level Configuration Architecture
**Status**: Backend Complete ✅ | Frontend Integration Gap Identified ⚠️

---

## Executive Summary

The delivery provider integration system implements a **two-tier configuration architecture**:
1. **Company-Level**: Global provider credentials (OAuth tokens, API keys)
2. **Branch-Level**: Location-specific mappings (store IDs, menu IDs, automation settings)

### Critical Finding
**Integration Gap**: Frontend uses non-existent `/branches/{branchId}/providers/{providerId}` endpoints from port 3002 (integration service), but backend implements actual endpoints at `/delivery/branch-provider-mappings` on port 3001 (main API).

---

## 1. Backend Architecture (Port 3001)

### 1.1 Database Schema (Prisma)

#### CompanyProviderConfig Model
```prisma
model CompanyProviderConfig {
  id              String    @id @default(uuid())
  companyId       String    @map("company_id")
  providerType    String    @map("provider_type")  // dhub, talabat, careem, etc.

  // Company-wide configuration (API base URLs, merchant IDs)
  configuration   Json      @default("{}")

  // Secure credentials (API keys, OAuth tokens)
  credentials     Json      @default("{}")

  isActive        Boolean   @default(true)
  priority        Int       @default(1)

  // Default pricing and logistics
  maxDistance     Decimal   @default(15.00) @db.Decimal(8, 2)
  baseFee         Decimal   @default(2.50) @db.Decimal(8, 2)
  feePerKm        Decimal   @default(0.50) @db.Decimal(8, 2)
  avgDeliveryTime Int       @default(30)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  // Relations
  branchMappings  BranchProviderMapping[]
  company         Company   @relation(...)

  @@index([companyId, providerType, isActive])
  @@map("company_provider_configs")
}
```

**Purpose**: Stores company-wide provider credentials and default settings.

**Access Control**:
- Creation: `super_admin` only
- Update: `super_admin` only
- Read: `super_admin`, `company_owner`

**Example Data**:
```json
{
  "id": "uuid-company-config-1",
  "companyId": "company-uuid",
  "providerType": "deliveroo",
  "configuration": {
    "apiBaseUrl": "https://api.deliveroo.com/v1",
    "clientId": "deliveroo_client_123"
  },
  "credentials": {
    "accessToken": "oauth_token_xyz",
    "refreshToken": "refresh_token_abc",
    "tokenExpiresAt": "2025-12-31T23:59:59Z"
  },
  "isActive": true,
  "priority": 1
}
```

---

#### BranchProviderMapping Model
```prisma
model BranchProviderMapping {
  id                      String    @id @default(uuid())
  branchId                String    @map("branch_id")
  companyProviderConfigId String    @map("company_provider_config_id")

  // Provider's identifier for this specific branch
  providerBranchId        String    @map("provider_branch_id")
  providerSiteId          String?   @map("provider_site_id")

  // Branch-specific configuration (store IDs, menu IDs, webhooks)
  branchConfiguration     Json      @default("{}") @map("branch_configuration")

  isActive                Boolean   @default(true)
  priority                Int       @default(1)

  // Branch-level overrides
  minOrderValue           Decimal?  @db.Decimal(10, 2)
  maxOrderValue           Decimal?  @db.Decimal(10, 2)
  supportedPaymentMethods String[]  @default([])

  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  deletedAt               DateTime?

  // Relations
  branch                  Branch    @relation(...)
  companyProviderConfig   CompanyProviderConfig @relation(...)

  @@index([branchId, isActive])
  @@index([companyProviderConfigId, isActive])
  @@map("branch_provider_mappings")
}
```

**Purpose**: Maps branches to provider configurations with location-specific settings.

**Access Control**:
- Creation: `super_admin`, `company_owner`, `branch_manager`
- Update: `super_admin`, `company_owner`, `branch_manager`
- Read: `super_admin`, `company_owner`, `branch_manager`

**Example Data**:
```json
{
  "id": "uuid-mapping-1",
  "branchId": "branch-downtown-uuid",
  "companyProviderConfigId": "uuid-company-config-1",
  "providerBranchId": "deliveroo_store_xyz",
  "providerSiteId": "site_uuid_123",
  "branchConfiguration": {
    "siteId": "site_uuid_123",
    "brandId": "brand_uuid_456",
    "menuId": "menu_uuid_789",
    "webhookSecret": "secret_key_abc",
    "autoAccept": true,
    "autoPrint": false
  },
  "isActive": true,
  "priority": 1,
  "minOrderValue": 15.00,
  "supportedPaymentMethods": ["cash", "card", "online"]
}
```

---

### 1.2 API Endpoints (NestJS)

**Base URL**: `http://localhost:3001/api/v1/delivery`

#### Company Provider Configuration Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/company-provider-configs` | `super_admin` | Create company-level provider config |
| GET | `/company-provider-configs` | `super_admin`, `company_owner` | List all configs (filterable by company/provider) |
| GET | `/company-provider-configs/:id` | `super_admin`, `company_owner` | Get specific config with branch mappings |
| PATCH | `/company-provider-configs/:id` | `super_admin` | Update config (credentials, settings) |
| DELETE | `/company-provider-configs/:id` | `super_admin` | Soft delete (requires no active mappings) |

**Query Parameters**:
- `companyId`: Filter by company
- `providerType`: Filter by provider (dhub, talabat, careem, etc.)
- `activeOnly`: Show only active configs (default: true)

---

#### Branch Provider Mapping Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/branch-provider-mappings` | `super_admin`, `company_owner`, `branch_manager` | Create branch mapping |
| GET | `/branch-provider-mappings` | `super_admin`, `company_owner`, `branch_manager` | List all mappings (filterable) |
| PATCH | `/branch-provider-mappings/:id` | `super_admin`, `company_owner`, `branch_manager` | Update branch mapping |

**Query Parameters**:
- `branchId`: Filter by branch
- `companyId`: Filter by company (includes all company branches)
- `providerType`: Filter by provider type

---

### 1.3 Service Layer Implementation

**File**: `/backend/src/modules/delivery/delivery.service.ts`

#### Key Methods

**createCompanyProviderConfig()**
```typescript
async createCompanyProviderConfig(
  createDto: CreateCompanyProviderConfigDto,
  requestingUserId?: string
) {
  // 1. Verify company exists
  // 2. Check for duplicate active config (company + provider)
  // 3. Create config with credentials and configuration
  // 4. Return config with company info and mapping count
}
```

**createBranchProviderMapping()**
```typescript
async createBranchProviderMapping(
  createDto: CreateBranchProviderMappingDto,
  requestingUserId?: string
) {
  // 1. Verify branch exists and get company
  // 2. Verify provider config exists and matches company
  // 3. Check for duplicate active mapping (branch + provider)
  // 4. Create mapping with branch-specific config
  // 5. Return mapping with full relations
}
```

**findAllBranchProviderMappings()**
```typescript
async findAllBranchProviderMappings(
  branchId?: string,
  companyId?: string,
  providerType?: ProviderType
) {
  // Query with filters
  // Include branch, company, and provider config details
  // Sort by priority and creation date
}
```

---

### 1.4 DTOs (Data Transfer Objects)

#### CreateCompanyProviderConfigDto
```typescript
export class CreateCompanyProviderConfigDto {
  @IsUUID()
  companyId: string;

  @IsEnum(ProviderType)
  providerType: ProviderType; // dhub, talabat, careem, deliveroo, jahez, etc.

  @IsObject()
  configuration: Record<string, any>; // API URLs, client IDs, merchant IDs

  @IsObject()
  credentials: Record<string, any>; // API keys, OAuth tokens, secrets

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsOptional()
  priority?: number = 1;

  @IsOptional()
  maxDistance?: number = 15;

  @IsOptional()
  baseFee?: number = 2.5;

  @IsOptional()
  feePerKm?: number = 0.5;

  @IsOptional()
  avgDeliveryTime?: number = 30;
}
```

#### CreateBranchProviderMappingDto
```typescript
export class CreateBranchProviderMappingDto {
  @IsUUID()
  branchId: string;

  @IsUUID()
  companyProviderConfigId: string; // Links to company config

  @IsString()
  providerBranchId: string; // Provider's identifier for this branch

  @IsString()
  @IsOptional()
  providerSiteId?: string; // Additional provider identifier

  @IsObject()
  @IsOptional()
  branchConfiguration?: Record<string, any>; // Provider-specific config

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsNumber()
  @IsOptional()
  priority?: number = 1;

  @IsNumber()
  @IsOptional()
  minOrderValue?: number;

  @IsNumber()
  @IsOptional()
  maxOrderValue?: number;

  @IsOptional()
  supportedPaymentMethods?: string[]; // ['cash', 'card', 'online']
}
```

---

## 2. Frontend Architecture (Port 3000)

### 2.1 Current Implementation (Incorrect)

**File**: `/frontend/src/lib/integration-api.ts`

```typescript
// ❌ WRONG: Calls non-existent integration service on port 3002
const integrationServiceApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_INTEGRATION_API_URL || 'http://localhost:3002',
  timeout: 30000
})

export const branchConfig = {
  get: async (branchId: string, providerId: string) => {
    // ❌ WRONG: This endpoint doesn't exist
    const { data } = await integrationServiceApi.get(
      `/branches/${branchId}/providers/${providerId}`
    )
    return data
  },

  save: async (branchId: string, providerId: string, config: Partial<BranchDeliveryConfig>) => {
    // ❌ WRONG: This endpoint doesn't exist
    const { data } = await integrationServiceApi.post(
      `/branches/${branchId}/providers/${providerId}`,
      config
    )
    return data
  },

  delete: async (branchId: string, providerId: string) => {
    // ❌ WRONG: This endpoint doesn't exist
    await integrationServiceApi.delete(
      `/branches/${branchId}/providers/${providerId}`
    )
  }
}
```

### 2.2 Correct Implementation (Required)

**File**: `/frontend/src/lib/integration-api.ts` (needs update)

```typescript
// ✅ CORRECT: Use main API on port 3001
const integrationApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 30000,
  withCredentials: true
})

export const branchConfig = {
  // Get existing branch mapping
  get: async (branchId: string, companyProviderConfigId: string) => {
    try {
      const { data } = await integrationApi.get('/delivery/branch-provider-mappings', {
        params: { branchId, companyProviderConfigId }
      })
      // Return first match or null
      return data.length > 0 ? data[0] : null
    } catch (error) {
      if (error.response?.status === 404) return null
      throw error
    }
  },

  // Create or update branch mapping
  save: async (branchId: string, companyProviderConfigId: string, config: BranchMappingConfig) => {
    // Check if mapping exists
    const existing = await branchConfig.get(branchId, companyProviderConfigId)

    if (existing) {
      // Update existing mapping
      const { data } = await integrationApi.patch(
        `/delivery/branch-provider-mappings/${existing.id}`,
        config
      )
      return data
    } else {
      // Create new mapping
      const { data } = await integrationApi.post(
        '/delivery/branch-provider-mappings',
        {
          branchId,
          companyProviderConfigId,
          ...config
        }
      )
      return data
    }
  },

  // Delete branch mapping (soft delete)
  delete: async (branchId: string, companyProviderConfigId: string) => {
    const existing = await branchConfig.get(branchId, companyProviderConfigId)
    if (existing) {
      await integrationApi.patch(
        `/delivery/branch-provider-mappings/${existing.id}`,
        { isActive: false }
      )
    }
  }
}
```

---

### 2.3 Frontend Page Implementation

**File**: `/frontend/pages/integration/branch-config.tsx`

**Current Issues**:
1. Uses wrong API client (`integrationServiceApi` on port 3002)
2. Expects `providerId` but should use `companyProviderConfigId`
3. Missing provider config selection flow
4. No company-level config management

**Required Changes**:

```typescript
export default function BranchConfigPage() {
  const { user } = useAuth()
  const [selectedBranch, setSelectedBranch] = useState(user?.branchId || '')
  const [selectedCompanyConfig, setSelectedCompanyConfig] = useState('')

  // 1. Load company provider configs (not providers directly)
  const { data: companyConfigs } = useQuery({
    queryKey: ['company-provider-configs', user?.companyId],
    queryFn: () => integrationApi.get('/delivery/company-provider-configs', {
      params: { companyId: user?.companyId, activeOnly: true }
    }),
    enabled: !!user?.companyId
  })

  // 2. Load existing branch mapping
  const { data: branchMapping, isLoading } = useQuery({
    queryKey: ['branch-mapping', selectedBranch, selectedCompanyConfig],
    queryFn: () => branchConfig.get(selectedBranch, selectedCompanyConfig),
    enabled: !!selectedBranch && !!selectedCompanyConfig
  })

  // 3. Initialize form with provider-specific fields
  useEffect(() => {
    if (branchMapping) {
      const config = branchMapping.branchConfiguration
      setConfigData({
        providerBranchId: branchMapping.providerBranchId,
        providerSiteId: branchMapping.providerSiteId,
        ...config // Provider-specific fields
      })
    }
  }, [branchMapping])

  // 4. Save mapping with correct structure
  const saveMutation = useMutation({
    mutationFn: () => branchConfig.save(selectedBranch, selectedCompanyConfig, {
      providerBranchId: configData.providerBranchId,
      providerSiteId: configData.providerSiteId,
      branchConfiguration: {
        siteId: configData.siteId,
        brandId: configData.brandId,
        menuId: configData.menuId,
        webhookSecret: configData.webhookSecret,
        autoAccept: configData.autoAccept,
        autoPrint: configData.autoPrint
      },
      isActive: true,
      priority: 1
    })
  })
}
```

---

## 3. Configuration Flow Architecture

### 3.1 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Super Admin Actions                          │
│  (Company-Level Configuration - One-Time Setup)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /delivery/company-provider-configs                        │
│  {                                                               │
│    "companyId": "company-uuid",                                 │
│    "providerType": "deliveroo",                                 │
│    "configuration": {                                           │
│      "apiBaseUrl": "https://api.deliveroo.com/v1",             │
│      "clientId": "deliveroo_client_123"                         │
│    },                                                           │
│    "credentials": {                                             │
│      "accessToken": "oauth_token_xyz",                          │
│      "refreshToken": "refresh_token_abc"                        │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CompanyProviderConfig Created                                  │
│  id: "config-uuid-123"                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         Branch Manager / Company Owner Actions                  │
│  (Branch-Level Configuration - Per Location)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  POST /delivery/branch-provider-mappings                        │
│  {                                                               │
│    "branchId": "branch-downtown-uuid",                          │
│    "companyProviderConfigId": "config-uuid-123",                │
│    "providerBranchId": "deliveroo_store_xyz",                   │
│    "providerSiteId": "site_uuid_123",                           │
│    "branchConfiguration": {                                     │
│      "siteId": "site_uuid_123",                                 │
│      "brandId": "brand_uuid_456",                               │
│      "menuId": "menu_uuid_789",                                 │
│      "webhookSecret": "secret_key_abc",                         │
│      "autoAccept": true,                                        │
│      "autoPrint": false                                         │
│    },                                                           │
│    "isActive": true,                                            │
│    "priority": 1                                                │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BranchProviderMapping Created                                  │
│  Branch can now receive orders from Deliveroo                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Provider-Specific Configuration Schemas

#### Deliveroo Configuration
```typescript
interface DeliverooConfig {
  // Required IDs
  siteId: string          // Deliveroo location UUID
  brandId: string         // Deliveroo brand UUID
  menuId: string          // Menu UUID (generated after sync)

  // Security
  webhookSecret: string   // HMAC-SHA256 signing secret

  // Automation
  autoAccept: boolean     // Auto-accept incoming orders
  autoPrint: boolean      // Auto-print order tickets
}

// Company-level (OAuth 2.0)
{
  "configuration": {
    "apiBaseUrl": "https://api.deliveroo.com/v1",
    "clientId": "client_abc123"
  },
  "credentials": {
    "accessToken": "Bearer oauth_token",
    "refreshToken": "refresh_token",
    "tokenExpiresAt": "2025-12-31T23:59:59Z"
  }
}

// Branch-level
{
  "branchConfiguration": {
    "siteId": "site-uuid-123",
    "brandId": "brand-uuid-456",
    "menuId": "menu-uuid-789",
    "webhookSecret": "hmac-secret",
    "autoAccept": true,
    "autoPrint": false
  }
}
```

---

#### Jahez Configuration
```typescript
interface JahezConfig {
  // Required IDs
  branchId: string        // Jahez branch UUID
  excludeBranches: string[] // Branch IDs to exclude from sync

  // Automation
  autoAccept: boolean
  autoPrint: boolean
}

// Company-level (API Key)
{
  "configuration": {
    "apiBaseUrl": "https://api.jahez.com/v1"
  },
  "credentials": {
    "apiKey": "jahez_api_key_xyz"
  }
}

// Branch-level
{
  "branchConfiguration": {
    "branchId": "jahez-branch-uuid",
    "excludeBranches": ["branch-1", "branch-2"],
    "autoAccept": false,
    "autoPrint": true
  }
}
```

---

#### Careem Configuration
```typescript
interface CareemConfig {
  storeId: string         // Careem store identifier
  menuId: string          // Menu synchronization ID
  autoAccept: boolean
  autoPrint: boolean
}

// Company-level
{
  "configuration": {
    "apiBaseUrl": "https://api.careem.com/v1",
    "merchantId": "merchant_123"
  },
  "credentials": {
    "apiKey": "careem_api_key"
  }
}

// Branch-level
{
  "branchConfiguration": {
    "storeId": "careem-store-xyz",
    "menuId": "menu-id-abc",
    "autoAccept": true,
    "autoPrint": true
  }
}
```

---

#### Talabat Configuration
```typescript
interface TalabatConfig {
  restaurantId: string    // Talabat restaurant identifier
  menuId: string          // Menu sync ID
  autoAccept: boolean
  autoPrint: boolean
}

// Company-level
{
  "configuration": {
    "apiBaseUrl": "https://api.talabat.com/v1",
    "vendorId": "vendor_456"
  },
  "credentials": {
    "apiKey": "talabat_api_key"
  }
}

// Branch-level
{
  "branchConfiguration": {
    "restaurantId": "talabat-restaurant-id",
    "menuId": "menu-sync-id",
    "autoAccept": false,
    "autoPrint": true
  }
}
```

---

## 4. Integration Gaps & Required Fixes

### 4.1 Critical Issues

| Issue | Impact | Status |
|-------|--------|--------|
| **Frontend uses non-existent API** | Branch config page completely non-functional | 🔴 Critical |
| **Wrong endpoint structure** | Cannot save or retrieve branch configurations | 🔴 Critical |
| **Missing company config selection** | Users can't link branches to provider configs | 🔴 Critical |
| **Incorrect data transformation** | Provider-specific fields not mapped correctly | 🟡 High |

---

### 4.2 Required Frontend Changes

#### File: `/frontend/src/lib/integration-api.ts`

**Changes Required**:
1. Remove `integrationServiceApi` client (port 3002 doesn't exist)
2. Update `branchConfig` methods to use `/delivery/branch-provider-mappings`
3. Add `companyProviderConfig` methods for company-level config management
4. Update type definitions to match backend DTOs

**New Implementation**:
```typescript
// Company Provider Configuration
export const companyProviderConfig = {
  getAll: async (companyId: string, providerType?: string) => {
    const { data } = await integrationApi.get('/delivery/company-provider-configs', {
      params: { companyId, providerType, activeOnly: true }
    })
    return data
  },

  getById: async (id: string) => {
    const { data } = await integrationApi.get(`/delivery/company-provider-configs/${id}`)
    return data
  },

  create: async (config: CreateCompanyProviderConfigDto) => {
    const { data } = await integrationApi.post('/delivery/company-provider-configs', config)
    return data
  },

  update: async (id: string, updates: Partial<CreateCompanyProviderConfigDto>) => {
    const { data } = await integrationApi.patch(`/delivery/company-provider-configs/${id}`, updates)
    return data
  }
}

// Branch Provider Mapping (corrected)
export const branchProviderMapping = {
  getAll: async (branchId?: string, companyId?: string, providerType?: string) => {
    const { data } = await integrationApi.get('/delivery/branch-provider-mappings', {
      params: { branchId, companyId, providerType }
    })
    return data
  },

  create: async (mapping: CreateBranchProviderMappingDto) => {
    const { data } = await integrationApi.post('/delivery/branch-provider-mappings', mapping)
    return data
  },

  update: async (id: string, updates: Partial<CreateBranchProviderMappingDto>) => {
    const { data } = await integrationApi.patch(`/delivery/branch-provider-mappings/${id}`, updates)
    return data
  }
}
```

---

#### File: `/frontend/pages/integration/branch-config.tsx`

**Changes Required**:
1. Replace provider selection with company config selection
2. Update form to include `providerBranchId` and `providerSiteId`
3. Properly structure `branchConfiguration` JSON field
4. Add validation for required provider-specific fields
5. Handle create vs update logic based on existing mapping

**New Component Structure**:
```typescript
export default function BranchConfigPage() {
  const { user } = useAuth()
  const [selectedBranch, setSelectedBranch] = useState(user?.branchId || '')
  const [selectedConfig, setSelectedConfig] = useState('') // companyProviderConfigId

  // Load company configs instead of providers
  const { data: companyConfigs } = useQuery({
    queryKey: ['company-provider-configs', user?.companyId],
    queryFn: () => companyProviderConfig.getAll(user?.companyId)
  })

  // Load existing branch mapping
  const { data: existingMapping } = useQuery({
    queryKey: ['branch-mapping', selectedBranch, selectedConfig],
    queryFn: async () => {
      const mappings = await branchProviderMapping.getAll(selectedBranch)
      return mappings.find(m => m.companyProviderConfigId === selectedConfig)
    },
    enabled: !!selectedBranch && !!selectedConfig
  })

  // Form state
  const [formData, setFormData] = useState({
    providerBranchId: '',
    providerSiteId: '',
    branchConfiguration: {
      // Provider-specific fields populated based on provider type
    }
  })

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (existingMapping) {
        return branchProviderMapping.update(existingMapping.id, formData)
      } else {
        return branchProviderMapping.create({
          branchId: selectedBranch,
          companyProviderConfigId: selectedConfig,
          ...formData
        })
      }
    }
  })
}
```

---

### 4.3 Type Definition Updates

**File**: `/frontend/src/types/integration.ts`

**Add Missing Types**:
```typescript
export interface CompanyProviderConfig {
  id: string
  companyId: string
  providerType: string
  configuration: Record<string, any>
  credentials: Record<string, any>
  isActive: boolean
  priority: number
  maxDistance: number
  baseFee: number
  feePerKm: number
  avgDeliveryTime: number
  createdAt: string
  updatedAt: string
  deletedAt?: string

  // Relations
  company?: {
    id: string
    name: string
    slug: string
  }
  branchMappings?: BranchProviderMapping[]
  _count?: {
    branchMappings: number
    providerOrders: number
  }
}

export interface BranchProviderMapping {
  id: string
  branchId: string
  companyProviderConfigId: string
  providerBranchId: string
  providerSiteId?: string
  branchConfiguration: Record<string, any>
  isActive: boolean
  priority: number
  minOrderValue?: number
  maxOrderValue?: number
  supportedPaymentMethods: string[]
  createdAt: string
  updatedAt: string
  deletedAt?: string

  // Relations
  branch?: {
    id: string
    name: string
    nameAr: string
    address: string
    company?: {
      id: string
      name: string
    }
  }
  companyProviderConfig?: {
    id: string
    providerType: string
    isActive: boolean
    maxDistance: number
    baseFee: number
    avgDeliveryTime: number
  }
}

export interface CreateBranchProviderMappingDto {
  branchId: string
  companyProviderConfigId: string
  providerBranchId: string
  providerSiteId?: string
  branchConfiguration?: Record<string, any>
  isActive?: boolean
  priority?: number
  minOrderValue?: number
  maxOrderValue?: number
  supportedPaymentMethods?: string[]
}
```

---

## 5. Implementation Roadmap

### Phase 1: API Client Updates (1-2 hours)
- [ ] Remove `integrationServiceApi` from `integration-api.ts`
- [ ] Add `companyProviderConfig` methods
- [ ] Update `branchConfig` to `branchProviderMapping` with correct endpoints
- [ ] Add missing type definitions

### Phase 2: Branch Config Page Refactor (2-3 hours)
- [ ] Update state management (branch + companyConfig selection)
- [ ] Load company configs instead of providers
- [ ] Update form structure with `providerBranchId` and `providerSiteId`
- [ ] Properly structure `branchConfiguration` JSON field
- [ ] Add create vs update logic

### Phase 3: Provider-Specific Forms (2-3 hours)
- [ ] Create provider-specific form components
- [ ] Add field validation per provider
- [ ] Display correct fields based on provider type
- [ ] Add helper text and examples

### Phase 4: Testing & Validation (1-2 hours)
- [ ] Test Deliveroo configuration flow
- [ ] Test Jahez configuration flow
- [ ] Test Careem configuration flow
- [ ] Test Talabat configuration flow
- [ ] Verify data structure in database

---

## 6. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          DELIVERY PROVIDER ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js - Port 3000)                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  Branch Config Page (/integration/branch-config)                         │  │
│  │                                                                            │  │
│  │  1. Select Branch                                                         │  │
│  │  2. Select Company Provider Config (not provider directly!)              │  │
│  │  3. Configure provider-specific fields:                                  │  │
│  │     - Deliveroo: siteId, brandId, menuId, webhookSecret                 │  │
│  │     - Jahez: branchId, excludeBranches                                   │  │
│  │     - Careem: storeId, menuId                                            │  │
│  │     - Talabat: restaurantId, menuId                                      │  │
│  │  4. Set automation: autoAccept, autoPrint                                │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                  │                                               │
│                                  ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  API Client (integration-api.ts)                                         │  │
│  │                                                                            │  │
│  │  • companyProviderConfig.getAll(companyId)                               │  │
│  │  • branchProviderMapping.create({ branchId, companyProviderConfigId })  │  │
│  │  • branchProviderMapping.update(id, updates)                             │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────┬───────────────────────────────────────────┘
                                       │
                                       │ HTTP REST API
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS - Port 3001)                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  DeliveryController (/api/v1/delivery)                                   │  │
│  │                                                                            │  │
│  │  Company Configs:                                                         │  │
│  │  POST   /company-provider-configs                                        │  │
│  │  GET    /company-provider-configs?companyId=X                            │  │
│  │  PATCH  /company-provider-configs/:id                                    │  │
│  │                                                                            │  │
│  │  Branch Mappings:                                                         │  │
│  │  POST   /branch-provider-mappings                                        │  │
│  │  GET    /branch-provider-mappings?branchId=X&companyId=Y                │  │
│  │  PATCH  /branch-provider-mappings/:id                                    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                  │                                               │
│                                  ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  DeliveryService                                                          │  │
│  │                                                                            │  │
│  │  • createCompanyProviderConfig()                                         │  │
│  │  • findAllCompanyProviderConfigs()                                       │  │
│  │  • createBranchProviderMapping()                                         │  │
│  │  • findAllBranchProviderMappings()                                       │  │
│  │  • updateBranchProviderMapping()                                         │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                  │                                               │
│                                  ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  Prisma ORM                                                               │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL - postgres)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────┐   ┌───────────────────────────────┐  │
│  │  company_provider_configs            │   │  branch_provider_mappings     │  │
│  │                                      │   │                               │  │
│  │  id                                  │   │  id                           │  │
│  │  company_id                          │   │  branch_id                    │  │
│  │  provider_type                       │   │  company_provider_config_id ──┼──┤
│  │  configuration (JSON)                │   │  provider_branch_id           │  │
│  │  credentials (JSON)                  │   │  provider_site_id             │  │
│  │  is_active                           │   │  branch_configuration (JSON)  │  │
│  │  priority                            │   │  is_active                    │  │
│  │  max_distance                        │   │  priority                     │  │
│  │  base_fee                            │   │  min_order_value              │  │
│  │  fee_per_km                          │   │  max_order_value              │  │
│  │  avg_delivery_time                   │   │  supported_payment_methods    │  │
│  └──────────────────────────────────────┘   └───────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

CONFIGURATION LEVELS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. COMPANY LEVEL (company_provider_configs)
   ├── Global credentials (OAuth tokens, API keys)
   ├── Provider configuration (API URLs, client IDs)
   ├── Default logistics (delivery time, fees, distance)
   └── Access: super_admin only

2. BRANCH LEVEL (branch_provider_mappings)
   ├── Provider-specific identifiers (store ID, site ID, menu ID)
   ├── Branch automation settings (auto-accept, auto-print)
   ├── Order constraints (min/max value)
   ├── Payment methods
   └── Access: super_admin, company_owner, branch_manager

PROVIDER-SPECIFIC CONFIGURATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deliveroo (OAuth 2.0):
  Company: { accessToken, refreshToken, clientId, clientSecret }
  Branch:  { siteId, brandId, menuId, webhookSecret, autoAccept, autoPrint }

Jahez (API Key):
  Company: { apiKey }
  Branch:  { branchId, excludeBranches[], autoAccept, autoPrint }

Careem (API Key):
  Company: { apiKey, merchantId }
  Branch:  { storeId, menuId, autoAccept, autoPrint }

Talabat (API Key):
  Company: { apiKey, vendorId }
  Branch:  { restaurantId, menuId, autoAccept, autoPrint }
```

---

## 7. Testing Checklist

### Backend Testing
- [ ] Create company provider config (super_admin)
- [ ] List company configs filtered by company
- [ ] List company configs filtered by provider type
- [ ] Update company config (super_admin)
- [ ] Delete company config (verify active mapping check)
- [ ] Create branch mapping with valid config
- [ ] Create branch mapping with invalid config (expect error)
- [ ] Create duplicate branch mapping (expect error)
- [ ] List branch mappings filtered by branch
- [ ] List branch mappings filtered by company
- [ ] List branch mappings filtered by provider type
- [ ] Update branch mapping
- [ ] Verify JSON field structure for each provider type

### Frontend Testing
- [ ] Load company provider configs for current company
- [ ] Display config list with provider type
- [ ] Select branch and company config
- [ ] Load existing branch mapping
- [ ] Display provider-specific form fields
- [ ] Save new branch mapping
- [ ] Update existing branch mapping
- [ ] Delete branch mapping
- [ ] Validate required fields per provider
- [ ] Test Deliveroo configuration flow
- [ ] Test Jahez configuration flow
- [ ] Test Careem configuration flow
- [ ] Test Talabat configuration flow

---

## 8. Conclusion

### Current State
- ✅ Backend architecture fully implemented
- ✅ Database schema complete with proper relations
- ✅ API endpoints functioning correctly
- ❌ Frontend calling non-existent API (port 3002)
- ❌ Incorrect data flow and structure

### Required Actions
1. **Update Frontend API Client** (Critical Priority)
   - Remove references to port 3002
   - Implement correct endpoint calls
   - Add company config management

2. **Refactor Branch Config Page** (High Priority)
   - Add company config selection
   - Update form structure
   - Properly handle create vs update

3. **Add Type Definitions** (Medium Priority)
   - Complete TypeScript interfaces
   - Match backend DTOs exactly

### Estimated Effort
- **Total**: 6-10 hours
- **Backend**: 0 hours (complete)
- **Frontend**: 6-10 hours (critical updates needed)

### Success Criteria
- ✅ Branch managers can configure delivery providers
- ✅ Provider-specific fields saved correctly
- ✅ Branch mappings linked to company configs
- ✅ Auto-accept and auto-print settings functional
- ✅ Multiple branches can use same company config
- ✅ Provider credentials isolated at company level

---

**Generated**: October 1, 2025
**Status**: Analysis Complete - Implementation Required
**Next Step**: Frontend API client refactor and branch config page update
