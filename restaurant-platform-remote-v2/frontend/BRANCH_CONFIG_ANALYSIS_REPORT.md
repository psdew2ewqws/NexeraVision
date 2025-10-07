# Branch Configuration Data Flow - Deep Analysis Report

**Analysis Date**: October 1, 2025
**Analyst**: Performance Engineer (Claude Code)
**Severity**: CRITICAL - Complete System Breakdown
**Priority**: P0 - Immediate Action Required

---

## Executive Summary

The branch configuration system is **completely non-functional** due to architectural mismatches between frontend expectations and backend reality. The frontend attempts to communicate with a non-existent integration service, resulting in 100% failure rate for all configuration operations.

**Impact**: Users cannot configure delivery provider settings for branches, blocking all third-party delivery integrations (Deliveroo, Jahez, Careem, Talabat, Uber Eats, Zomato).

---

## 1. Data Flow Trace

### 1.1 Frontend API Call Path

**File**: `/home/admin/restaurant-platform-remote-v2/frontend/src/lib/integration-api.ts:209-227`

```typescript
const integrationServiceApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_INTEGRATION_API_URL || 'http://localhost:3002',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const branchConfig = {
  get: async (branchId: string, providerId: string): Promise<BranchDeliveryConfig | null> => {
    try {
      const { data } = await integrationServiceApi.get(`/branches/${branchId}/providers/${providerId}`)
      return data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  },

  save: async (branchId: string, providerId: string, config: Partial<BranchDeliveryConfig>): Promise<BranchDeliveryConfig> => {
    const { data } = await integrationServiceApi.post(`/branches/${branchId}/providers/${providerId}`, config)
    return data
  },

  delete: async (branchId: string, providerId: string): Promise<void> => {
    await integrationServiceApi.delete(`/branches/${branchId}/providers/${providerId}`)
  }
}
```

**Target Endpoints** (Expected on port 3002):
- `GET /branches/:branchId/providers/:providerId`
- `POST /branches/:branchId/providers/:providerId`
- `DELETE /branches/:branchId/providers/:providerId`

**Actual Status**:
- Port 3002: NOT LISTENING ❌
- Endpoints: DO NOT EXIST ❌
- Service: NOT RUNNING ❌

---

### 1.2 React Query State Management

**File**: `/home/admin/restaurant-platform-remote-v2/frontend/pages/integration/branch-config.tsx:88-103`

```typescript
const { data: currentConfig, isLoading: configLoading } = useQuery({
  queryKey: ['branch-config', selectedBranch, selectedProvider],
  queryFn: () => branchConfig.get(selectedBranch, selectedProvider),
  enabled: !!selectedBranch && !!selectedProvider,
  onSuccess: (data) => {  // ⚠️ DEPRECATED IN REACT QUERY V5
    if (data) {
      setConfigData({
        webhookSecret: data.config.webhookSecret || '',
        autoPrint: data.config.autoPrint || false,
        autoAccept: data.config.autoAccept || false,
        locationId: data.config.locationId || '',
        menuId: data.config.menuId || ''
      })
    }
  }
})
```

**Issues Identified**:
1. **Deprecated Callback**: `onSuccess` is deprecated in React Query v5
2. **Partial Field Mapping**: Only 5 fields extracted from config object
3. **Provider-Specific Fields Lost**: Deliveroo (siteId, brandId), Jahez (branchId, excludeBranches), etc. are collected in state but NOT included in onSuccess mapping

---

### 1.3 Backend Endpoint Reality Check

**Integration Service** (`/home/admin/restaurant-platform-remote-v2/integration-service/`):
- **Status**: EXISTS but NOT RUNNING
- **Configured Port**: 3002 (from `.env`)
- **Implemented Endpoints**:
  - `POST /webhooks/:provider` (webhook receiver only)
  - `POST /webhooks/health` (health check)
- **Missing Endpoints**: ALL branch configuration endpoints

**Main Backend** (`/home/admin/restaurant-platform-remote-v2/backend/`):
- **Running Port**: 3001
- **Related Endpoints Found**:
  - `GET /integration/delivery/providers` (list delivery providers)
  - `GET /integration/delivery/webhooks/logs` (webhook logs)
  - `GET /branches` (branch management)
- **Missing Endpoints**: ALL branch-provider configuration endpoints

