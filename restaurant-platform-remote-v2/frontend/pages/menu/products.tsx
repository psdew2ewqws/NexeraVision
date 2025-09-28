// Enterprise Menu Products Management - B2B Professional with Comprehensive Error Handling
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
  WifiIcon,
  SignalIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../src/contexts/AuthContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { VirtualizedProductGrid } from '../../src/features/menu/components/VirtualizedProductGrid';
import { ProductFilters } from '../../src/features/menu/components/ProductFilters';
import { CategorySidebar } from '../../src/features/menu/components/CategorySidebar';
import { AddProductModal } from '../../src/features/menu/components/AddProductModal';
import { EditProductModal } from '../../src/features/menu/components/EditProductModal';
import { ProductViewModal } from '../../src/features/menu/components/ProductViewModal';
import { ProductFilters as ProductFiltersType, MenuProduct, MenuCategory } from '../../src/types/menu';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import {
  FullPageSkeleton,
  ErrorState,
  EmptyState,
  CategorySidebarSkeleton,
  ActionBarSkeleton
} from '../../src/components/LoadingSkeletons';
import {
  apiCall,
  menuApi,
  validateArray,
  isMenuCategory
} from '../../src/utils/apiHelpers';
import { useNetworkStatus, useRetryLogic, useOfflineQueue } from '../../src/hooks/useNetworkStatus';
import toast from 'react-hot-toast';

