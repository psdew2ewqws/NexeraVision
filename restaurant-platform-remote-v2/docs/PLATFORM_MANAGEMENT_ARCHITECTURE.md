# Platform Management System Architecture

## Executive Summary

Comprehensive design for a scalable, multi-tenant platform management system that addresses all identified issues with proper role-based access control, real-time synchronization, and enterprise-grade architecture.

---

## 1. DATABASE SCHEMA DESIGN

### 1.1 Enhanced Platform Tables

```sql
-- Core Platform Definition
CREATE TABLE platforms (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_name JSONB NOT NULL DEFAULT '{}', -- {"en": "Delivery Platform", "ar": "منصة التوصيل"}
    platform_type VARCHAR(50) NOT NULL, -- 'internal', 'delivery', 'pos', 'kiosk', 'mobile'
    status INTEGER NOT NULL DEFAULT 1, -- 0=inactive, 1=active, 2=maintenance
    configuration JSONB NOT NULL DEFAULT '{}',
    api_config JSONB DEFAULT '{}', -- API endpoints, credentials, etc.
    is_system_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36),
    updated_by VARCHAR(36),

    UNIQUE(company_id, name),
    INDEX idx_platforms_company_id (company_id),
    INDEX idx_platforms_type (platform_type),
    INDEX idx_platforms_status (status)
);

-- Product-Platform Assignment with Enhanced Features
CREATE TABLE product_platform_assignments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(36) NOT NULL REFERENCES menu_products(id) ON DELETE CASCADE,
    platform_id VARCHAR(36) NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Platform-specific product data
    platform_product_id VARCHAR(255), -- External platform's product ID
    platform_name JSONB, -- Override product name for this platform
    platform_description JSONB, -- Override description
    platform_price DECIMAL(10,2), -- Override price
    platform_image_url VARCHAR(500), -- Platform-specific image

    -- Availability and scheduling
    is_available BOOLEAN DEFAULT TRUE,
    available_from TIME,
    available_to TIME,
    available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7], -- 1=Monday, 7=Sunday

    -- Platform-specific configuration
    platform_config JSONB DEFAULT '{}',
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'failed', 'manual'
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_error_message TEXT,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36),
    updated_by VARCHAR(36),

    UNIQUE(product_id, platform_id),
    INDEX idx_product_platform_company (company_id),
    INDEX idx_product_platform_sync (sync_status),
    INDEX idx_product_platform_available (is_available),
    CONSTRAINT fk_ppa_company_product FOREIGN KEY (company_id, product_id)
        REFERENCES menu_products(company_id, id) ON DELETE CASCADE
);

-- Platform Categories for Organization
CREATE TABLE platform_categories (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id VARCHAR(36) NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    category_id VARCHAR(36) NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Platform-specific category data
    platform_category_id VARCHAR(255), -- External platform's category ID
    platform_name JSONB, -- Override category name
    is_visible BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,

    -- Sync tracking
    sync_status VARCHAR(50) DEFAULT 'pending',
    last_synced_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(platform_id, category_id),
    INDEX idx_platform_categories_company (company_id),
    INDEX idx_platform_categories_sync (sync_status)
);

-- Platform Analytics and Reporting
CREATE TABLE platform_analytics (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id VARCHAR(36) NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Key metrics
    total_products INTEGER DEFAULT 0,
    active_products INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    sync_success_rate DECIMAL(5,2) DEFAULT 0,

    -- Performance metrics
    avg_sync_time_ms INTEGER DEFAULT 0,
    failed_syncs INTEGER DEFAULT 0,
    manual_interventions INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(platform_id, date),
    INDEX idx_platform_analytics_company_date (company_id, date),
    INDEX idx_platform_analytics_date (date)
);

-- Audit Trail for Platform Operations
CREATE TABLE platform_audit_log (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_id VARCHAR(36) REFERENCES platforms(id) ON DELETE SET NULL,
    product_id VARCHAR(36) REFERENCES menu_products(id) ON DELETE SET NULL,
    company_id VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL, -- 'create_platform', 'assign_product', 'sync', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'platform', 'assignment', 'category'
    entity_id VARCHAR(36),

    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_platform_audit_company (company_id),
    INDEX idx_platform_audit_action (action),
    INDEX idx_platform_audit_date (created_at),
    INDEX idx_platform_audit_user (user_id)
);
```