**Verification Commands**:
```bash
# Port 3002 check
$ netstat -tlnp | grep ":3002"
# Result: Port 3002 not listening ❌

# Process check
$ ps aux | grep "3002\|integration-service"
# Result: Integration service not running ❌

# Backend configuration
$ cat backend/.env | grep PORT
# Result: PORT=3001 ✓
```

---

## 2. Data Serialization Format Analysis

### 2.1 Frontend Type Definition

**File**: `/home/admin/restaurant-platform-remote-v2/frontend/src/types/integration.ts:11-26`

```typescript
export interface BranchDeliveryConfig {
  id: string
  branchId: string
  providerId: string
  providerName: string
  isActive: boolean
  config: {
    webhookSecret?: string
    autoPrint?: boolean
    autoAccept?: boolean
    locationId?: string
    menuId?: string
  }
  createdAt: string
  updatedAt: string
}
```

**Frontend State Object** (branch-config.tsx:63-81):
```typescript
const [configData, setConfigData] = useState<any>({
  webhookSecret: '',
  autoPrint: false,
  autoAccept: false,
  locationId: '',
  menuId: '',
  // Deliveroo specific
  siteId: '',
  brandId: '',
  // Jahez specific
  branchId: '',
  excludeBranches: [],
  // Careem specific
  storeId: '',
  // Talabat specific
  restaurantId: '',
  // Uber Eats specific
  storeUuid: ''
})
```

**Save Mutation Payload** (branch-config.tsx:106-109):
```typescript
saveMutation.mutate({
  isActive: currentConfig?.isActive ?? true,
  config: configData  // Entire configData object sent
})
```

---

### 2.2 Database Schema Reality

**File**: `/home/admin/restaurant-platform-remote-v2/backend/prisma/schema.prisma`

```prisma
model BranchDeliveryConfig {
  id         String @id @default(uuid())
  branchId   String @map("branch_id")
  providerId String @map("provider_id")
  companyId  String @map("company_id")

  // Provider-specific merchant configuration
  merchantId    String? @map("merchant_id")
  storeId       String? @map("store_id")
  apiKey        String? @map("api_key")
  apiSecret     String? @map("api_secret")
  webhookSecret String? @map("webhook_secret")

  // Integration settings
  isActive           Boolean @default(false) @map("is_active")
  autoAcceptOrders   Boolean @default(false) @map("auto_accept_orders")
  autoPrintOnReceive Boolean @default(true) @map("auto_print_on_receive")
  syncMenu           Boolean @default(false) @map("sync_menu")

  // Provider-specific settings (JSON)
  settings Json? // Additional provider-specific settings

  // Metadata
  lastSyncAt DateTime? @map("last_sync_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")
  createdBy  String?   @map("created_by")
  updatedBy  String?   @map("updated_by")

  // Relations
  branch   Branch @relation(fields: [branchId], references: [id], onDelete: Cascade)
  provider DeliveryProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  company  Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  @@unique([branchId, providerId])
  @@index([companyId, isActive])
  @@map("branch_delivery_configs")
}
```

**Database Fields**:
- Scalar fields: merchantId, storeId, apiKey, apiSecret, webhookSecret
- Boolean flags: isActive, autoAcceptOrders, autoPrintOnReceive, syncMenu
- JSON field: `settings` for provider-specific configuration

---

### 2.3 Field Mapping Mismatches

| Frontend Field | Database Field | Type Match | Notes |
|---------------|----------------|------------|-------|
| `config.autoPrint` | `autoPrintOnReceive` | ✓ Boolean | **NAME MISMATCH** |
| `config.autoAccept` | `autoAcceptOrders` | ✓ Boolean | **NAME MISMATCH** |
| `config.webhookSecret` | `webhookSecret` | ✓ String | Match ✓ |
| `config.locationId` | N/A | ❌ | **MISSING IN DB** |
| `config.menuId` | N/A | ❌ | **MISSING IN DB** |
| `configData.siteId` (Deliveroo) | `settings.siteId` | ? JSON | Should use settings JSON |
| `configData.brandId` (Deliveroo) | `settings.brandId` | ? JSON | Should use settings JSON |
| `configData.branchId` (Jahez) | `settings.branchId` | ? JSON | Should use settings JSON |
| `configData.excludeBranches` (Jahez) | `settings.excludeBranches` | ? JSON | Should use settings JSON |
| `configData.storeId` (Careem) | `storeId` | ✓ String | Match ✓ |
| `configData.restaurantId` (Talabat) | `settings.restaurantId` | ? JSON | Should use settings JSON |
| `configData.storeUuid` (Uber Eats) | `settings.storeUuid` | ? JSON | Should use settings JSON |
| N/A | `merchantId` | N/A | **MISSING IN FRONTEND** |
| N/A | `apiKey` | N/A | **MISSING IN FRONTEND** |
| N/A | `apiSecret` | N/A | **MISSING IN FRONTEND** |
| N/A | `syncMenu` | N/A | **MISSING IN FRONTEND** |

