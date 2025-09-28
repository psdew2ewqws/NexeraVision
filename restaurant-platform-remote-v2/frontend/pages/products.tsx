// Enterprise Menu Products Management - B2B Professional
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  PlusIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../src/contexts/AuthContext';
import { useLanguage } from '../src/contexts/LanguageContext';
import { ProtectedRoute } from '../src/components/shared/ProtectedRoute';
import { VirtualizedProductGrid } from '../src/features/menu/components/VirtualizedProductGrid';
import { ProductFilters } from '../src/features/menu/components/ProductFilters';
import { CategorySidebar } from '../src/features/menu/components/CategorySidebar';
import { AddProductModal } from '../src/features/menu/components/AddProductModal';
import { EditProductModal } from '../src/features/menu/components/EditProductModal';
import { ProductViewModal } from '../src/features/menu/components/ProductViewModal';
import { ProductSelectionToolbar, CompactProductSelectionToolbar } from '../src/features/menu/components/ProductSelectionToolbar';
import { PlatformAssignmentModal } from '../src/features/menu/components/PlatformAssignmentModal';
import { PlatformFilter } from '../src/features/menu/components/PlatformFilter';
import { ProductFilters as ProductFiltersType, MenuProduct, MenuCategory } from '../src/types/menu';
import toast from 'react-hot-toast';

