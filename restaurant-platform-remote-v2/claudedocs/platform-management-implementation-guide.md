# Platform Management Implementation Guide

## Quick Start Implementation

This guide provides step-by-step implementation instructions for the platform management system, designed for rapid deployment using the existing infrastructure.

## Phase 1: Core Platform Integration (Day 1-2)

### 1.1 Create Platform Types and Interfaces

**File**: `src/types/platform.ts`
```typescript
export interface Platform {
  id: string;
  name: string;
  description: string;
  platformType: string;
  status: 'active' | 'inactive' | 'draft';
  menuCount: number;
  isDefault: boolean;
  config: Record<string, any>;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAssignment {
  platformId: string;
  productId: string;
  isAvailable: boolean;
  platformSpecificData?: Record<string, any>;
}

export interface PlatformAssignmentState {
  selectedProducts: string[];
  availablePlatforms: Platform[];
  productPlatforms: Record<string, Platform[]>;
  isAssigning: boolean;
  assignmentMode: 'single' | 'bulk';
}
```

### 1.2 Create Platform Hooks

**File**: `src/hooks/usePlatforms.ts`
```typescript
import { useState, useEffect, useCallback } from 'react';
import { Platform } from '../types/platform';

export const usePlatforms = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlatforms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) throw new Error('No auth token');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/platforms`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!response.ok) throw new Error('Failed to load platforms');

      const data = await response.json();
      setPlatforms(data.platforms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platforms');
    } finally {
      setLoading(false);
    }
  }, []);

  const assignProductsToPlatform = useCallback(async (platformId: string, productIds: string[]) => {
    const authToken = localStorage.getItem('auth-token');
    if (!authToken) throw new Error('No auth token');

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/platforms/${platformId}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productIds })
    });

    if (!response.ok) throw new Error('Failed to assign products');
    return response.json();
  }, []);

  const removeProductsFromPlatform = useCallback(async (platformId: string, productIds: string[]) => {
    const authToken = localStorage.getItem('auth-token');
    if (!authToken) throw new Error('No auth token');

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/platforms/${platformId}/products`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productIds })
    });

    if (!response.ok) throw new Error('Failed to remove products');
    return response.json();
  }, []);

  useEffect(() => {
    loadPlatforms();
  }, [loadPlatforms]);

  return {
    platforms,
    loading,
    error,
    loadPlatforms,
    assignProductsToPlatform,
    removeProductsFromPlatform
  };
};
```

### 1.3 Create Platform Badges Component

**File**: `src/features/menu/components/PlatformBadges.tsx`
```typescript
import React from 'react';
import {
  BuildingStorefrontIcon,
  TruckIcon,
  PhoneIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { Platform } from '../../../types/platform';

interface PlatformBadgesProps {
  platforms: Platform[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (platform: Platform) => void;
  className?: string;
}

const PLATFORM_ICONS = {
  'dine-in': BuildingStorefrontIcon,
  'careem': TruckIcon,
  'talabat': TruckIcon,
  'phone': PhoneIcon,
  'call-center': PhoneIcon,
  'website': GlobeAltIcon,
  'kiosk': ComputerDesktopIcon,
  'mobile-app': DevicePhoneMobileIcon,
  'custom': CubeIcon
};

const PLATFORM_COLORS = {
  'dine-in': 'bg-green-100 text-green-800 border-green-200',
  'careem': 'bg-red-100 text-red-800 border-red-200',
  'talabat': 'bg-orange-100 text-orange-800 border-orange-200',
  'phone': 'bg-blue-100 text-blue-800 border-blue-200',
  'call-center': 'bg-purple-100 text-purple-800 border-purple-200',
  'website': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'kiosk': 'bg-gray-100 text-gray-800 border-gray-200',
  'mobile-app': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'custom': 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5'
};

const ICON_SIZE_CLASSES = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

export const PlatformBadges: React.FC<PlatformBadgesProps> = ({
  platforms,
  maxVisible = 3,
  size = 'sm',
  onClick,
  className = ''
}) => {
  if (!platforms || platforms.length === 0) return null;

  const visiblePlatforms = platforms.slice(0, maxVisible);
  const remainingCount = Math.max(0, platforms.length - maxVisible);

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visiblePlatforms.map((platform) => {
        const IconComponent = PLATFORM_ICONS[platform.platformType as keyof typeof PLATFORM_ICONS] || CubeIcon;
        const colorClass = PLATFORM_COLORS[platform.platformType as keyof typeof PLATFORM_COLORS] || PLATFORM_COLORS.custom;

        return (
          <button
            key={platform.id}
            onClick={() => onClick?.(platform)}
            className={`
              inline-flex items-center font-medium rounded-md border transition-colors
              ${SIZE_CLASSES[size]}
              ${colorClass}
              ${onClick ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}
            `}
            title={platform.description || platform.name}
          >
            <IconComponent className={`mr-1 ${ICON_SIZE_CLASSES[size]}`} />
            {platform.name}
          </button>
        );
      })}

      {remainingCount > 0 && (
        <span className={`
          inline-flex items-center font-medium rounded-md border bg-gray-100 text-gray-600 border-gray-200
          ${SIZE_CLASSES[size]}
        `}>
          +{remainingCount} more
        </span>
      )}
    </div>
  );
};
```

## Phase 2: Enhanced Product Grid (Day 2-3)

### 2.1 Enhanced Product Interface

**File**: `src/types/menu.ts` (Add to existing interface)
```typescript
// Add to existing MenuProduct interface
export interface MenuProduct {
  // ... existing properties
  platforms?: Platform[]; // Add this property
  platformAssignments?: PlatformAssignment[];
}
```

### 2.2 Platform Context Provider

**File**: `src/contexts/PlatformContext.tsx`
```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Platform, PlatformAssignmentState } from '../types/platform';
import { usePlatforms } from '../hooks/usePlatforms';
import toast from 'react-hot-toast';

interface PlatformContextType {
  platforms: Platform[];
  loading: boolean;
  error: string | null;
  assignmentState: PlatformAssignmentState;

  // Actions
  assignProductsToPlatforms: (platformIds: string[], productIds: string[]) => Promise<void>;
  removeProductsFromPlatforms: (platformIds: string[], productIds: string[]) => Promise<void>;
  setSelectedProducts: (productIds: string[]) => void;
  setAssignmentMode: (mode: 'single' | 'bulk') => void;
  refreshPlatforms: () => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export const usePlatformContext = () => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatformContext must be used within PlatformProvider');
  }
  return context;
};

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { platforms, loading, error, assignProductsToPlatform, removeProductsFromPlatform, loadPlatforms } = usePlatforms();

  const [assignmentState, setAssignmentState] = useState<PlatformAssignmentState>({
    selectedProducts: [],
    availablePlatforms: [],
    productPlatforms: {},
    isAssigning: false,
    assignmentMode: 'single'
  });

  const assignProductsToPlatforms = useCallback(async (platformIds: string[], productIds: string[]) => {
    setAssignmentState(prev => ({ ...prev, isAssigning: true }));

    try {
      await Promise.all(platformIds.map(platformId =>
        assignProductsToPlatform(platformId, productIds)
      ));

      toast.success(`${productIds.length} products assigned to ${platformIds.length} platform(s)`);
    } catch (error) {
      toast.error('Failed to assign products to platforms');
      throw error;
    } finally {
      setAssignmentState(prev => ({ ...prev, isAssigning: false }));
    }
  }, [assignProductsToPlatform]);

  const removeProductsFromPlatforms = useCallback(async (platformIds: string[], productIds: string[]) => {
    setAssignmentState(prev => ({ ...prev, isAssigning: true }));

    try {
      await Promise.all(platformIds.map(platformId =>
        removeProductsFromPlatform(platformId, productIds)
      ));

      toast.success(`${productIds.length} products removed from ${platformIds.length} platform(s)`);
    } catch (error) {
      toast.error('Failed to remove products from platforms');
      throw error;
    } finally {
      setAssignmentState(prev => ({ ...prev, isAssigning: false }));
    }
  }, [removeProductsFromPlatform]);

  const setSelectedProducts = useCallback((productIds: string[]) => {
    setAssignmentState(prev => ({ ...prev, selectedProducts: productIds }));
  }, []);

  const setAssignmentMode = useCallback((mode: 'single' | 'bulk') => {
    setAssignmentState(prev => ({ ...prev, assignmentMode: mode }));
  }, []);

  return (
    <PlatformContext.Provider value={{
      platforms,
      loading,
      error,
      assignmentState,
      assignProductsToPlatforms,
      removeProductsFromPlatforms,
      setSelectedProducts,
      setAssignmentMode,
      refreshPlatforms: loadPlatforms
    }}>
      {children}
    </PlatformContext.Provider>
  );
};
```

### 2.3 Platform Toolbar Component

**File**: `src/features/menu/components/PlatformToolbar.tsx`
```typescript
import React, { useState } from 'react';
import {
  PlusIcon,
  MinusIcon,
  TagIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { Platform } from '../../../types/platform';
import { usePlatformContext } from '../../../contexts/PlatformContext';

interface PlatformToolbarProps {
  selectedProducts: string[];
  className?: string;
}

export const PlatformToolbar: React.FC<PlatformToolbarProps> = ({
  selectedProducts,
  className = ''
}) => {
  const { platforms, assignProductsToPlatforms, removeProductsFromPlatforms, assignmentState } = usePlatformContext();
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showRemoveDropdown, setShowRemoveDropdown] = useState(false);

  const handleAssignToPlatform = async (platformId: string) => {
    if (selectedProducts.length === 0) return;

    try {
      await assignProductsToPlatforms([platformId], selectedProducts);
      setShowAssignDropdown(false);
    } catch (error) {
      console.error('Assignment failed:', error);
    }
  };

  const handleRemoveFromPlatform = async (platformId: string) => {
    if (selectedProducts.length === 0) return;

    try {
      await removeProductsFromPlatforms([platformId], selectedProducts);
      setShowRemoveDropdown(false);
    } catch (error) {
      console.error('Removal failed:', error);
    }
  };

  if (selectedProducts.length === 0) return null;

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TagIcon className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            Platform Management - {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Assign to Platform Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAssignDropdown(!showAssignDropdown)}
              disabled={assignmentState.isAssigning}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Assign to Platform
              <ChevronDownIcon className="w-4 h-4 ml-1" />
            </button>

            {showAssignDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1 max-h-60 overflow-y-auto">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => handleAssignToPlatform(platform.id)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {platform.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Remove from Platform Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRemoveDropdown(!showRemoveDropdown)}
              disabled={assignmentState.isAssigning}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors disabled:opacity-50"
            >
              <MinusIcon className="w-4 h-4 mr-2" />
              Remove from Platform
              <ChevronDownIcon className="w-4 h-4 ml-1" />
            </button>

            {showRemoveDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1 max-h-60 overflow-y-auto">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => handleRemoveFromPlatform(platform.id)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {platform.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Phase 3: Enhanced VirtualizedProductGrid (Day 3-4)

### 3.1 Enhanced SingleProductCard

**File**: `src/features/menu/components/VirtualizedProductGrid.tsx` (Modify existing)
```typescript
// Add to imports
import { PlatformBadges } from './PlatformBadges';
import { usePlatformContext } from '../../../contexts/PlatformContext';

// Modify SingleProductCard component within VirtualizedProductGrid
const SingleProductCard = useMemo(() => ({ product }: { product: MenuProduct }) => {
  const { setSelectedProducts, setAssignmentMode } = usePlatformContext();
  const statusConfig = getStatusConfig(product.status);
  const isSelected = selectedProducts.includes(product.id);

  return (
    <div className={`product-card bg-white rounded-lg border transition-all duration-200 hover:shadow-md relative ${
      isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
    }`}>
      {/* Existing selection checkbox */}
      {selectionMode && (
        <div className="absolute top-3 left-3 z-20">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onProductSelect?.(product.id)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-blue-600 border-blue-600 shadow-md'
                : 'bg-white border-gray-300 hover:border-gray-400 shadow-sm'
            }`}>
              {isSelected && (
                <CheckIcon className="w-3 h-3 text-white" />
              )}
            </div>
          </label>
        </div>
      )}

      {/* Existing product image and status badge */}
      <div className="relative w-full h-48 rounded-t-lg overflow-hidden bg-gray-100">
        {/* ... existing image code ... */}
      </div>

      {/* Product Information */}
      <div className="p-4">
        {/* Existing name and category */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 text-base leading-tight mb-1 line-clamp-2">
            {getLocalizedText(product.name, language)}
          </h3>
          <p className="text-sm text-gray-500">
            {product.category ? getLocalizedText(product.category.name, language) : 'Uncategorized'}
          </p>

          {/* Company name for super_admin */}
          {user?.role === 'super_admin' && product.company && (
            <p className="text-xs text-blue-600 font-medium mt-1 bg-blue-50 px-2 py-1 rounded inline-block">
              🏢 {product.company.name}
            </p>
          )}
        </div>

        {/* NEW: Platform badges */}
        {product.platforms && product.platforms.length > 0 && (
          <div className="mb-3">
            <PlatformBadges
              platforms={product.platforms}
              maxVisible={3}
              size="sm"
              onClick={(platform) => {
                // Handle platform badge click - could show platform details
                console.log('Platform clicked:', platform.name);
              }}
            />
          </div>
        )}

        {/* Existing pricing, tags, prep time, etc. */}
        {/* ... rest of existing card content ... */}
      </div>
    </div>
  );
}, [selectedProducts, selectionMode, language, user?.role, onProductSelect, onProductEdit, onProductDelete, onProductView]);
```

### 3.2 Enhanced Menu Products Page Integration

**File**: `pages/menu/products.tsx` (Modify existing)
```typescript
// Add to imports
import { PlatformProvider } from '../../src/contexts/PlatformContext';
import { PlatformToolbar } from '../../src/features/menu/components/PlatformToolbar';

// Wrap the main content in PlatformProvider
export default function MenuProductsPage() {
  // ... existing state and hooks ...

  return (
    <PlatformProvider>
      <ProtectedRoute>
        <Head>
          <title>Product Catalog - Restaurant Management</title>
          <meta name="description" content="Enterprise product catalog management system" />
        </Head>

        <div className="min-h-screen bg-gray-50">
          {/* Existing debug panel and header */}

          {/* Main Content with Sidebar Layout */}
          <div className="flex h-[calc(100vh-64px)]">
            {/* Existing Category Sidebar */}
            <CategorySidebar
              key={categoriesKey}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={handleCategorySelect}
              onCategoryUpdate={handleCategoryUpdate}
            />

            {/* Main Products Area */}
            <div className="flex-1 flex flex-col">
              <div className="max-w-full px-4 sm:px-6 lg:px-8 py-8">

                {/* Existing Action Bar */}
                <div className="flex items-center justify-between mb-6">
                  {/* ... existing buttons ... */}
                </div>

                {/* Existing Selection Mode Banner */}
                {selectionMode && (
                  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    {/* ... existing selection banner ... */}
                  </div>
                )}

                {/* NEW: Platform Toolbar */}
                {selectionMode && (
                  <PlatformToolbar
                    selectedProducts={selectedProducts}
                    className="mb-6"
                  />
                )}

                {/* Existing Product Filters */}
                <ProductFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  categories={categories}
                  availableTags={availableTags}
                  className="mb-6"
                />

                {/* Existing Enterprise Product Grid */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1">
                  <VirtualizedProductGrid
                    key={`products-grid-${refreshTrigger}`}
                    filters={filters}
                    onProductSelect={selectionMode ? handleProductSelect : undefined}
                    onProductEdit={handleProductEdit}
                    onProductDelete={handleProductDelete}
                    onProductView={handleProductView}
                    selectedProducts={selectedProducts}
                    selectionMode={selectionMode}
                    refreshTrigger={refreshTrigger}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Existing modals */}
        </div>
      </ProtectedRoute>
    </PlatformProvider>
  );
}
```

## Phase 4: Platform Filtering (Day 4-5)

### 4.1 Enhanced Product Filters

**File**: `src/features/menu/components/ProductFilters.tsx` (Modify existing)
```typescript
// Add to imports
import { Platform } from '../../../types/platform';
import { usePlatformContext } from '../../../contexts/PlatformContext';

// Modify ProductFiltersProps interface
interface ProductFiltersProps {
  // ... existing props
  availablePlatforms?: Platform[]; // Add this
}

// Add platform filtering section to component
export const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFiltersChange,
  categories,
  availableTags,
  availablePlatforms = [], // Add this
  className = ''
}) => {
  const { platforms } = usePlatformContext();
  const effectivePlatforms = availablePlatforms.length > 0 ? availablePlatforms : platforms;

  // Add platform filter handler
  const handlePlatformToggle = useCallback((platformId: string) => {
    const currentPlatforms = filters.platformIds || [];
    const newPlatforms = currentPlatforms.includes(platformId)
      ? currentPlatforms.filter(id => id !== platformId)
      : [...currentPlatforms, platformId];

    onFiltersChange({ platformIds: newPlatforms });
  }, [filters.platformIds, onFiltersChange]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Existing filters (search, category, status, tags) */}

        {/* NEW: Platform Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platforms
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showUnassigned || false}
                onChange={(e) => onFiltersChange({ showUnassigned: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">Show Unassigned</span>
            </label>

            {effectivePlatforms.map((platform) => (
              <label key={platform.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.platformIds?.includes(platform.id) || false}
                  onChange={() => handlePlatformToggle(platform.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{platform.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 4.2 Enhanced Product Filters Type

**File**: `src/types/menu.ts` (Modify existing)
```typescript
// Modify ProductFilters interface
export interface ProductFilters {
  sortBy: string;
  sortOrder: string;
  status?: number;
  search: string;
  tags: string[];
  categoryId?: string;

  // NEW: Platform filtering
  platformIds?: string[];
  showUnassigned?: boolean;
  platformFilter?: 'assigned' | 'unassigned' | 'all';
}
```

## Phase 5: Backend Integration Enhancement (Day 5)

### 5.1 Enhanced API Service

**File**: `src/services/platformApi.ts`
```typescript
class PlatformApiService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL;

  private getAuthHeaders() {
    const token = localStorage.getItem('auth-token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getPlatforms(): Promise<{ platforms: Platform[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/menu/platforms`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) throw new Error('Failed to fetch platforms');
    return response.json();
  }

  async assignProductsToPlatform(platformId: string, productIds: string[]) {
    const response = await fetch(`${this.baseUrl}/menu/platforms/${platformId}/products`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ productIds })
    });

    if (!response.ok) throw new Error('Failed to assign products');
    return response.json();
  }

  async removeProductsFromPlatform(platformId: string, productIds: string[]) {
    const response = await fetch(`${this.baseUrl}/menu/platforms/${platformId}/products`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ productIds })
    });

    if (!response.ok) throw new Error('Failed to remove products');
    return response.json();
  }

  async getProductsWithPlatforms(filters: ProductFilters): Promise<any> {
    const response = await fetch(`${this.baseUrl}/menu/products/paginated`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        ...filters,
        includePlatforms: true // Request platform data
      })
    });

    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  }
}