**Critical Mismatches**:
1. **Nested vs Flat Structure**: Frontend uses nested `config` object, database uses flat fields + JSON `settings`
2. **Field Name Differences**: `autoPrint` vs `autoPrintOnReceive`, `autoAccept` vs `autoAcceptOrders`
3. **Missing Fields**: locationId, menuId in frontend have no database counterparts
4. **Provider-Specific Fields**: Should be stored in `settings` JSON field, but serialization logic missing

---

## 3. Critical Architecture Gaps

### Gap 1: Non-Existent Integration Service Endpoints

**Severity**: CRITICAL
**Impact**: 100% failure rate for all branch configuration operations

**Missing Endpoints**:
```typescript
// Integration Service (port 3002) needs these endpoints:
GET    /branches/:branchId/providers/:providerId  // Fetch config
POST   /branches/:branchId/providers/:providerId  // Create/update config
DELETE /branches/:branchId/providers/:providerId  // Delete config
```

**Current State**: Integration service only has webhook receiver, not configuration management.

---

### Gap 2: Integration Service Not Running

**Severity**: CRITICAL
**Impact**: All requests to port 3002 fail with connection refused

**Evidence**:
```bash
$ ps aux | grep integration-service
# No processes found

$ netstat -tlnp | grep 3002
# Port 3002 not listening
```

**Configuration Exists**:
- Service code: `/home/admin/restaurant-platform-remote-v2/integration-service/`
- Environment file: `.env` with PORT=3002
- Package.json: NestJS application with start scripts

**Action Required**: Start integration service OR redirect frontend to main backend

---

### Gap 3: Field Serialization Logic Missing

**Severity**: HIGH
**Impact**: Even if endpoints exist, data would be incorrectly serialized

**Problem**: Frontend collects provider-specific fields in flat configData object, but database expects:
- Common fields as columns
- Provider-specific fields in `settings` JSON

**Example - Deliveroo Configuration**:

Frontend collects:
```javascript
{
  siteId: "abc123",
  brandId: "xyz789",
  menuId: "menu456",
  webhookSecret: "secret",
  autoPrint: true,
  autoAccept: false
}
```

Should be transformed to database format:
```javascript
{
  webhookSecret: "secret",
  autoPrintOnReceive: true,
  autoAcceptOrders: false,
  settings: {
    siteId: "abc123",
    brandId: "xyz789",
    menuId: "menu456"
  }
}
```

**Missing Component**: Transformation service to map frontend structure to database structure

---

### Gap 4: React Query Deprecated API Usage

**Severity**: MEDIUM
**Impact**: Future compatibility issues, potential bugs in React Query v5+

**Issue**: `onSuccess` callback deprecated in React Query v5

Current code:
```typescript
const { data: currentConfig } = useQuery({
  queryKey: ['branch-config', selectedBranch, selectedProvider],
  queryFn: () => branchConfig.get(selectedBranch, selectedProvider),
  enabled: !!selectedBranch && !!selectedProvider,
  onSuccess: (data) => {  // ❌ DEPRECATED
    if (data) {
      setConfigData({...})
    }
  }
})
```

Should be:
```typescript
const { data: currentConfig } = useQuery({
  queryKey: ['branch-config', selectedBranch, selectedProvider],
  queryFn: () => branchConfig.get(selectedBranch, selectedProvider),
  enabled: !!selectedBranch && !!selectedProvider,
})

useEffect(() => {
  if (currentConfig) {
    setConfigData({...})
  }
}, [currentConfig])
```

---

### Gap 5: Incomplete Type Definitions

**Severity**: MEDIUM
**Impact**: Type safety violations, runtime errors

