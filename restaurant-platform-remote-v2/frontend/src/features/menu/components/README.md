# Menu Product Selection UI Implementation

## Overview

This implementation provides a comprehensive dual-pane interface for menu product selection, allowing users to assign products to platform-specific menus (Talabat, Careem, etc.) with drag-and-drop functionality and real-time updates.

## Architecture

### Components Structure

```
src/features/menu/components/
├── MenuProductSelectionUI.tsx     # Main dual-pane interface
├── ProductCard.tsx                # Individual product card component
├── PlatformMenuManager.tsx        # Updated to use new UI
└── hooks/
    └── useMenuProductSelection.ts  # React Query hooks for API operations
```

### Key Features

1. **Dual-Pane Interface**
   - Left pane: All company products (not assigned to current platform)
   - Right pane: Products assigned to current platform menu

2. **Interactive Functionality**
   - Click-to-add products from left to right pane
   - Click-to-remove products from right pane (menu-only removal)
   - Drag-and-drop support using @dnd-kit library
   - Real-time product count display

3. **Advanced Filtering**
   - Search by product name and description
   - Filter by category
   - Filter by status (active/inactive)
   - Sort by name, price, category, or priority

4. **Platform-Specific Features**
   - Branch-level menu management
   - Platform-specific pricing display
   - Real-time synchronization

## Component Details

### MenuProductSelectionUI

**Props:**
```typescript
interface MenuProductSelectionUIProps {
  platform: Platform;          // Target platform (Talabat, Careem, etc.)
  branchId?: string;           // Optional branch-specific filtering
  onProductCountChange?: (count: number) => void; // Real-time count updates
  className?: string;          // Additional styling
}
```

**Key Features:**
- Dual-pane layout with independent filtering
- Drag-and-drop functionality with visual feedback
- Real-time product count tracking
- Optimistic UI updates for better UX

### ProductCard

**Props:**
```typescript
interface ProductCardProps {
  product: MenuProduct;        // Product data
  onAdd?: () => void;         // Add to menu handler
  onRemove?: () => void;      // Remove from menu handler
  showAddButton?: boolean;    // Show/hide add button
  isDraggable?: boolean;      // Enable drag functionality
  categories?: MenuCategory[]; // For category name resolution
  showPlatformBadge?: boolean; // Display platform assignment
  platformName?: string;     // Platform name for badge
  isDragOverlay?: boolean;    // Styling for drag overlay
}
```

**Features:**
- Responsive card design with product details
- Action buttons (add/remove)
- Drag handle for reordering
- Status indicators and pricing display
- Platform-specific pricing breakdown

### useMenuProductSelection Hook

**Return Values:**
```typescript
interface UseMenuProductSelectionReturn {
  allProducts: MenuProduct[];           // All available products
  assignedProducts: MenuProduct[];      // Products in current menu
  loading: boolean;                     // Loading state
  error: string | null;                 // Error state
  addProductToMenu: (product: MenuProduct) => Promise<void>;
  removeProductFromMenu: (productId: string) => Promise<void>;
  reorderMenuProducts: (productIds: string[]) => Promise<void>;
  loadAllProducts: () => Promise<void>;
  loadAssignedProducts: () => Promise<void>;
  refreshData: () => Promise<void>;
}
```

**Features:**
- React Query for caching and synchronization
- Optimistic updates for better UX
- Error handling with toast notifications
- Background refetching and cache invalidation

## Integration

### With MenuBuilderWorkspace

The MenuProductSelectionUI integrates seamlessly with the existing MenuBuilderWorkspace:

```typescript
// In MenuBuilderWorkspace.tsx
{activeTab === 'menu-items' && (
  <PlatformMenuManager
    platform={platform}
    selectedProducts={selectedProducts}
    onProductSelect={handleProductSelect}
    onProductEdit={handleProductEdit}
    onProductRemove={handleProductRemove}
  />
)}
```

### API Endpoints Used

