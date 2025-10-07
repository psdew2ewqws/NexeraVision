// Barrel exports for menu builder feature

// Main container
export { MenuBuilderContainer } from './containers/MenuBuilderContainer';

// Components
export { ProductCard } from './components/ProductCard';
export { ProductGrid } from './components/ProductGrid';
export { FilterBar } from './components/FilterBar';
export { SelectionSummary } from './components/SelectionSummary';
export { MenuBuilderHeader } from './components/MenuBuilderHeader';
export { ErrorDisplay } from './components/ErrorDisplay';

// Hooks
export { useMenuProducts } from './hooks/useMenuProducts';
export { useMenuCategories } from './hooks/useMenuCategories';
export { useProductSelection } from './hooks/useProductSelection';
export { useProductFilters } from './hooks/useProductFilters';
export { useMenuSave } from './hooks/useMenuSave';

// Services
export { menuBuilderService } from './services/menuBuilderService';

// Types
export type {
  MenuProduct,
  MenuCategory,
  ProductFilters,
  MenuData,
  PaginatedProductsResponse,
  CategoriesResponse,
  SaveMenuResponse
} from './types/menuBuilder.types';

// Schemas
export {
  menuProductSchema,
  menuCategorySchema,
  productFiltersSchema,
  menuDataSchema,
  paginatedProductsResponseSchema,
  categoriesResponseSchema,
  saveMenuResponseSchema
} from './schemas/menuBuilder.schemas';

// Utilities
export {
  groupProductsByCategory,
  calculateTotalPrice,
  filterProductsBySearch,
  sortProducts,
  validateMenuData,
  debounce
} from './utils/menuBuilder.utils';