### 1.2 Enhanced Existing Tables

```sql
-- Add platform support to menu_products
ALTER TABLE menu_products
ADD COLUMN default_platforms VARCHAR(36)[] DEFAULT ARRAY[]::VARCHAR(36)[],
ADD COLUMN platform_sync_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN platform_sync_config JSONB DEFAULT '{}';

-- Add platform tracking to orders
ALTER TABLE orders
ADD COLUMN source_platform_id VARCHAR(36) REFERENCES platforms(id),
ADD COLUMN platform_order_id VARCHAR(255),
ADD COLUMN platform_metadata JSONB DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX idx_menu_products_platforms ON menu_products USING GIN(default_platforms);
CREATE INDEX idx_orders_platform ON orders(source_platform_id);
```

---

## 2. API ARCHITECTURE WITH ROLE-BASED ACCESS

### 2.1 Platform Management Controller

```typescript
@Controller('platforms')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyGuard)
export class PlatformController {

  // Get platforms with role-based filtering
  @Get()
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center')
  async getPlatforms(@Request() req, @Query() query: PlatformFiltersDto) {
    return this.platformService.getPlatforms(req.user, query);
  }

  // Create platform (restricted to admin roles)
  @Post()
  @Roles('super_admin', 'company_owner')
  async createPlatform(@Body() createDto: CreatePlatformDto, @Request() req) {
    return this.platformService.createPlatform(createDto, req.user);
  }

  // Update platform
  @Put(':id')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async updatePlatform(
    @Param('id') id: string,
    @Body() updateDto: UpdatePlatformDto,
    @Request() req
  ) {
    return this.platformService.updatePlatform(id, updateDto, req.user);
  }

  // Delete platform (admin only)
  @Delete(':id')
  @Roles('super_admin', 'company_owner')
  async deletePlatform(@Param('id') id: string, @Request() req) {
    return this.platformService.deletePlatform(id, req.user);
  }

  // Bulk assign products to platforms
  @Post(':id/products/assign')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async assignProducts(
    @Param('id') platformId: string,
    @Body() assignDto: BulkAssignProductsDto,
    @Request() req
  ) {
    return this.platformService.assignProducts(platformId, assignDto, req.user);
  }

  // Get platform analytics
  @Get(':id/analytics')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async getPlatformAnalytics(
    @Param('id') platformId: string,
    @Query() query: AnalyticsQueryDto,
    @Request() req
  ) {
    return this.platformService.getAnalytics(platformId, query, req.user);
  }

  // Sync platform data
  @Post(':id/sync')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async syncPlatform(@Param('id') platformId: string, @Request() req) {
    return this.platformService.syncPlatform(platformId, req.user);
  }
}
```

### 2.2 Enhanced Menu Controller for Platform Integration

```typescript
// Add platform-aware endpoints to existing menu controller
export class MenuController {

  // Get products filtered by platform
  @Post('products/by-platform')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getProductsByPlatform(
    @Body() filters: ProductPlatformFiltersDto,
    @Request() req
  ) {
    return this.menuService.getProductsByPlatform(filters, req.user);
  }

  // Get platforms for dropdown/filters
  @Get('platforms')
  @Roles('super_admin', 'company_owner', 'branch_manager', 'call_center', 'cashier')
  async getPlatformsForMenu(@Request() req) {
    return this.platformService.getPlatformsForUser(req.user);
  }

  // Bulk assign/unassign products to platforms
  @Post('products/platform-assignment')
  @Roles('super_admin', 'company_owner', 'branch_manager')
  async bulkPlatformAssignment(
    @Body() assignmentDto: BulkPlatformAssignmentDto,
    @Request() req
  ) {
    return this.menuService.bulkPlatformAssignment(assignmentDto, req.user);
  }
}
```

### 2.3 Role-Based Access Control Matrix