export const platformApi = new PlatformApiService();
```

## Testing & Validation

### 5.1 Component Testing

**File**: `src/features/menu/components/__tests__/PlatformBadges.test.tsx`
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PlatformBadges } from '../PlatformBadges';
import { Platform } from '../../../../types/platform';

const mockPlatforms: Platform[] = [
  {
    id: '1',
    name: 'Careem Now',
    description: 'Food delivery platform',
    platformType: 'careem',
    status: 'active',
    menuCount: 25,
    isDefault: true,
    config: {},
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01'
  },
  // ... more mock platforms
];

describe('PlatformBadges', () => {
  it('renders platform badges correctly', () => {
    render(<PlatformBadges platforms={mockPlatforms} />);

    expect(screen.getByText('Careem Now')).toBeInTheDocument();
  });

  it('limits visible platforms to maxVisible', () => {
    render(<PlatformBadges platforms={mockPlatforms} maxVisible={2} />);

    // Should show "more" indicator if there are more platforms
    if (mockPlatforms.length > 2) {
      expect(screen.getByText(/\+\d+ more/)).toBeInTheDocument();
    }
  });

  it('calls onClick when platform badge is clicked', () => {
    const onClickMock = jest.fn();
    render(<PlatformBadges platforms={mockPlatforms} onClick={onClickMock} />);

    fireEvent.click(screen.getByText('Careem Now'));
    expect(onClickMock).toHaveBeenCalledWith(mockPlatforms[0]);
  });
});
```