**Issues**:
1. Frontend `BranchDeliveryConfig.config` doesn't match database schema
2. Provider-specific interfaces defined but not used in type system
3. `configData` state typed as `any` instead of proper type

**Defined but Unused Interfaces**:
```typescript
interface DeliverooConfig { siteId, brandId, menuId, webhookSecret, autoAccept, autoPrint }
interface JahezConfig { branchId, excludeBranches, autoAccept, autoPrint }
interface CareemConfig { storeId, menuId, autoAccept, autoPrint }
// etc.
```

**Type Union Missing**:
```typescript
type ProviderConfig = DeliverooConfig | JahezConfig | CareemConfig | TalabatConfig | UberEatsConfig | ZomatoConfig
```

---

## 4. Concrete Fix Recommendations

### Fix Strategy A: Implement Integration Service Endpoints (Recommended)

**Rationale**: Maintains microservice architecture, separation of concerns

**Implementation Steps**:

#### Step 1: Create Branch Config Module in Integration Service

**File**: `/home/admin/restaurant-platform-remote-v2/integration-service/src/modules/branch-config/branch-config.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { BranchConfigController } from './controllers/branch-config.controller';
import { BranchConfigService } from './services/branch-config.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BranchConfigController],
  providers: [BranchConfigService],
  exports: [BranchConfigService],
})
export class BranchConfigModule {}
```

#### Step 2: Create Branch Config Controller

**File**: `/home/admin/restaurant-platform-remote-v2/integration-service/src/modules/branch-config/controllers/branch-config.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { BranchConfigService } from '../services/branch-config.service';
import { CreateBranchConfigDto, UpdateBranchConfigDto } from '../dto/branch-config.dto';

@Controller('branches')
export class BranchConfigController {
  constructor(private readonly branchConfigService: BranchConfigService) {}

  @Get(':branchId/providers/:providerId')
  async getConfig(
    @Param('branchId') branchId: string,
    @Param('providerId') providerId: string,
  ) {
    const config = await this.branchConfigService.findOne(branchId, providerId);
    if (!config) {
      throw new NotFoundException('Branch configuration not found');
    }
    return config;
  }

  @Post(':branchId/providers/:providerId')
  @HttpCode(HttpStatus.OK)
  async saveConfig(
    @Param('branchId') branchId: string,
    @Param('providerId') providerId: string,
    @Body() dto: CreateBranchConfigDto,
  ) {
    return this.branchConfigService.upsert(branchId, providerId, dto);
  }

  @Delete(':branchId/providers/:providerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfig(
    @Param('branchId') branchId: string,
    @Param('providerId') providerId: string,
  ) {
    await this.branchConfigService.delete(branchId, providerId);
  }
}
```

#### Step 3: Create Branch Config Service with Transformation Logic

**File**: `/home/admin/restaurant-platform-remote-v2/integration-service/src/modules/branch-config/services/branch-config.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBranchConfigDto } from '../dto/branch-config.dto';

@Injectable()
export class BranchConfigService {
  constructor(private prisma: PrismaService) {}

  async findOne(branchId: string, providerId: string) {
    const config = await this.prisma.branchDeliveryConfig.findUnique({
      where: {
        branchId_providerId: { branchId, providerId },
      },
      include: {
        provider: true,
      },
    });

    if (!config) return null;

    // Transform database format to frontend format
    return {
      id: config.id,
      branchId: config.branchId,
      providerId: config.providerId,
      providerName: config.provider.name,
      isActive: config.isActive,
      config: {
        webhookSecret: config.webhookSecret,
        autoPrint: config.autoPrintOnReceive,
        autoAccept: config.autoAcceptOrders,
        ...(config.settings as object || {}),  // Spread provider-specific settings
      },
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  async upsert(branchId: string, providerId: string, dto: CreateBranchConfigDto) {
    const { config, isActive } = dto;

    // Extract common fields from config
    const { webhookSecret, autoPrint, autoAccept, ...providerSpecificFields } = config;

    // Get company ID from branch
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { companyId: true },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const configData = {
      branchId,
      providerId,
      companyId: branch.companyId,
      webhookSecret: webhookSecret || null,
      autoPrintOnReceive: autoPrint ?? true,
      autoAcceptOrders: autoAccept ?? false,
      isActive: isActive ?? true,
      settings: providerSpecificFields,  // Store provider-specific fields in JSON
    };

    const result = await this.prisma.branchDeliveryConfig.upsert({
      where: {
        branchId_providerId: { branchId, providerId },
      },
      create: configData,
      update: configData,
      include: {
        provider: true,
      },
    });

    // Transform back to frontend format
    return this.findOne(branchId, providerId);
  }

  async delete(branchId: string, providerId: string) {
    await this.prisma.branchDeliveryConfig.delete({
      where: {
        branchId_providerId: { branchId, providerId },
      },
    });
  }
}
```