| Role | Platforms Access | Product Assignment | Platform Management | Analytics |
|------|------------------|-------------------|-------------------|-----------|
| **super_admin** | All companies' platforms | Full control | Create/Edit/Delete any | Full access |
| **company_owner** | Own company only | Full control | Create/Edit/Delete own | Company data |
| **branch_manager** | Own company only | Assign/Unassign | Edit existing only | Branch data |
| **call_center** | Own company only | View only | View only | Limited view |
| **cashier** | Own company only | View only | View only | No access |

---

## 3. FRONTEND STATE MANAGEMENT STRATEGY

### 3.1 Context Architecture

```typescript
// Platform Context for Global State
interface PlatformContextType {
  platforms: Platform[];
  selectedPlatforms: string[];
  platformsLoading: boolean;
  platformAssignments: Map<string, string[]>; // productId -> platformIds

  // Actions
  loadPlatforms: () => Promise<void>;
  createPlatform: (platform: CreatePlatformDto) => Promise<Platform>;
  updatePlatform: (id: string, updates: UpdatePlatformDto) => Promise<Platform>;
  deletePlatform: (id: string) => Promise<void>;

  // Product-Platform assignments
  assignProductsToPlatforms: (productIds: string[], platformIds: string[]) => Promise<void>;
  unassignProductsFromPlatforms: (productIds: string[], platformIds: string[]) => Promise<void>;
  getProductPlatforms: (productId: string) => string[];

  // Filtering
  setSelectedPlatforms: (platformIds: string[]) => void;
  clearPlatformFilters: () => void;
}

// Enhanced Auth Context with Platform Permissions
interface AuthContextType extends ExistingAuthContext {
  // Platform permissions based on role
  canCreatePlatforms: boolean;
  canEditPlatforms: boolean;
  canDeletePlatforms: boolean;
  canAssignProducts: boolean;
  canViewAnalytics: boolean;

  // Company-specific platform access
  accessibleCompanies: Company[];
  currentCompanyPlatforms: Platform[];
}
```

### 3.2 React Query Integration

```typescript
// Platform-specific queries and mutations
export const usePlatforms = (companyId?: string) => {
  return useQuery({
    queryKey: ['platforms', companyId],
    queryFn: () => platformApi.getPlatforms({ companyId }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePlatformAssignments = (productIds: string[]) => {
  return useQuery({
    queryKey: ['platform-assignments', productIds],
    queryFn: () => platformApi.getProductAssignments(productIds),
    enabled: productIds.length > 0,
  });
};

export const useCreatePlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: platformApi.createPlatform,
    onSuccess: (newPlatform) => {
      // Update platforms cache
      queryClient.setQueryData(['platforms'], (old: Platform[]) =>
        old ? [...old, newPlatform] : [newPlatform]
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['platform-analytics'] });
    },
  });
};

export const useBulkPlatformAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: platformApi.bulkAssignProducts,
    onSuccess: () => {
      // Invalidate product and assignment caches
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['platform-assignments'] });
    },
  });
};
```

### 3.3 State Management Architecture

```typescript
// Zustand store for complex platform state
interface PlatformStore {
  // State
  platforms: Platform[];
  assignments: Map<string, PlatformAssignment[]>;
  selectedProductIds: string[];
  selectedPlatformIds: string[];
  bulkOperationMode: boolean;

  // Loading states
  platformsLoading: boolean;
  assignmentsLoading: boolean;
  syncInProgress: Set<string>; // platform IDs currently syncing

  // Actions
  setPlatforms: (platforms: Platform[]) => void;
  updatePlatform: (id: string, updates: Partial<Platform>) => void;
  removePlatform: (id: string) => void;

  // Assignment management
  setAssignments: (productId: string, assignments: PlatformAssignment[]) => void;
  addAssignment: (productId: string, platformId: string) => void;
  removeAssignment: (productId: string, platformId: string) => void;

  // Selection management
  setSelectedProducts: (productIds: string[]) => void;
  setSelectedPlatforms: (platformIds: string[]) => void;
  toggleBulkMode: () => void;
  clearSelections: () => void;

  // Sync operations
  startSync: (platformId: string) => void;
  completeSync: (platformId: string) => void;
  failSync: (platformId: string, error: string) => void;
}
```

---

## 4. INTEGRATION POINTS AND SECURITY MODEL

### 4.1 Multi-Tenant Security Architecture