export default function MenuProductsPage() {
  const { user, isLoading, isAuthenticated, isHydrated } = useAuth();
  const { language, t } = useLanguage();

  // Debug auth state
  useEffect(() => {
    console.log('MenuProductsPage: Auth state', {
      user: user ? { id: user.id, email: user.email, role: user.role } : null,
      isLoading,
      isAuthenticated,
      isHydrated,
      hasLocalToken: !!localStorage.getItem('auth-token'),
      hasLocalUser: !!localStorage.getItem('user')
    });
  }, [user, isLoading, isAuthenticated, isHydrated]);
  const [filters, setFilters] = useState<ProductFiltersType>({
    sortBy: 'priority',
    sortOrder: 'asc',
    status: undefined,
    search: '',
    tags: []
  });
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuProduct | null>(null);
  const [isViewProductModalOpen, setIsViewProductModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<MenuProduct | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Platform management state
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>([]);
  const [isPlatformAssignmentModalOpen, setIsPlatformAssignmentModalOpen] = useState(false);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  
  // Create a key based on categories data to force re-render when categories change
  const categoriesKey = useMemo(() => {
    return categories.map(cat => `${cat.id}-${cat.isActive}-${cat.displayNumber}`).join('|');
  }, [categories]);

  // Load categories and tags for filters
  useEffect(() => {
    if (isHydrated && !isLoading) {
      loadFilterData();
    }
  }, [user?.companyId, isAuthenticated, isHydrated, isLoading]);

  const loadFilterData = async () => {
    console.log('loadFilterData called with user:', user);

    // Check if user is authenticated before loading data
    if (!user || !isAuthenticated) {
      console.log('Skipping loadFilterData - user not authenticated');
      return;
    }

    // Super admins can see all data, regular users need companyId
    if (!user?.companyId && user?.role !== 'super_admin') {
      console.log('Skipping loadFilterData - no companyId and not super_admin');
      return;
    }

    try {
      const authToken = localStorage.getItem('auth-token');
      if (!authToken) {
        console.error('No auth token found in localStorage');
        return;
      }

      console.log('Loading categories and tags...');
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/categories`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/tags`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      ]);

      console.log('API responses:', {
        categoriesStatus: categoriesRes.status,
        tagsStatus: tagsRes.status
      });

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        console.log('Categories loaded:', categoriesData.categories?.length || 0);
        setCategories(categoriesData.categories || []);
      } else {
        console.error('Categories API failed:', categoriesRes.status, await categoriesRes.text());
      }

      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        console.log('Tags loaded:', tagsData.tags?.length || 0);
        setAvailableTags(tagsData.tags || []);
      } else {
        console.error('Tags API failed:', tagsRes.status, await tagsRes.text());
      }
    } catch (error) {
      console.error('Failed to load filter data:', error);
    }
  };

  // Load platforms for platform management
  const loadPlatforms = useCallback(async () => {
    if (!user || !isAuthenticated) return;

    try {
      setPlatformsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/platforms`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlatforms(data.platforms || []);
      } else {
        console.error('Platforms API failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
    } finally {
      setPlatformsLoading(false);
    }
  }, [user, isAuthenticated]);

  // Load platforms on mount
  useEffect(() => {
    if (isHydrated && !isLoading) {
      loadPlatforms();
    }
  }, [isHydrated, isLoading, loadPlatforms]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: Partial<ProductFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Handle platform filter changes
  const handlePlatformFilterChange = useCallback((platformIds: string[]) => {
    setSelectedPlatformIds(platformIds);
  }, []);

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string | undefined) => {
    setSelectedCategoryId(categoryId);
    setFilters(prev => ({ ...prev, categoryId }));
  }, []);

  // Universal refresh function for all data updates
  const refreshAllData = useCallback(async () => {
    // Reload categories first and wait for completion
    await loadFilterData();
    // Force product grid to refresh after categories are loaded
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Immediate category update function - updates local state instantly
  const updateCategoryInState = useCallback((categoryId: string, updates: Partial<MenuCategory>) => {
    setCategories(prevCategories => 
      prevCategories.map(cat => 
        cat.id === categoryId ? { ...cat, ...updates } : cat
      )
    );
  }, []);

  // Handle category updates (refresh categories list and products)
  const handleCategoryUpdate = useCallback((categoryId?: string, updates?: Partial<MenuCategory>) => {
    // If we have specific category updates, apply them immediately
    if (categoryId && updates) {
      updateCategoryInState(categoryId, updates);
    }
    
    // Also refresh from backend and trigger product grid refresh
    refreshAllData();
  }, [refreshAllData, updateCategoryInState]);

  // Handle product selection for bulk operations
  const handleProductSelect = useCallback((productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  // Handle select all products
  const handleSelectAll = useCallback(() => {
    // This would require knowing all product IDs from the current filter
    // For now, we'll need to implement this in the product grid component
    toast('Select all functionality will be available in the product grid');
  }, []);

  // Handle platform assignment
  const handlePlatformAssignment = useCallback(() => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products first');
      return;
    }
    setIsPlatformAssignmentModalOpen(true);
  }, [selectedProducts]);

  // Handle platform assignment completion
  const handlePlatformAssignmentComplete = useCallback(() => {
    // Refresh products to show updated platform assignments
    refreshAllData();
    // Clear selection
    setSelectedProducts([]);
    setSelectionMode(false);
  }, [refreshAllData]);

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    setSelectedProducts([]);
  }, []);

  // Bulk operations
  const handleBulkStatusChange = useCallback(async (status: number) => {
    if (selectedProducts.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/products/bulk-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          productIds: selectedProducts,
          status
        }),
      });

      if (response.ok) {
        toast.success(`${selectedProducts.length} products updated successfully`);
        setSelectedProducts([]);
        setSelectionMode(false);
        // Refresh products grid to show updated status
        refreshAllData();
      } else {
        throw new Error('Failed to update products');
      }
    } catch (error) {
      toast.error('Failed to update products');
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, refreshAllData]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedProducts.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/products/bulk-delete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          productIds: selectedProducts
        }),
      });

      if (response.ok) {
        toast.success(`${selectedProducts.length} products deleted successfully`);
        setSelectedProducts([]);
        setSelectionMode(false);
        // Refresh products grid to reflect deletions
        refreshAllData();
      } else {
        throw new Error('Failed to delete products');
      }
    } catch (error) {
      toast.error('Failed to delete products');
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, refreshAllData]);

  // Product actions
  const handleProductView = useCallback(async (product: MenuProduct) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/products/${product.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const productData = await response.json();
        setViewingProduct(productData);
        setIsViewProductModalOpen(true);
      } else {
        throw new Error('Failed to fetch product details');
      }
    } catch (error) {
      console.error('View product error:', error);
      toast.error('Failed to load product details');
    }
  }, []);

  const handleProductEdit = useCallback((product: MenuProduct) => {
    setEditingProduct(product);
    setIsEditProductModalOpen(true);
  }, []);

  const handleProductDelete = useCallback(async (productId: string, productName?: string) => {
    const name = productName || 'this product';
    
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        toast.success(`"${name}" deleted successfully`);
        refreshAllData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }
    } catch (error) {
      toast.error(`Failed to delete "${name}"`);
      console.error('Delete error:', error);
    }
  }, [refreshAllData]);

  // Export functionality
  const handleExport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/products/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export products');
      }
      
      const exportResult = await response.json();
      
      // Convert data to Excel and download
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportResult.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
      
      // Download file
      const filename = exportResult.filename || 'products-export.xlsx';
      XLSX.writeFile(workbook, filename);
      
      toast.success(`Exported ${exportResult.totalCount} products successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export products');
    } finally {
      setLoading(false);
    }
  }, []);

  // Download import template
  const handleDownloadTemplate = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/products/import-template`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const templateResult = await response.json();
      
      // Convert data to Excel and download
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(templateResult.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products Template');
      
      // Add instructions sheet
      if (templateResult.instructions) {
        const instructionsData = Object.entries(templateResult.instructions).map(([key, value]) => ({
          'Field': key,
          'Instructions': Array.isArray(value) ? value.join(', ') : value
        }));
        const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
        XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
      }
      
      // Download file
      const filename = templateResult.filename || 'products-import-template.xlsx';
      XLSX.writeFile(workbook, filename);
      
      toast.success('Import template downloaded successfully');
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Failed to download template');
    } finally {
      setLoading(false);
    }
  }, []);

  // Import functionality
  const handleImport = useCallback(() => {
    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls';
    fileInput.multiple = false;
    
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        setLoading(true);
        
        // Read and parse Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get first worksheet
        const worksheetName = workbook.SheetNames[0];
        if (!worksheetName) {
          throw new Error('No worksheet found in Excel file');
        }
        
        const worksheet = workbook.Sheets[worksheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (jsonData.length === 0) {
          throw new Error('No data found in Excel file');
        }
        
        // Send to backend for processing
        const importResult = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/menu/products/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify({ data: jsonData })
        });
        
        if (!importResult.ok) {
          const errorData = await importResult.json();
          throw new Error(errorData.message || 'Failed to import products');
        }
        
        const result = await importResult.json();
        
        // Show results
        if (result.success > 0) {
          toast.success(`Successfully imported ${result.success} products`);
          refreshAllData(); // Refresh the product list
        }
        
        if (result.failed > 0) {
          toast.error(`Failed to import ${result.failed} products`);
          if (result.errors && result.errors.length > 0) {
            console.error('Import errors:', result.errors);
            // Show first few errors to user
            const errorPreview = result.errors.slice(0, 3).join('\n');
            toast.error(`Import errors:\n${errorPreview}${result.errors.length > 3 ? '\n... and more' : ''}`);
          }
        }
        
        if (result.success === 0 && result.failed === 0) {
          toast('No products were imported');
        }
        
      } catch (error) {
        console.error('Import error:', error);
        toast.error(error.message || 'Failed to import products');
      } finally {
        setLoading(false);
      }
    };
    
    // Trigger file selection
    fileInput.click();
  }, [refreshAllData]);

  const selectionStats = useMemo(() => ({
    totalSelected: selectedProducts.length,
    canEdit: user?.role !== 'cashier',
    canDelete: user?.role === 'super_admin' || user?.role === 'company_owner'
  }), [selectedProducts, user?.role]);

  // Get products data for platform assignment modal
  const productsForAssignment = useMemo(() => {
    // This would ideally come from the product grid state
    // For now, we'll pass an empty array and handle it in the modal
    return [];
  }, []);

  // Debug info for troubleshooting
  const debugInfo = {
    user: user ? { id: user.id, email: user.email, role: user.role, companyId: user.companyId } : null,
    isLoading,
    isAuthenticated,
    isHydrated,
    categoriesCount: categories.length,
    hasLocalToken: typeof window !== 'undefined' ? !!localStorage.getItem('auth-token') : false,
    hasLocalUser: typeof window !== 'undefined' ? !!localStorage.getItem('user') : false
  };

  // Show debug panel in development
  const showDebugPanel = process.env.NODE_ENV === 'development' && (!user || categories.length === 0);

  return (
    <ProtectedRoute>
      <Head>
        <title>Product Catalog - Restaurant Management</title>
        <meta name="description" content="Enterprise product catalog management system" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Debug Panel for Development */}
        {showDebugPanel && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-4">
            <div className="max-w-full mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Debug Information</h3>
                  <p className="text-xs text-yellow-600">Categories: {debugInfo.categoriesCount} | Auth: {debugInfo.isAuthenticated ? '✅' : '❌'} | User: {debugInfo.user?.email || 'None'}</p>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer text-yellow-700">Show Details</summary>
                  <pre className="mt-2 text-yellow-600 bg-yellow-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        )}

        {/* Simple B2B Header - Match Dashboard Style */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Navigation with Back Button */}
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-gray-600" />
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">Products</h1>
                    <p className="text-sm text-gray-500">Product catalog management</p>
                  </div>
                </div>
              </div>
              
              {/* Right Side Actions */}
              <div className="flex items-center space-x-3">
                {/* Menu Builder Button */}
                <Link
                  href="/menu/builder"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <CogIcon className="w-4 h-4 mr-2" />
                  Menu Builder
                </Link>

                {/* Add Product Button */}
                <button
                  onClick={() => setIsAddProductModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Product
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar Layout */}
        <div className="flex h-[calc(100vh-64px)]">
          {/* Category Sidebar */}
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
              
              {/* Action Bar */}
              <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {/* Bulk Selection */}
              <button
                onClick={toggleSelectionMode}
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border transition-all duration-200 ${
                  selectionMode
                    ? 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <ClipboardDocumentListIcon className="w-4 h-4 mr-1.5" />
                {selectionMode ? 'Exit Selection' : 'Bulk Select'}
              </button>

              {/* Import/Export */}
              <div className="flex border border-gray-200 rounded-md bg-white">
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors border-r border-gray-200"
                  title="Download Excel template for importing products"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-1.5" />
                  Template
                </button>
                <button
                  onClick={handleImport}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-200"
                  title="Upload Excel file to import products"
                >
                  <DocumentArrowUpIcon className="w-4 h-4 mr-1.5" />
                  Import
                </button>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Export all products to Excel"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-1.5" />
                  Export
                </button>
              </div>
            </div>

          </div>

          {/* Platform Management Toolbar */}
          {selectionMode && (
            <ProductSelectionToolbar
              selectedCount={selectionStats.totalSelected}
              totalProducts={0} // This would come from product grid state
              canEdit={selectionStats.canEdit}
              canDelete={selectionStats.canDelete}
              onBulkStatusChange={handleBulkStatusChange}
              onBulkDelete={handleBulkDelete}
              onPlatformAssignment={handlePlatformAssignment}
              onClearSelection={() => {
                setSelectedProducts([]);
                setSelectionMode(false);
              }}
              onSelectAll={handleSelectAll}
              loading={loading}
              platforms={platforms}
              className="mb-6"
            />
          )}

          {/* Compact Mobile Toolbar */}
          <CompactProductSelectionToolbar
            selectedCount={selectionStats.totalSelected}
            onPlatformAssignment={handlePlatformAssignment}
            onClearSelection={() => {
              setSelectedProducts([]);
              setSelectionMode(false);
            }}
            loading={loading}
          />

          {/* Professional Filters */}
          <div className="mb-6 space-y-4">
            <ProductFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              categories={categories}
              availableTags={availableTags}
            />

            {/* Platform Filter */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <PlatformFilter
                  platforms={platforms}
                  selectedPlatformIds={selectedPlatformIds}
                  onPlatformFilterChange={handlePlatformFilterChange}
                  onLoadPlatforms={loadPlatforms}
                  loading={platformsLoading}
                  placeholder="Filter by platforms"
                  showClearAll={true}
                />
              </div>

              {selectedPlatformIds.length > 0 && (
                <div className="text-sm text-gray-600">
                  Showing products from {selectedPlatformIds.length} platform{selectedPlatformIds.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

              {/* Enterprise Product Grid - Handles 100k+ Items */}
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
        
        {/* Add Product Modal */}
        <AddProductModal
          isOpen={isAddProductModalOpen}
          onClose={() => setIsAddProductModalOpen(false)}
          onProductAdded={handleCategoryUpdate}
          categories={categories}
        />
        
        {/* Edit Product Modal */}
        <EditProductModal
          isOpen={isEditProductModalOpen}
          onClose={() => {
            setIsEditProductModalOpen(false);
            setEditingProduct(null);
          }}
          onProductUpdated={handleCategoryUpdate}
          categories={categories}
          product={editingProduct}
        />
        
        {/* View Product Modal */}
        <ProductViewModal
          isOpen={isViewProductModalOpen}
          onClose={() => {
            setIsViewProductModalOpen(false);
            setViewingProduct(null);
          }}
          product={viewingProduct}
        />

        {/* Platform Assignment Modal */}
        <PlatformAssignmentModal
          isOpen={isPlatformAssignmentModalOpen}
          onClose={() => setIsPlatformAssignmentModalOpen(false)}
          selectedProducts={selectedProducts}
          products={productsForAssignment}
          onAssignmentComplete={handlePlatformAssignmentComplete}
        />
      </div>
    </ProtectedRoute>
  );
}