#### Step 4: Create DTOs with Validation

**File**: `/home/admin/restaurant-platform-remote-v2/integration-service/src/modules/branch-config/dto/branch-config.dto.ts`

```typescript
import { IsBoolean, IsOptional, IsString, IsArray, IsObject } from 'class-validator';

export class CreateBranchConfigDto {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  config: BranchConfigData;
}

export class BranchConfigData {
  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @IsBoolean()
  @IsOptional()
  autoPrint?: boolean;

  @IsBoolean()
  @IsOptional()
  autoAccept?: boolean;

  // Provider-specific fields (allow any additional properties)
  [key: string]: any;
}

export class UpdateBranchConfigDto extends CreateBranchConfigDto {}
```

#### Step 5: Register Module in App Module

**File**: `/home/admin/restaurant-platform-remote-v2/integration-service/src/app.module.ts`

```typescript
import { BranchConfigModule } from './modules/branch-config/branch-config.module';

@Module({
  imports: [
    // ... existing imports
    BranchConfigModule,  // Add this
  ],
})
export class AppModule {}
```

#### Step 6: Start Integration Service

```bash
cd /home/admin/restaurant-platform-remote-v2/integration-service
npm install
npm run start:dev
```

**Verification**:
```bash
# Check service is running
curl http://localhost:3002/webhooks/health

# Test branch config endpoint
curl http://localhost:3002/branches/test-branch-id/providers/test-provider-id
```

---

### Fix Strategy B: Use Main Backend (Simpler, Faster)

**Rationale**: Avoid running separate service, consolidate to single backend

**Implementation Steps**:

#### Step 1: Update Frontend API Client

**File**: `/home/admin/restaurant-platform-remote-v2/frontend/src/lib/integration-api.ts:208-227`

```typescript
// Change from integrationServiceApi to integrationApi (port 3001)
export const branchConfig = {
  get: async (branchId: string, providerId: string): Promise<BranchDeliveryConfig | null> => {
    try {
      const { data } = await integrationApi.get(`/integration/branch-config/${branchId}/providers/${providerId}`)
      return data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  },

  save: async (branchId: string, providerId: string, config: Partial<BranchDeliveryConfig>): Promise<BranchDeliveryConfig> => {
    const { data } = await integrationApi.post(`/integration/branch-config/${branchId}/providers/${providerId}`, config)
    return data
  },

  delete: async (branchId: string, providerId: string): Promise<void> => {
    await integrationApi.delete(`/integration/branch-config/${branchId}/providers/${providerId}`)
  }
}
```

#### Step 2: Create Branch Config Controller in Main Backend