```typescript
// Enhanced Company Guard for Platform Access
@Injectable()
export class PlatformCompanyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const platformId = request.params.id || request.body.platformId;

    if (!platformId) return true; // Let controller handle validation

    // Super admin has access to all platforms
    if (user.role === 'super_admin') return true;

    // Verify platform belongs to user's company
    const platform = await this.prisma.platform.findFirst({
      where: {
        id: platformId,
        companyId: user.companyId
      }
    });

    return !!platform;
  }
}

// Data Access Layer with Automatic Filtering
export class PlatformService extends BaseService<Platform> {

  async getPlatforms(user: AuthUser, filters?: PlatformFiltersDto): Promise<PlatformResponse> {
    const whereClause = this.buildSecureWhereClause(user, {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.platformType && { platformType: filters.platformType }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { displayName: { path: ['en'], string_contains: filters.search } },
          { displayName: { path: ['ar'], string_contains: filters.search } }
        ]
      })
    });

    const platforms = await this.prisma.platform.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            productAssignments: { where: { isAvailable: true } },
            categories: true
          }
        },
        company: user.role === 'super_admin'
      },
      orderBy: [
        { isSystemDefault: 'desc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    return {
      platforms,
      totalCount: platforms.length,
      canCreate: this.canUserCreatePlatforms(user),
      canEdit: this.canUserEditPlatforms(user),
      canDelete: this.canUserDeletePlatforms(user)
    };
  }

  private buildSecureWhereClause(user: AuthUser, additionalWhere: any = {}) {
    if (user.role === 'super_admin') {
      // Super admin can see all platforms, optionally filtered by company
      return additionalWhere;
    }

    // All other roles see only their company's platforms
    return {
      companyId: user.companyId,
      ...additionalWhere
    };
  }
}
```

### 4.2 Real-Time Synchronization

