// Container component orchestrating menu builder logic

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useMenuProducts } from '../hooks/useMenuProducts';
import { useMenuCategories } from '../hooks/useMenuCategories';
import { useProductSelection } from '../hooks/useProductSelection';
import { useProductFilters } from '../hooks/useProductFilters';
import { useMenuSave } from '../hooks/useMenuSave';
import { MenuBuilderHeader } from '../components/MenuBuilderHeader';
import { FilterBar } from '../components/FilterBar';
import { SelectionSummary } from '../components/SelectionSummary';
import { ProductGrid } from '../components/ProductGrid';
import { ErrorDisplay } from '../components/ErrorDisplay';
import BranchSelector from '../../../components/menu/BranchSelector';
import ChannelSelector from '../../../components/menu/ChannelSelector';
import toast from 'react-hot-toast';

interface MenuBuilderContainerProps {
  onSave?: (menuData: any) => void;
  initialData?: any;
  className?: string;
}

export const MenuBuilderContainer: React.FC<MenuBuilderContainerProps> = ({
  onSave,
  initialData,
  className = ''
}) => {
  const { user } = useAuth();
  const { language } = useLanguage();

  // Form state
  const [menuName, setMenuName] = useState(initialData?.name ?? '');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(initialData?.branchIds ?? []);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>(initialData?.channelIds ?? []);

  // Custom hooks
  const { filters, categoryId, search, setCategoryId, setSearch } = useProductFilters();
  const { selectedIds, toggleProduct, selectAll, deselectAll, clearSelection } = useProductSelection({
    initialSelection: initialData?.productIds
  });

  // Data fetching
  const {
    products,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts
  } = useMenuProducts({
    categoryId,
    search,
    enabled: !!user
  });

  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories
  } = useMenuCategories();

  // Menu save mutation
  const { saveMenu, saving } = useMenuSave();

  // Computed values
  const visibleProductIds = useMemo(() => products.map(p => p.id), [products]);

  const canSave = useMemo(() => {
    return menuName.trim() !== '' &&
           selectedBranchIds.length > 0 &&
           selectedChannelIds.length > 0 &&
           selectedIds.length > 0;
  }, [menuName, selectedBranchIds, selectedChannelIds, selectedIds]);

  // Event handlers
  const handleSelectAllVisible = () => {
    const allSelected = visibleProductIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      deselectAll(visibleProductIds);
    } else {
      selectAll(visibleProductIds);
    }
  };

  const handleSaveMenu = async () => {
    // Validation
    if (!menuName.trim()) {
      toast.error('Please enter a menu name');
      return;
    }

    if (selectedBranchIds.length === 0) {
      toast.error('Please select at least one branch');
      return;
    }

    if (selectedChannelIds.length === 0) {
      toast.error('Please select at least one channel');
      return;
    }

    if (selectedIds.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    const menuData = {
      name: menuName,
      branchIds: selectedBranchIds,
      channelIds: selectedChannelIds,
      productIds: selectedIds,
      createdAt: new Date().toISOString(),
      createdBy: user?.id
    };

    if (onSave) {
      // Use custom save handler if provided
      try {
        await onSave(menuData);
        // Reset form on success
        setMenuName('');
        setSelectedBranchIds([]);
        setSelectedChannelIds([]);
        clearSelection();
      } catch (error) {
        // Error handling is done by parent
      }
    } else {
      // Use default save mutation
      saveMenu(menuData, {
        onSuccess: () => {
          // Reset form
          setMenuName('');
          setSelectedBranchIds([]);
          setSelectedChannelIds([]);
          clearSelection();
        }
      });
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <MenuBuilderHeader
        onSave={handleSaveMenu}
        saving={saving}
        canSave={canSave}
      />

      {/* Configuration Section */}
      <div className="px-6 py-6 space-y-6">
        {/* Menu Name */}
        <div>
          <label htmlFor="menu-name" className="block text-sm font-medium text-gray-700 mb-2">
            Menu Name *
          </label>
          <input
            type="text"
            id="menu-name"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder="Enter menu name (e.g., 'Weekend Special Menu')"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          />
        </div>

        {/* Branch and Channel Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Branch Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Branches *
            </label>
            <BranchSelector
              selectedBranchIds={selectedBranchIds}
              onBranchChange={setSelectedBranchIds}
              placeholder="Select branches for this menu"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Choose which branches will use this menu
            </p>
          </div>

          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Channels *
            </label>
            <ChannelSelector
              selectedChannelIds={selectedChannelIds}
              onChannelChange={setSelectedChannelIds}
              placeholder="Select channels for this menu"
              required
              allowMultiple={true}
            />
            <p className="mt-1 text-xs text-gray-500">
              Choose delivery platforms and order channels
            </p>
          </div>
        </div>

        {/* Product Selection */}
        <div>
          <SelectionSummary
            selectedCount={selectedIds.length}
            visibleProductIds={visibleProductIds}
            selectedIds={selectedIds}
            onSelectAllVisible={handleSelectAllVisible}
          />

          {/* Filters */}
          <FilterBar
            searchTerm={search}
            onSearchChange={setSearch}
            selectedCategoryId={categoryId}
            onCategoryChange={setCategoryId}
            categories={categories}
            language={language}
          />

          {/* Category Error Display */}
          {categoriesError && (
            <ErrorDisplay
              title="Failed to load categories"
              message={categoriesError instanceof Error ? categoriesError.message : 'Unknown error'}
              onRetry={refetchCategories}
            />
          )}

          {/* Product Error Display */}
          {productsError && (
            <ErrorDisplay
              title="Failed to load products"
              message={productsError instanceof Error ? productsError.message : 'Unknown error'}
              onRetry={refetchProducts}
            />
          )}

          {/* Products Grid */}
          <div className="border border-gray-200 rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
            <ProductGrid
              products={products}
              selectedIds={selectedIds}
              onProductToggle={toggleProduct}
              loading={productsLoading}
              language={language}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