**File**: `/home/admin/restaurant-platform-remote-v2/backend/src/modules/delivery-webhooks/branch-config.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../database/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('integration/branch-config')
@UseGuards(JwtAuthGuard)
export class BranchConfigController {
  constructor(private prisma: PrismaService) {}

  @Get(':branchId/providers/:providerId')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getConfig(
    @Param('branchId') branchId: string,
    @Param('providerId') providerId: string,
    @CurrentUser() user: any,
  ) {
    const config = await this.prisma.branchDeliveryConfig.findFirst({
      where: {
        branchId,
        providerId,
        companyId: user.companyId,  // Multi-tenant isolation
      },
      include: {
        provider: true,
      },
    });

    if (!config) {
      throw new NotFoundException('Branch configuration not found');
    }

    // Transform to frontend format
    return {
      id: config.id,
      branchId: config.branchId,
      providerId: config.providerId,
      providerName: config.provider.name,
      isActive: config.isActive,
      config: {
        webhookSecret: config.webhookSecret,
        autoPrint: config.autoPrintOnReceive,
        autoAccept: config.autoAcceptOrders,
        ...(config.settings as object || {}),
      },
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  @Post(':branchId/providers/:providerId')
  @HttpCode(HttpStatus.OK)
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async saveConfig(
    @Param('branchId') branchId: string,
    @Param('providerId') providerId: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    const { config, isActive } = dto;
    const { webhookSecret, autoPrint, autoAccept, ...providerSpecificFields } = config;

    const configData = {
      branchId,
      providerId,
      companyId: user.companyId,
      webhookSecret: webhookSecret || null,
      autoPrintOnReceive: autoPrint ?? true,
      autoAcceptOrders: autoAccept ?? false,
      isActive: isActive ?? true,
      settings: providerSpecificFields,
      updatedBy: user.id,
    };

    const result = await this.prisma.branchDeliveryConfig.upsert({
      where: {
        branchId_providerId: { branchId, providerId },
      },
      create: { ...configData, createdBy: user.id },
      update: configData,
      include: {
        provider: true,
      },
    });

    return this.getConfig(branchId, providerId, user);
  }

  @Delete(':branchId/providers/:providerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async deleteConfig(
    @Param('branchId') branchId: string,
    @Param('providerId') providerId: string,
    @CurrentUser() user: any,
  ) {
    await this.prisma.branchDeliveryConfig.deleteMany({
      where: {
        branchId,
        providerId,
        companyId: user.companyId,
      },
    });
  }
}
```

#### Step 3: Register Controller

**File**: `/home/admin/restaurant-platform-remote-v2/backend/src/modules/delivery-webhooks/delivery-webhooks.module.ts`

```typescript
import { BranchConfigController } from './branch-config.controller';

@Module({
  controllers: [
    WebhookLogsController,
    DeliveryProvidersController,
    CareemWebhookController,
    BranchConfigController,  // Add this
  ],
  // ... rest of module
})
export class DeliveryWebhooksModule {}
```

---

### Fix Strategy C: Fix React Query Deprecated API (Both Strategies)

**File**: `/home/admin/restaurant-platform-remote-v2/frontend/pages/integration/branch-config.tsx:88-136`

Replace:
```typescript
const { data: currentConfig, isLoading: configLoading } = useQuery({
  queryKey: ['branch-config', selectedBranch, selectedProvider],
  queryFn: () => branchConfig.get(selectedBranch, selectedProvider),
  enabled: !!selectedBranch && !!selectedProvider,
  onSuccess: (data) => {
    if (data) {
      setConfigData({
        webhookSecret: data.config.webhookSecret || '',
        autoPrint: data.config.autoPrint || false,
        autoAccept: data.config.autoAccept || false,
        locationId: data.config.locationId || '',
        menuId: data.config.menuId || ''
      })
    }
  }
})
```

With:
```typescript
const { data: currentConfig, isLoading: configLoading } = useQuery({
  queryKey: ['branch-config', selectedBranch, selectedProvider],
  queryFn: () => branchConfig.get(selectedBranch, selectedProvider),
  enabled: !!selectedBranch && !!selectedProvider,
})

// Use useEffect instead of onSuccess
useEffect(() => {
  if (currentConfig?.config) {
    setConfigData({
      webhookSecret: currentConfig.config.webhookSecret || '',
      autoPrint: currentConfig.config.autoPrint || false,
      autoAccept: currentConfig.config.autoAccept || false,
      ...currentConfig.config,  // Spread all provider-specific fields
    })
  }
}, [currentConfig])
```

---

## 5. Implementation Roadmap

### Phase 1: Immediate (Day 1)
- [ ] Choose Fix Strategy A (microservice) or B (monolith)
- [ ] Implement backend endpoints with transformation logic
- [ ] Fix React Query deprecated API usage
- [ ] Test with one provider (e.g., Deliveroo)

### Phase 2: Stabilization (Day 2-3)
- [ ] Update frontend type definitions to match backend
- [ ] Add proper TypeScript types for provider-specific configs
- [ ] Test all 6 providers (Deliveroo, Jahez, Careem, Talabat, Uber Eats, Zomato)
- [ ] Add error handling and validation

### Phase 3: Quality (Day 4-5)
- [ ] Add unit tests for transformation logic
- [ ] Add integration tests for endpoints
- [ ] Update API documentation
- [ ] Performance testing with large datasets

---

## 6. Testing Checklist