```typescript
// WebSocket Gateway for Real-Time Platform Updates
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL },
  namespace: 'platforms'
})
export class PlatformGateway implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  // User subscription management
  private userRooms = new Map<string, Set<string>>(); // userId -> room names

  async handleConnection(client: Socket) {
    try {
      const user = await this.authService.verifySocketUser(client.handshake.auth.token);

      // Join company-specific room
      const companyRoom = `company:${user.companyId}`;
      client.join(companyRoom);

      // Join role-specific room for targeted updates
      const roleRoom = `role:${user.role}`;
      client.join(roleRoom);

      // Track user rooms
      this.userRooms.set(client.id, new Set([companyRoom, roleRoom]));

    } catch (error) {
      client.disconnect();
    }
  }

  // Emit platform updates to relevant users
  emitPlatformUpdate(companyId: string, update: PlatformUpdateEvent) {
    this.server.to(`company:${companyId}`).emit('platform-updated', update);
  }

  // Emit bulk assignment progress
  emitAssignmentProgress(companyId: string, progress: AssignmentProgress) {
    this.server.to(`company:${companyId}`).emit('assignment-progress', progress);
  }

  // Emit sync status updates
  emitSyncStatus(companyId: string, platformId: string, status: SyncStatus) {
    this.server.to(`company:${companyId}`).emit('sync-status', {
      platformId,
      status
    });
  }
}

// Frontend WebSocket Integration
export const usePlatformRealTime = (companyId: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    if (!token) return;

    const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL}/platforms`, {
      auth: { token }
    });

    // Listen for platform updates
    newSocket.on('platform-updated', (update: PlatformUpdateEvent) => {
      queryClient.setQueryData(['platforms'], (old: Platform[]) => {
        if (!old) return old;

        return old.map(platform =>
          platform.id === update.platformId
            ? { ...platform, ...update.changes }
            : platform
        );
      });
    });

    // Listen for assignment progress
    newSocket.on('assignment-progress', (progress: AssignmentProgress) => {
      toast.loading(`Assigning products: ${progress.completed}/${progress.total}`, {
        id: 'assignment-progress'
      });

      if (progress.completed === progress.total) {
        toast.success(`Successfully assigned ${progress.total} products`, {
          id: 'assignment-progress'
        });
        queryClient.invalidateQueries(['platform-assignments']);
      }
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [companyId, queryClient]);

  return socket;
};
```

### 4.3 API Integration Layer

```typescript
// Centralized API client with error handling and caching
export class PlatformApiClient {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getPlatforms(filters?: PlatformFiltersDto): Promise<PlatformResponse> {
    const cacheKey = `platforms:${JSON.stringify(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const response = await this.request<PlatformResponse>('GET', '/platforms', {
      params: filters
    });

    this.setCache(cacheKey, response);
    return response;
  }

  async bulkAssignProducts(assignment: BulkPlatformAssignmentDto): Promise<AssignmentResult> {
    return this.request<AssignmentResult>('POST', '/platforms/bulk-assign', assignment);
  }

  async syncPlatform(platformId: string): Promise<SyncResult> {
    return this.request<SyncResult>('POST', `/platforms/${platformId}/sync`);
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method,
      url: `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      if (method === 'GET') {
        config.params = data.params;
      } else {
        config.data = data;
      }
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  private handleApiError(error: any) {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
  }
}
```

---

## 5. IMPLEMENTATION ROADMAP

### Phase 1: Database and Core API (Week 1-2)
1. **Database Migration**
   - Create new platform tables
   - Add indexes for performance
   - Migrate existing platform data

2. **Core API Development**
   - Platform CRUD operations
   - Role-based access control
   - Basic assignment functionality

3. **Testing Infrastructure**
   - Unit tests for services
   - Integration tests for APIs
   - Security testing

### Phase 2: Advanced Features (Week 3-4)
1. **Frontend Integration**
   - Platform management UI
   - Product assignment modal
   - Real-time updates

2. **Bulk Operations**
   - Bulk assignment/unassignment
   - Progress tracking
   - Error handling

3. **Analytics Foundation**
   - Basic platform metrics
   - Assignment tracking
   - Performance monitoring

### Phase 3: Enterprise Features (Week 5-6)
1. **Advanced Security**
   - Audit logging
   - Permission refinement
   - Data encryption

2. **External Integrations**
   - Third-party platform APIs
   - Sync mechanisms
   - Error recovery

3. **Performance Optimization**
   - Caching strategies
   - Database optimization
   - Frontend performance

### Phase 4: Production Readiness (Week 7-8)
1. **Monitoring and Logging**
   - Platform health checks
   - Sync monitoring
   - Error alerting

2. **Documentation**
   - API documentation
   - User guides
   - Admin documentation

3. **Deployment**
   - Production deployment
   - Performance testing
   - User training

---

## 6. SECURITY CONSIDERATIONS

### 6.1 Data Protection
- **Encryption**: All sensitive platform configurations encrypted at rest
- **API Security**: Rate limiting, input validation, SQL injection prevention
- **Access Control**: Granular permissions based on user roles
- **Audit Trail**: Complete logging of all platform operations

### 6.2 Multi-Tenant Isolation
- **Database Level**: Company-based data filtering at query level
- **Application Level**: Middleware enforcing company boundaries
- **API Level**: Request validation and authorization
- **Frontend Level**: UI hiding based on permissions

### 6.3 Integration Security
- **External APIs**: Secure credential storage and rotation
- **WebSocket**: Authenticated connections with room isolation
- **File Uploads**: Validation and virus scanning
- **Data Export**: Access logging and rate limiting

---

## 7. PERFORMANCE SPECIFICATIONS

### 7.1 Database Performance
- **Query Response**: <100ms for platform listings
- **Bulk Operations**: Handle 10,000+ product assignments
- **Concurrent Users**: Support 100+ simultaneous operations
- **Data Volume**: Scale to 1M+ products across platforms

### 7.2 Frontend Performance
- **Initial Load**: <2s for platform management page
- **Real-time Updates**: <50ms latency for WebSocket events
- **Bulk Selection**: Handle 1000+ selected products smoothly
- **Memory Usage**: <100MB for large datasets

### 7.3 Integration Performance
- **API Response**: <200ms average response time
- **Sync Operations**: Process 1000+ products/minute
- **Error Recovery**: Automatic retry with exponential backoff
- **Cache Hit Rate**: >90% for frequently accessed data

---

This comprehensive architecture addresses all identified issues while providing a scalable, secure, and maintainable foundation for platform management across the restaurant platform ecosystem.