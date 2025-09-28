// Menu Product Selection UI - Dual Pane Interface for Platform Menu Management
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  closestCorners,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TagIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { MenuProduct, MenuCategory, Platform } from '../../../types/menu';
import { getLocalizedText } from '../../../lib/menu-utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ProductCard } from './ProductCard';
import { CategoryBulkSelector } from './CategoryBulkSelector';
import { useMenuProductSelection, usePlatformProducts } from '../hooks/useMenuProductSelection';
import toast from 'react-hot-toast';

interface MenuProductSelectionUIProps {
  platform: Platform;
  branchId?: string;
  onProductCountChange?: (count: number) => void;
  className?: string;
}

interface ProductPaneFilters {
  search: string;
  categoryId?: string;
  status?: 'all' | 'active' | 'inactive';
  sortBy: 'name' | 'price' | 'category' | 'priority';
  sortOrder: 'asc' | 'desc';
}

export const MenuProductSelectionUI: React.FC<MenuProductSelectionUIProps> = ({
  platform,
  branchId,
  onProductCountChange,
  className = ''
}) => {
  const { language } = useLanguage();

  // State management
  const [leftPaneFilters, setLeftPaneFilters] = useState<ProductPaneFilters>({
    search: '',
    categoryId: undefined,
    status: 'active',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const [rightPaneFilters, setRightPaneFilters] = useState<ProductPaneFilters>({
    search: '',
    categoryId: undefined,
    status: 'all',
    sortBy: 'priority',
    sortOrder: 'asc'
  });

  const [draggedProduct, setDraggedProduct] = useState<MenuProduct | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [showBulkSelector, setShowBulkSelector] = useState(false);

  // Custom hook for API operations
  const {
    allProducts,
    assignedProducts,
    loading,
    addProductToMenu,
    removeProductFromMenu,
    reorderMenuProducts,
    bulkAddProducts,
    bulkRemoveProducts,
    loadAllProducts,
    loadAssignedProducts,
    refreshData
  } = useMenuProductSelection(platform.id, branchId);

  // Initialize data on mount
  useEffect(() => {
    loadCategories();
    refreshData();
  }, [platform.id, branchId]);

  // Update product count when assigned products change
  useEffect(() => {
    if (onProductCountChange) {
      onProductCountChange(assignedProducts.length);
    }
  }, [assignedProducts.length, onProductCountChange]);

  // Load categories for filtering
  const loadCategories = async () => {
    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/menu/categories`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // Filter and sort products for left pane (all products)
  const filteredAllProducts = useMemo(() => {
    let filtered = allProducts.filter(product =>
      !assignedProducts.find(assigned => assigned.id === product.id)
    );

    // Apply filters
    if (leftPaneFilters.search) {
      const searchLower = leftPaneFilters.search.toLowerCase();
      filtered = filtered.filter(product =>
        getLocalizedText(product.name).toLowerCase().includes(searchLower) ||
        getLocalizedText(product.description || '').toLowerCase().includes(searchLower)
      );
    }

    if (leftPaneFilters.categoryId) {
      filtered = filtered.filter(product => product.categoryId === leftPaneFilters.categoryId);
    }

    if (leftPaneFilters.status !== 'all') {
      const isActive = leftPaneFilters.status === 'active';
      filtered = filtered.filter(product => (product.status === 1) === isActive);
    }

    // Sort products
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (leftPaneFilters.sortBy) {
        case 'name':
          comparison = getLocalizedText(a.name).localeCompare(getLocalizedText(b.name));
          break;
        case 'price':
          comparison = a.basePrice - b.basePrice;
          break;
        case 'category':
          const catA = categories.find(c => c.id === a.categoryId)?.name || '';
          const catB = categories.find(c => c.id === b.categoryId)?.name || '';
          comparison = getLocalizedText(catA).localeCompare(getLocalizedText(catB));
          break;
        case 'priority':
          comparison = a.priority - b.priority;
          break;
      }
      return leftPaneFilters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [allProducts, assignedProducts, leftPaneFilters, categories]);

  // Filter and sort products for right pane (assigned products)
  const filteredAssignedProducts = useMemo(() => {
    let filtered = [...assignedProducts];

    // Apply filters
    if (rightPaneFilters.search) {
      const searchLower = rightPaneFilters.search.toLowerCase();
      filtered = filtered.filter(product =>
        getLocalizedText(product.name).toLowerCase().includes(searchLower) ||
        getLocalizedText(product.description || '').toLowerCase().includes(searchLower)
      );
    }

    if (rightPaneFilters.categoryId) {
      filtered = filtered.filter(product => product.categoryId === rightPaneFilters.categoryId);
    }

    if (rightPaneFilters.status !== 'all') {
      const isActive = rightPaneFilters.status === 'active';
      filtered = filtered.filter(product => (product.status === 1) === isActive);
    }

    // Sort products
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (rightPaneFilters.sortBy) {
        case 'name':
          comparison = getLocalizedText(a.name).localeCompare(getLocalizedText(b.name));
          break;
        case 'price':
          comparison = a.basePrice - b.basePrice;
          break;
        case 'category':
          const catA = categories.find(c => c.id === a.categoryId)?.name || '';
          const catB = categories.find(c => c.id === b.categoryId)?.name || '';
          comparison = getLocalizedText(catA).localeCompare(getLocalizedText(catB));
          break;
        case 'priority':
          comparison = a.priority - b.priority;
          break;
      }
      return rightPaneFilters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [assignedProducts, rightPaneFilters, categories]);

  // Drag and drop setup
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Droppable zones for left and right panes
  const { setNodeRef: setLeftPaneRef } = useDroppable({
    id: 'left-pane'
  });

  const { setNodeRef: setRightPaneRef } = useDroppable({
    id: 'right-pane'
  });

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const product = [...filteredAllProducts, ...filteredAssignedProducts].find(p => p.id === active.id);
    setDraggedProduct(product || null);
  }, [filteredAllProducts, filteredAssignedProducts]);

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedProduct(null);

    if (!over) return;

    const productId = active.id as string;
    const overId = over.id as string;

    // Debug logging
    console.log('🔥 DRAG DEBUG:', {
      productId,
      overId,
      available: filteredAllProducts.map(p => ({ id: p.id, name: getLocalizedText(p.name) })),
      assigned: filteredAssignedProducts.map(p => ({ id: p.id, name: getLocalizedText(p.name) }))
    });

    // Handle dropping on panes
    if (overId === 'left-pane' || overId === 'right-pane') {
      if (overId === 'right-pane') {
        // Add product to menu
        const product = filteredAllProducts.find(p => p.id === productId);
        if (product) {
          console.log('🎯 Adding product to menu:', product.name);
          await addProductToMenu(product);
        }
      } else if (overId === 'left-pane') {
        // Remove product from menu
        console.log('🗑️ Removing product from menu:', productId);
        await removeProductFromMenu(productId);
      }
      return;
    }

    // Check if dropping from one pane to another by analyzing product lists
    const isFromAvailable = filteredAllProducts.find(p => p.id === productId);
    const isFromAssigned = filteredAssignedProducts.find(p => p.id === productId);
    const isDroppedOnAssigned = filteredAssignedProducts.find(p => p.id === overId);
    const isDroppedOnAvailable = filteredAllProducts.find(p => p.id === overId);

    if (isFromAvailable && isDroppedOnAssigned) {
      // Dragging from available to assigned pane
      console.log('🎯 Cross-pane drag: Available → Menu');
      const product = filteredAllProducts.find(p => p.id === productId);
      if (product) {
        await addProductToMenu(product);
      }
      return;
    }

    if (isFromAssigned && isDroppedOnAvailable) {
      // Dragging from assigned to available pane
      console.log('🗑️ Cross-pane drag: Menu → Available');
      await removeProductFromMenu(productId);
      return;
    }

    // Handle reordering within assigned products
    if (assignedProducts.find(p => p.id === productId) && assignedProducts.find(p => p.id === overId)) {
      const oldIndex = assignedProducts.findIndex(p => p.id === productId);
      const newIndex = assignedProducts.findIndex(p => p.id === overId);

      if (oldIndex !== newIndex) {
        const reorderedProducts = arrayMove(assignedProducts, oldIndex, newIndex);
        await reorderMenuProducts(reorderedProducts.map(p => p.id));
      }
    }
  }, [filteredAllProducts, assignedProducts, addProductToMenu, removeProductFromMenu, reorderMenuProducts]);

  // Handle direct click actions
  const handleAddProduct = useCallback(async (product: MenuProduct) => {
    await addProductToMenu(product);
  }, [addProductToMenu]);

  const handleRemoveProduct = useCallback(async (productId: string) => {
    await removeProductFromMenu(productId);
  }, [removeProductFromMenu]);

  // Handle bulk category addition
  const handleBulkCategoryAdd = useCallback(async (productIds: string[], categoryName: string) => {
    try {
      await bulkAddProducts(productIds);
      toast.success(`Added all products from "${categoryName}" category`);
      // Refresh data to update both panes
      await refreshData();
    } catch (error) {
      console.error('Bulk category add error:', error);
      toast.error(`Failed to add products from "${categoryName}" category`);
      throw error; // Re-throw to let CategoryBulkSelector handle it
    }
  }, [bulkAddProducts, refreshData]);

  // Filter components
  const renderFilterBar = (
    filters: ProductPaneFilters,
    setFilters: React.Dispatch<React.SetStateAction<ProductPaneFilters>>,
    placeholder: string
  ) => (
    <div className="p-4 border-b border-gray-200 bg-gray-50">
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={placeholder}
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category and Status Filters */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filters.categoryId || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, categoryId: e.target.value || undefined }))}
            className="text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {getLocalizedText(category.name, language)}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            className="text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Sort Options */}
        <div className="flex space-x-2">
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
            className="flex-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="category">Category</option>
            <option value="priority">Priority</option>
          </select>
          <button
            onClick={() => setFilters(prev => ({
              ...prev,
              sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
            }))}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {filters.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {platform.icon && <platform.icon className="w-6 h-6 text-blue-600" />}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {getLocalizedText(platform.name || '', language)} Menu Builder
              </h2>
              <p className="text-sm text-gray-600">
                Assign products to this platform menu
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{assignedProducts.length}</span> products assigned
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-[600px]">
          {/* Left Pane - All Products */}
          <div className="flex-1 border-r border-gray-200 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DocumentDuplicateIcon className="w-5 h-5 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Available Products ({filteredAllProducts.length})
                  </h3>
                </div>

                <button
                  onClick={() => setShowBulkSelector(!showBulkSelector)}
                  className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                    showBulkSelector
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {showBulkSelector ? 'Hide' : 'Bulk Add'}
                </button>
              </div>
            </div>

            {renderFilterBar(leftPaneFilters, setLeftPaneFilters, "Search available products...")}

            {/* Category Bulk Selector */}
            {showBulkSelector && (
              <div className="border-b border-gray-200 p-4 bg-purple-25">
                <CategoryBulkSelector
                  categories={categories}
                  allProducts={filteredAllProducts}
                  platform={platform}
                  onBulkAdd={handleBulkCategoryAdd}
                  disabled={loading}
                />
              </div>
            )}

            <div
              ref={setLeftPaneRef}
              id="left-pane"
              className="flex-1 overflow-y-auto p-4 bg-gray-25"
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin mr-3" />
                  <span className="text-gray-500">Loading products...</span>
                </div>
              ) : filteredAllProducts.length === 0 ? (
                <div className="text-center py-8">
                  <DocumentDuplicateIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No available products found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SortableContext items={filteredAllProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {filteredAllProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={() => handleAddProduct(product)}
                        onRemove={undefined}
                        showAddButton={true}
                        isDraggable={true}
                        categories={categories}
                        className="transform hover:scale-[1.02] transition-transform duration-200"
                      />
                    ))}
                  </SortableContext>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane - Assigned Products */}
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {getLocalizedText(platform.name || '', language)} Menu ({filteredAssignedProducts.length})
                </h3>
              </div>
            </div>

            {renderFilterBar(rightPaneFilters, setRightPaneFilters, "Search menu products...")}

            <div
              ref={setRightPaneRef}
              id="right-pane"
              className="flex-1 overflow-y-auto p-4 bg-blue-25"
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <ArrowPathIcon className="w-6 h-6 text-blue-400 animate-spin mr-3" />
                  <span className="text-blue-600">Loading menu...</span>
                </div>
              ) : filteredAssignedProducts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                  <p className="text-blue-600">No products in this menu yet</p>
                  <p className="text-sm text-blue-500 mt-1">Drag products from the left or click the + button</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SortableContext items={filteredAssignedProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {filteredAssignedProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={undefined}
                        onRemove={() => handleRemoveProduct(product.id)}
                        showAddButton={false}
                        isDraggable={true}
                        categories={categories}
                        showPlatformBadge={true}
                        platformName={getLocalizedText(platform.name || '', language)}
                        className="transform hover:scale-[1.02] transition-transform duration-200"
                      />
                    ))}
                  </SortableContext>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedProduct ? (
            <ProductCard
              product={draggedProduct}
              onAdd={undefined}
              onRemove={undefined}
              showAddButton={false}
              isDraggable={false}
              categories={categories}
              isDragOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};