// Error-resilient Products Page Component
function MenuProductsPageContent() {
  const { user, isLoading, isAuthenticated, isHydrated } = useAuth();
  const { language, t } = useLanguage();
  const networkStatus = useNetworkStatus();
  const { retryState, retry, reset: resetRetry, canRetry } = useRetryLogic(3);
  const { addToQueue, queueSize } = useOfflineQueue();

  // Enhanced state with error handling
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

  // Error handling state
  const [pageError, setPageError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [lastSuccessfulLoad, setLastSuccessfulLoad] = useState<Date | null>(null);

  // Create a key based on categories data to force re-render when categories change
  const categoriesKey = useMemo(() => {
    return categories.map(cat => `${cat.id}-${cat.isActive}-${cat.displayNumber}`).join('|');
  }, [categories]);

  // Enhanced filter data loading with comprehensive error handling
  useEffect(() => {
    if (user && isHydrated) {
      loadFilterData();
    }
  }, [user?.companyId, user?.role, isHydrated]);

  const loadFilterData = useCallback(async () => {
    // Validate user state first
    if (!user) {
      setPageError('Authentication required');
      setInitialLoading(false);
      return;
    }

    // Super admins can see all data, regular users need companyId
    if (!user.companyId && user.role !== 'super_admin') {
      console.log('User missing companyId and not super_admin:', { role: user.role, companyId: user.companyId });
      setPageError('Access denied: Company assignment required');
      setInitialLoading(false);
      return;
    }

    try {
      setLoading(true);
      setCategoriesError(null);
      setPageError(null);

      // Load categories with retry logic
      const categoriesResult = await retry(async () => {
        const { data, error, success } = await menuApi.getCategories();
        if (!success) {
          throw new Error(error || 'Failed to load categories');
        }
        return data;
      });

      // Load tags with retry logic
      const tagsResult = await retry(async () => {
        const { data, error, success } = await menuApi.getTags();
        if (!success) {
          throw new Error(error || 'Failed to load tags');
        }
        return data;
      });

      // Validate and set categories
      if (categoriesResult?.categories) {
        const validCategories = validateArray(categoriesResult.categories, isMenuCategory, []);
        setCategories(validCategories);
        console.log(`Loaded ${validCategories.length} categories successfully`);
      }

      // Validate and set tags
      if (tagsResult?.tags && Array.isArray(tagsResult.tags)) {
        setAvailableTags(tagsResult.tags.filter(tag => typeof tag === 'string'));
        console.log(`Loaded ${tagsResult.tags.length} tags successfully`);
      }

      setLastSuccessfulLoad(new Date());
      setInitialLoading(false);
      resetRetry();

    } catch (error: any) {
      console.error('Failed to load filter data:', error);
      setCategoriesError(error.message || 'Failed to load categories and tags');

      // If offline, queue the operation
      if (!networkStatus.isOnline) {
        addToQueue(() => loadFilterData(), 'Load categories and tags');
        toast.error('You are offline. Changes will be synced when connection is restored.');
      } else if (canRetry) {
        toast.error(`Loading failed. Retrying in ${retryState.nextRetryIn}s...`);
      } else {
        setPageError('Failed to load page data. Please refresh to try again.');
        toast.error('Failed to load categories. Please check your connection and try again.');
      }

      setInitialLoading(false);
    } finally {
      setLoading(false);
    }
  }, [user, retry, resetRetry, canRetry, retryState.nextRetryIn, networkStatus.isOnline, addToQueue]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: Partial<ProductFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Handle category selection
  const handleCategorySelect = useCallback((categoryId: string | undefined) => {
    setSelectedCategoryId(categoryId);
    setFilters(prev => ({ ...prev, categoryId }));
  }, []);

  // Enhanced refresh function with error handling
  const refreshAllData = useCallback(async () => {
    try {
      setLoading(true);
      // Reload categories first and wait for completion
      await loadFilterData();
      // Force product grid to refresh after categories are loaded
      setRefreshTrigger(prev => prev + 1);
      setLastSuccessfulLoad(new Date());
    } catch (error: any) {
      console.error('Failed to refresh data:', error);
      if (!networkStatus.isOnline) {
        toast.error('Cannot refresh data while offline');
      } else {
        toast.error('Failed to refresh data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [loadFilterData, networkStatus.isOnline]);

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

  // Toggle selection mode
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => !prev);
    setSelectedProducts([]);
  }, []);

  // Enhanced bulk operations with error handling
  const handleBulkStatusChange = useCallback(async (status: number) => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    if (!networkStatus.isOnline) {
      toast.error('Cannot update products while offline');
      return;
    }

    setLoading(true);
    try {
      const { success, error } = await apiCall(
        '/api/v1/menu/products/bulk-status',
        {
          method: 'POST',
          body: JSON.stringify({
            productIds: selectedProducts,
            status
          })
        },
        { showErrorToast: false }
      );

      if (success) {
        const statusText = status === 1 ? 'activated' : 'deactivated';
        toast.success(`${selectedProducts.length} products ${statusText} successfully`);
        setSelectedProducts([]);
        setSelectionMode(false);
        await refreshAllData();
      } else {
        throw new Error(error || 'Failed to update products');
      }
    } catch (error: any) {
      console.error('Bulk update error:', error);
      toast.error(`Failed to update products: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, refreshAllData, networkStatus.isOnline]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`)) {
      return;
    }

    if (!networkStatus.isOnline) {
      toast.error('Cannot delete products while offline');
      return;
    }

    setLoading(true);
    try {
      const { success, error } = await apiCall(
        '/api/v1/menu/products/bulk-delete',
        {
          method: 'POST',
          body: JSON.stringify({
            productIds: selectedProducts
          })
        },
        { showErrorToast: false }
      );

      if (success) {
        toast.success(`${selectedProducts.length} products deleted successfully`);
        setSelectedProducts([]);
        setSelectionMode(false);
        await refreshAllData();
      } else {
        throw new Error(error || 'Failed to delete products');
      }
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast.error(`Failed to delete products: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [selectedProducts, refreshAllData, networkStatus.isOnline]);

  // Enhanced product actions with error handling
  const handleProductView = useCallback(async (product: MenuProduct) => {
    if (!product?.id) {
      toast.error('Invalid product selected');
      return;
    }

    try {
      const { data, error, success } = await apiCall<MenuProduct>(
        `/api/v1/menu/products/${product.id}`,
        {},
        {
          validateResponse: (data) => data && typeof data === 'object' && data.id === product.id,
          showErrorToast: false
        }
      );

      if (success && data) {
        setViewingProduct(data);
        setIsViewProductModalOpen(true);
      } else {
        throw new Error(error || 'Failed to fetch product details');
      }
    } catch (error: any) {
      console.error('View product error:', error);
      if (!networkStatus.isOnline) {
        toast.error('Cannot view product details while offline');
      } else {
        toast.error('Failed to load product details. Please try again.');
      }
    }
  }, [networkStatus.isOnline]);

  const handleProductEdit = useCallback((product: MenuProduct) => {
    setEditingProduct(product);
    setIsEditProductModalOpen(true);
  }, []);

  const handleProductDelete = useCallback(async (productId: string, productName?: string) => {
    if (!productId) {
      toast.error('Invalid product ID');
      return;
    }

    const name = productName || 'this product';

    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    // Check network status
    if (!networkStatus.isOnline) {
      toast.error('Cannot delete products while offline');
      return;
    }

    try {
      setLoading(true);

      const { success, error } = await apiCall(
        `/api/v1/menu/products/${productId}`,
        { method: 'DELETE' },
        { showErrorToast: false }
      );

      if (success) {
        toast.success(`"${name}" deleted successfully`);
        await refreshAllData();
      } else {
        throw new Error(error || 'Failed to delete product');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete "${name}": ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [refreshAllData, networkStatus.isOnline]);

  // Export functionality with enhanced error handling
  const handleExport = useCallback(async () => {
    if (!networkStatus.isOnline) {
      toast.error('Cannot export while offline');
      return;
    }

    try {
      setLoading(true);
      const { data, error, success } = await apiCall<{ data: any[]; filename?: string; totalCount: number }>(
        '/api/v1/menu/products/export',
        {},
        { showErrorToast: false }
      );

      if (!success || !data) {
        throw new Error(error || 'Failed to export products');
      }

      // Convert data to Excel and download
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data.data || []);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      // Download file
      const filename = data.filename || 'products-export.xlsx';
      XLSX.writeFile(workbook, filename);

      toast.success(`Exported ${data.totalCount || 0} products successfully`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Failed to export products: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [networkStatus.isOnline]);

  // Download import template with enhanced error handling
  const handleDownloadTemplate = useCallback(async () => {
    if (!networkStatus.isOnline) {
      toast.error('Cannot download template while offline');
      return;
    }

    try {
      setLoading(true);
      const { data, error, success } = await apiCall<{
        data: any[];
        filename?: string;
        instructions?: Record<string, any>;
      }>(
        '/api/v1/menu/products/import-template',
        {},
        { showErrorToast: false }
      );

      if (!success || !data) {
        throw new Error(error || 'Failed to download template');
      }

      // Convert data to Excel and download
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data.data || []);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products Template');

      // Add instructions sheet
      if (data.instructions) {
        const instructionsData = Object.entries(data.instructions).map(([key, value]) => ({
          'Field': key,
          'Instructions': Array.isArray(value) ? value.join(', ') : value
        }));
        const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
        XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
      }

      // Download file
      const filename = data.filename || 'products-import-template.xlsx';
      XLSX.writeFile(workbook, filename);

      toast.success('Import template downloaded successfully');
    } catch (error: any) {
      console.error('Template download error:', error);
      toast.error(`Failed to download template: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [networkStatus.isOnline]);

  // Import functionality with enhanced error handling
  const handleImport = useCallback(() => {
    if (!networkStatus.isOnline) {
      toast.error('Cannot import while offline');
      return;
    }

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

        // Validate file type
        if (!file.name.match(/\.(xlsx?|xls)$/i)) {
          throw new Error('Please select a valid Excel file (.xlsx or .xls)');
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File too large. Please select a file smaller than 10MB.');
        }

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
        const { data, error, success } = await apiCall<{
          success: number;
          failed: number;
          errors?: string[];
        }>(
          '/api/v1/menu/products/import',
          {
            method: 'POST',
            body: JSON.stringify({ data: jsonData })
          },
          { showErrorToast: false }
        );

        if (!success) {
          throw new Error(error || 'Failed to import products');
        }

        const result = data || { success: 0, failed: 0, errors: [] };

        // Show results
        if (result.success > 0) {
          toast.success(`Successfully imported ${result.success} products`);
          await refreshAllData(); // Refresh the product list
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

      } catch (error: any) {
        console.error('Import error:', error);
        toast.error(error.message || 'Failed to import products');
      } finally {
        setLoading(false);
      }
    };

    // Trigger file selection
    fileInput.click();
  }, [refreshAllData, networkStatus.isOnline]);

  const selectionStats = useMemo(() => ({
    totalSelected: selectedProducts.length,
    canEdit: user?.role !== 'cashier',
    canDelete: user?.role === 'super_admin' || user?.role === 'company_owner'
  }), [selectedProducts, user?.role]);

  // Show loading skeleton during initial load
  if (initialLoading) {
    return (
      <ProtectedRoute>
        <Head>
          <title>Menu Products - Restaurant Management</title>
          <meta name="description" content="Manage your restaurant menu products with enterprise-grade tools" />
        </Head>
        <FullPageSkeleton />
      </ProtectedRoute>
    );
  }

  // Show error state if critical error occurred
  if (pageError) {
    return (
      <ProtectedRoute>
        <Head>
          <title>Menu Products - Error</title>
        </Head>
        <div className="min-h-screen bg-gray-50">
          <ErrorState
            title="Cannot Load Products Page"
            message={pageError}
            onRetry={canRetry ? () => {
              setPageError(null);
              setInitialLoading(true);
              loadFilterData();
            } : undefined}
            showRetry={canRetry}
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Head>
        <title>Menu Products - Restaurant Management</title>
        <meta name="description" content="Manage your restaurant menu products with enterprise-grade tools" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Network Status Indicator */}
        {!networkStatus.isOnline && (
          <div className="bg-orange-50 border-b border-orange-200 p-2">
            <div className="max-w-7xl mx-auto flex items-center justify-center text-sm text-orange-800">
              <WifiIcon className="w-4 h-4 mr-2" />
              <span>You are offline. Some features may be limited.</span>
              {queueSize > 0 && (
                <span className="ml-2 px-2 py-1 bg-orange-200 rounded-full text-xs">
                  {queueSize} pending
                </span>
              )}
            </div>
          </div>
        )}

        {/* Slow Connection Warning */}
        {networkStatus.isOnline && networkStatus.isSlowConnection && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-2">
            <div className="max-w-7xl mx-auto flex items-center justify-center text-sm text-yellow-800">
              <SignalIcon className="w-4 h-4 mr-2" />
              <span>Slow connection detected. Some operations may take longer.</span>
            </div>
          </div>
        )}

        {/* Retry Banner */}
        {retryState.isRetrying && (
          <div className="bg-blue-50 border-b border-blue-200 p-2">
            <div className="max-w-7xl mx-auto flex items-center justify-center text-sm text-blue-800">
              <ExclamationCircleIcon className="w-4 h-4 mr-2" />
              <span>
                Retrying operation... {retryState.nextRetryIn > 0 && `(${Math.ceil(retryState.nextRetryIn)}s)`}
              </span>
            </div>
          </div>
        )}

        {/* Categories Error Banner */}
        {categoriesError && (
          <div className="bg-red-50 border-b border-red-200 p-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-red-800">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                <span>{categoriesError}</span>
              </div>
              <button
                onClick={() => {
                  setCategoriesError(null);
                  loadFilterData();
                }}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Simple B2B Header - Match Dashboard Style */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    <h1 className="text-lg font-semibold text-gray-900">Menu Products</h1>
                    <p className="text-sm text-gray-500">Manage restaurant menu items</p>
                  </div>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-3">
                {/* Add Product Button */}
                <button
                  onClick={() => setIsAddProductModalOpen(true)}
                  disabled={!networkStatus.isOnline}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          {/* Category Sidebar with Error Boundary */}
          <ErrorBoundary
            fallback={
              <div className="w-80 bg-white border-l border-gray-200 p-4">
                <ErrorState
                  title="Sidebar Error"
                  message="Failed to load categories sidebar"
                  onRetry={() => window.location.reload()}
                />
              </div>
            }
          >
            {categoriesError ? (
              <CategorySidebarSkeleton />
            ) : (
              <CategorySidebar
                key={categoriesKey}
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onCategorySelect={handleCategorySelect}
                onCategoryUpdate={handleCategoryUpdate}
              />
            )}
          </ErrorBoundary>

          {/* Main Products Area with Error Boundary */}
          <div className="flex-1 flex flex-col">
            <div className="max-w-full px-4 sm:px-6 lg:px-8 py-8">

              {/* Action Bar */}
              <ErrorBoundary
                fallback={<ActionBarSkeleton />}
              >
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
                        disabled={loading || !networkStatus.isOnline}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors border-r border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download Excel template for importing products"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1.5" />
                        Template
                      </button>
                      <button
                        onClick={handleImport}
                        disabled={loading || !networkStatus.isOnline}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Upload Excel file to import products"
                      >
                        <DocumentArrowUpIcon className="w-4 h-4 mr-1.5" />
                        Import
                      </button>
                      <button
                        onClick={handleExport}
                        disabled={loading || !networkStatus.isOnline}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Export all products to Excel"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1.5" />
                        Export
                      </button>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>

              {/* Selection Mode Banner */}
              {selectionMode && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-800">
                        Selection Mode Active - {selectionStats.totalSelected} product{selectionStats.totalSelected !== 1 ? 's' : ''} selected
                      </span>
                    </div>

                    {selectionStats.totalSelected > 0 && (
                      <div className="flex items-center space-x-3">
                        {selectionStats.canEdit && (
                          <>
                            <button
                              onClick={() => handleBulkStatusChange(1)}
                              disabled={loading || !networkStatus.isOnline}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors disabled:opacity-50"
                            >
                              <CheckCircleIcon className="w-4 h-4 mr-1" />
                              Activate
                            </button>
                            <button
                              onClick={() => handleBulkStatusChange(0)}
                              disabled={loading || !networkStatus.isOnline}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors disabled:opacity-50"
                            >
                              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                              Deactivate
                            </button>
                          </>
                        )}

                        {selectionStats.canDelete && (
                          <button
                            onClick={handleBulkDelete}
                            disabled={loading || !networkStatus.isOnline}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors disabled:opacity-50"
                          >
                            Delete Selected
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Professional Filters with Error Boundary */}
              <ErrorBoundary
                fallback={
                  <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                    <p className="text-gray-600 text-center">Filter controls temporarily unavailable</p>
                  </div>
                }
              >
                <ProductFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  categories={categories}
                  availableTags={availableTags}
                  className="mb-6"
                />
              </ErrorBoundary>

              {/* Enterprise Product Grid with Error Boundary - Handles 100k+ Items */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1">
                <ErrorBoundary
                  fallback={
                    <div className="p-8">
                      <ErrorState
                        title="Product Grid Error"
                        message="Failed to load product grid. This may be due to a network issue or data problem."
                        onRetry={() => {
                          setRefreshTrigger(prev => prev + 1);
                        }}
                      />
                    </div>
                  }
                >
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
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </div>

        {/* Modals with Error Boundaries */}
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md">
                <h3 className="text-lg font-semibold mb-2">Modal Error</h3>
                <p className="text-gray-600 mb-4">Failed to load modal content.</p>
                <button
                  onClick={() => {
                    setIsAddProductModalOpen(false);
                    setIsEditProductModalOpen(false);
                    setIsViewProductModalOpen(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
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
        </ErrorBoundary>
      </div>
    </ProtectedRoute>
  );
}

// Main export with comprehensive error boundary
export default function MenuProductsPage() {
  return (
    <ErrorBoundary>
      <MenuProductsPageContent />
    </ErrorBoundary>
  );
}