1. **GET /menu/products/paginated** - Load all products with filtering
2. **GET /menu/platforms/{id}/products** - Load assigned products
3. **POST /menu/platforms/{id}/products** - Add products to menu
4. **DELETE /menu/platforms/{id}/products** - Remove products from menu
5. **PUT /menu/platforms/{id}/products/reorder** - Reorder menu products
6. **GET /menu/categories** - Load categories for filtering

## Configuration

### Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1

# Backend (.env)
PORT=3002
DATABASE_URL="postgresql://postgres:E%24%24athecode006@localhost:5432/postgres"
```

### Dependencies

The implementation uses the following key dependencies:

```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@dnd-kit/utilities": "^3.2.2",
  "@tanstack/react-query": "^4.40.1",
  "@heroicons/react": "^2.0.18",
  "react-hot-toast": "^2.4.1"
}
```

## Usage Examples

### Basic Usage

```typescript
import { MenuProductSelectionUI } from '@/features/menu/components/MenuProductSelectionUI';

function PlatformMenuPage({ platform }) {
  const [productCount, setProductCount] = useState(0);

  return (
    <MenuProductSelectionUI
      platform={platform}
      onProductCountChange={setProductCount}
      className="h-full"
    />
  );
}
```

### With Branch-Specific Filtering

```typescript
<MenuProductSelectionUI
  platform={platform}
  branchId={selectedBranchId}
  onProductCountChange={handleCountChange}
/>
```

### Custom Styling

```typescript
<MenuProductSelectionUI
  platform={platform}
  className="rounded-lg shadow-lg border-2 border-blue-200"
/>
```

## Performance Considerations

1. **Virtualization**: Large product lists are handled efficiently
2. **Lazy Loading**: Products load on-demand with pagination
3. **Optimistic Updates**: Immediate UI feedback while API calls process
4. **Caching**: React Query provides intelligent caching and background updates
5. **Debounced Search**: Search input is debounced to reduce API calls

## Accessibility Features

1. **Keyboard Navigation**: Full keyboard support for all interactions
2. **ARIA Labels**: Proper labeling for screen readers
3. **Focus Management**: Logical tab order and focus indicators
4. **Color Contrast**: WCAG 2.1 AA compliant color schemes
5. **Drag and Drop**: Alternative keyboard actions for drag operations

## Error Handling

1. **Network Errors**: Graceful degradation with retry mechanisms
2. **Validation Errors**: Clear user feedback for invalid operations
3. **Loading States**: Visual indicators during operations
4. **Fallback UI**: Mock data for development when backend unavailable

## Testing Strategy

1. **Unit Tests**: Individual component testing with Jest
2. **Integration Tests**: API integration with MSW mocking
3. **E2E Tests**: Full user workflows with Playwright
4. **Accessibility Tests**: WCAG compliance validation

## Future Enhancements

1. **Bulk Operations**: Multi-select for bulk add/remove
2. **Advanced Filtering**: Custom filter combinations
3. **Product Analytics**: Usage statistics and recommendations
4. **Offline Support**: PWA capabilities for offline menu management
5. **Import/Export**: Bulk menu import/export functionality

## Troubleshooting

### Common Issues

1. **404 Errors**: Ensure backend is running on correct port (3002)
2. **Authentication Issues**: Check JWT token in localStorage
3. **Category Loading**: Verify user permissions and company access
4. **Drag and Drop**: Ensure proper touch/mouse event handlers

### Debug Mode

Enable debug mode by setting:
```typescript
// In development
const showDebugPanel = process.env.NODE_ENV === 'development';
```

### API Testing

Test endpoints manually:
```bash
# Test backend health
curl http://localhost:3002/api/v1/health

# Test menu products endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3002/api/v1/menu/products/paginated
```

## Implementation Details

### State Management

The implementation uses a hybrid approach:
- React Query for server state
- Local state for UI interactions
- Context API for global settings (language, auth)

### Optimization Strategies

1. **Memo Usage**: React.memo for preventing unnecessary re-renders
2. **Callback Dependencies**: Proper useCallback dependencies
3. **Query Keys**: Strategic React Query key structure
4. **Batch Updates**: Grouped state updates for performance

This implementation provides a robust, scalable solution for menu product management with excellent user experience and performance characteristics.