### 5.2 Integration Testing

**File**: `src/features/menu/components/__tests__/PlatformToolbar.test.tsx`
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlatformToolbar } from '../PlatformToolbar';
import { PlatformProvider } from '../../../../contexts/PlatformContext';

const MockPlatformProvider = ({ children }: { children: React.ReactNode }) => (
  <PlatformProvider>
    {children}
  </PlatformProvider>
);

describe('PlatformToolbar', () => {
  it('shows platform assignment options when products are selected', () => {
    render(
      <MockPlatformProvider>
        <PlatformToolbar selectedProducts={['product-1', 'product-2']} />
      </MockPlatformProvider>
    );

    expect(screen.getByText(/2 products selected/)).toBeInTheDocument();
    expect(screen.getByText('Assign to Platform')).toBeInTheDocument();
    expect(screen.getByText('Remove from Platform')).toBeInTheDocument();
  });

  it('does not render when no products are selected', () => {
    render(
      <MockPlatformProvider>
        <PlatformToolbar selectedProducts={[]} />
      </MockPlatformProvider>
    );

    expect(screen.queryByText('Assign to Platform')).not.toBeInTheDocument();
  });
});
```

## Deployment Checklist

### Pre-deployment Validation
- [ ] All components render without errors
- [ ] Platform API endpoints respond correctly
- [ ] Database migrations applied
- [ ] Platform assignment functionality tested
- [ ] Product filtering by platform works
- [ ] Visual indicators display correctly
- [ ] Bulk operations complete successfully
- [ ] Error handling works as expected
- [ ] Performance meets requirements (virtualized grid)
- [ ] Cross-browser compatibility verified

### Post-deployment Monitoring
- [ ] API response times under 500ms
- [ ] No JavaScript errors in console
- [ ] Platform badges render correctly
- [ ] Selection mode works smoothly
- [ ] Database queries optimized
- [ ] User feedback collected
- [ ] Performance metrics tracked

This implementation guide provides a complete, step-by-step approach to building the platform management system while leveraging all existing infrastructure and maintaining system performance.