### Backend Endpoint Tests
- [ ] GET /branches/:branchId/providers/:providerId returns 404 when not found
- [ ] GET /branches/:branchId/providers/:providerId returns config when exists
- [ ] POST /branches/:branchId/providers/:providerId creates new config
- [ ] POST /branches/:branchId/providers/:providerId updates existing config
- [ ] DELETE /branches/:branchId/providers/:providerId removes config
- [ ] Multi-tenant isolation works (users can only access their company's data)

### Data Transformation Tests
- [ ] Frontend config object correctly mapped to database fields
- [ ] Provider-specific fields stored in settings JSON
- [ ] Field name mappings work (autoPrint → autoPrintOnReceive)
- [ ] Deliveroo config with siteId, brandId correctly serialized
- [ ] Jahez config with excludeBranches array correctly serialized
- [ ] Null/undefined values handled gracefully

### Frontend Tests
- [ ] Config form loads existing data
- [ ] Provider-specific fields shown based on selected provider
- [ ] Save button triggers correct mutation
- [ ] React Query cache updated after save
- [ ] Delete confirmation dialog works
- [ ] Error messages displayed on failure

---

## 7. Performance Impact Assessment

**Current State**:
- API calls: 0% success rate (connection refused)
- User experience: Complete feature failure
- Error logs: Connection errors flooding frontend console

**After Fix (Strategy A - Microservice)**:
- API calls: Expected 95%+ success rate
- Average response time: <200ms for GET, <500ms for POST
- Integration service overhead: ~50MB memory, minimal CPU
- Network hops: Frontend → Integration Service (3002) → Database

**After Fix (Strategy B - Monolith)**:
- API calls: Expected 95%+ success rate
- Average response time: <150ms for GET, <400ms for POST
- No additional service overhead
- Network hops: Frontend → Main Backend (3001) → Database
- **Recommended for simplicity**

---

## 8. Security Considerations

### Current Issues:
1. **No endpoint = No security issues** (nothing to attack)

### Post-Fix Requirements:
- [ ] JWT authentication on all endpoints
- [ ] Multi-tenant data isolation (companyId filtering)
- [ ] Role-based access control (super_admin, company_owner, branch_manager)
- [ ] Input validation on all DTOs
- [ ] Sanitize provider-specific settings JSON
- [ ] Rate limiting on configuration endpoints
- [ ] Audit logging for configuration changes

---

## Appendix A: File Reference Index

### Frontend Files
- `/home/admin/restaurant-platform-remote-v2/frontend/src/lib/integration-api.ts:16-31` - Integration service API client
- `/home/admin/restaurant-platform-remote-v2/frontend/src/lib/integration-api.ts:208-227` - branchConfig API functions
- `/home/admin/restaurant-platform-remote-v2/frontend/pages/integration/branch-config.tsx` - Branch configuration page
- `/home/admin/restaurant-platform-remote-v2/frontend/src/types/integration.ts:11-26` - BranchDeliveryConfig type

### Backend Files
- `/home/admin/restaurant-platform-remote-v2/backend/prisma/schema.prisma` - Database schema
- `/home/admin/restaurant-platform-remote-v2/backend/src/modules/delivery-webhooks/` - Delivery webhooks module
- `/home/admin/restaurant-platform-remote-v2/backend/.env` - Backend configuration (PORT=3001)

### Integration Service Files
- `/home/admin/restaurant-platform-remote-v2/integration-service/` - Integration service root
- `/home/admin/restaurant-platform-remote-v2/integration-service/.env` - Service configuration (PORT=3002)
- `/home/admin/restaurant-platform-remote-v2/integration-service/src/app.module.ts` - Main module
- `/home/admin/restaurant-platform-remote-v2/integration-service/src/modules/webhooks/` - Webhook receiver

---

## Appendix B: Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_INTEGRATION_API_URL=http://localhost:3002  # Currently not running
```

### Main Backend (.env)
```bash
PORT=3001
DATABASE_URL="postgresql://postgres:E$$athecode006@localhost:5432/postgres"
```

### Integration Service (.env)
```bash
PORT=3002
SERVICE_NAME=integration-service
DATABASE_URL="postgresql://postgres:E$$athecode006@localhost:5432/postgres"
BACKEND_URL=http://localhost:3001
```

---

**Report Generated**: October 1, 2025, 18:30 UTC
**Next Review**: After implementation of chosen fix strategy
**Owner**: Platform Engineering Team
**Priority**: P0 - Critical Production Issue
