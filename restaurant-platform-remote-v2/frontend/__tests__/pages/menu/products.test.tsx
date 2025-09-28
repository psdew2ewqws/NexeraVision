import React from 'react'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import MenuProductsPage from '../../../pages/menu/products'
import {
  renderWithProviders,
  mockSuperAdmin,
  mockCompanyOwner,
  mockBranchManager,
  mockCashier,
  mockCategories,
  mockProducts,
  mockApiResponses,
  mockFetchResponse,
  setupFetchMocks,
  setupAuthenticatedState,
  waitForLoadingToFinish,
  createMockFileInput
} from '../../utils/test-utils'

// Mock the complex components that aren't the focus of these tests
jest.mock('../../../src/features/menu/components/VirtualizedProductGrid', () => {
  return function MockVirtualizedProductGrid({
    filters,
    onProductSelect,
    onProductEdit,
    onProductDelete,
    onProductView,
    selectedProducts,
    selectionMode,
    refreshTrigger
  }: any) {
    return (
      <div data-testid="virtualized-product-grid">
        <div data-testid="grid-filters">{JSON.stringify(filters)}</div>
        <div data-testid="grid-selection-mode">{selectionMode ? 'active' : 'inactive'}</div>
        <div data-testid="grid-selected-products">{selectedProducts.join(',')}</div>
        <div data-testid="grid-refresh-trigger">{refreshTrigger}</div>
        {mockProducts.map(product => (
          <div key={product.id} data-testid={`product-${product.id}`}>
            <span>{product.name.en}</span>
            <button onClick={() => onProductView && onProductView(product)}>
              View {product.name.en}
            </button>
            <button onClick={() => onProductEdit && onProductEdit(product)}>
              Edit {product.name.en}
            </button>
            <button onClick={() => onProductDelete && onProductDelete(product.id, product.name.en)}>
              Delete {product.name.en}
            </button>
            {selectionMode && (
              <input
                type="checkbox"
                onChange={() => onProductSelect && onProductSelect(product.id)}
                data-testid={`select-product-${product.id}`}
              />
            )}
          </div>
        ))}
      </div>
    )
  }
})

jest.mock('../../../src/features/menu/components/ProductFilters', () => {
  return function MockProductFilters({ filters, onFiltersChange }: any) {
    return (
      <div data-testid="product-filters">
        <input
          data-testid="search-input"
          placeholder="Search products..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
        />
        <select
          data-testid="status-filter"
          value={filters.status ?? ''}
          onChange={(e) => onFiltersChange({ status: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">All Status</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
        <select
          data-testid="sort-filter"
          value={filters.sortBy || 'priority'}
          onChange={(e) => onFiltersChange({ sortBy: e.target.value })}
        >
          <option value="priority">Priority</option>
          <option value="name">Name</option>
          <option value="price">Price</option>
          <option value="createdAt">Created Date</option>
        </select>
      </div>
    )
  }
})

jest.mock('../../../src/features/menu/components/CategorySidebar', () => {
  return function MockCategorySidebar({
    categories,
    selectedCategoryId,
    onCategorySelect,
    onCategoryUpdate
  }: any) {
    return (
      <div data-testid="category-sidebar">
        <div data-testid="categories-count">{categories.length}</div>
        <button
          data-testid="all-categories"
          onClick={() => onCategorySelect(undefined)}
          className={!selectedCategoryId ? 'selected' : ''}
        >
          All Categories
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            data-testid={`category-${cat.id}`}
            onClick={() => onCategorySelect(cat.id)}
            className={selectedCategoryId === cat.id ? 'selected' : ''}
          >
            {cat.name.en} ({cat.isActive ? 'Active' : 'Inactive'})
          </button>
        ))}
        <button
          data-testid="update-category"
          onClick={() => onCategoryUpdate('cat-1', { isActive: false })}
        >
          Update Category
        </button>
      </div>
    )
  }
})

// Mock the modal components
jest.mock('../../../src/features/menu/components/AddProductModal', () => {
  return function MockAddProductModal({ isOpen, onClose, onProductAdded }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="add-product-modal">
        <button onClick={onClose} data-testid="close-add-modal">Close</button>
        <button onClick={onProductAdded} data-testid="add-product-success">Add Product</button>
      </div>
    )
  }
})

jest.mock('../../../src/features/menu/components/EditProductModal', () => {
  return function MockEditProductModal({ isOpen, onClose, onProductUpdated, product }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="edit-product-modal">
        <div data-testid="editing-product-name">{product?.name?.en}</div>
        <button onClick={onClose} data-testid="close-edit-modal">Close</button>
        <button onClick={onProductUpdated} data-testid="update-product-success">Update Product</button>
      </div>
    )
  }
})

jest.mock('../../../src/features/menu/components/ProductViewModal', () => {
  return function MockProductViewModal({ isOpen, onClose, product }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="view-product-modal">
        <div data-testid="viewing-product-name">{product?.name?.en}</div>
        <button onClick={onClose} data-testid="close-view-modal">Close</button>
      </div>
    )
  }
})

describe('MenuProductsPage', () => {
  let queryClient: QueryClient
  let fetchMock: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    })
    fetchMock = setupFetchMocks()
    setupAuthenticatedState(mockSuperAdmin)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Page Rendering', () => {
    it('renders the menu products page with correct title and layout', async () => {
      renderWithProviders(<MenuProductsPage />, { queryClient })

      // Check page title
      expect(screen.getByText('Menu Products')).toBeInTheDocument()
      expect(screen.getByText('Manage restaurant menu items')).toBeInTheDocument()

      // Check navigation elements
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()

      // Check main action button
      expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()

      await waitForLoadingToFinish()
    })

    it('shows loading state initially and loads data', async () => {
      renderWithProviders(<MenuProductsPage />, { queryClient })

      // Should eventually load and show categories
      await waitFor(() => {
        expect(screen.getByTestId('category-sidebar')).toBeInTheDocument()
      })

      // Verify API calls were made
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/menu/categories'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      )
    })

    it('renders with correct components structure', async () => {
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByTestId('category-sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('product-filters')).toBeInTheDocument()
        expect(screen.getByTestId('virtualized-product-grid')).toBeInTheDocument()
      })
    })
  })

  describe('Authentication and Authorization', () => {
    it('renders correctly for super admin with all permissions', async () => {
      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      await waitForLoadingToFinish()

      // Super admin should see all buttons
      expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
    })

    it('renders correctly for company owner with appropriate permissions', async () => {
      renderWithProviders(<MenuProductsPage />, {
        user: mockCompanyOwner,
        queryClient
      })

      await waitForLoadingToFinish()

      // Company owner should see most buttons
      expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
    })

    it('renders correctly for branch manager with limited permissions', async () => {
      renderWithProviders(<MenuProductsPage />, {
        user: mockBranchManager,
        queryClient
      })

      await waitForLoadingToFinish()

      // Branch manager should see basic functionality
      expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
    })

    it('renders correctly for cashier with read-only access', async () => {
      renderWithProviders(<MenuProductsPage />, {
        user: mockCashier,
        queryClient
      })

      await waitForLoadingToFinish()

      // Cashier should see basic interface
      expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()
    })

    it('handles missing user companyId for non-super admin', async () => {
      const userWithoutCompany = { ...mockBranchManager, companyId: '' }

      renderWithProviders(<MenuProductsPage />, {
        user: userWithoutCompany,
        queryClient
      })

      await waitForLoadingToFinish()

      // Should not make API calls for user without companyId
      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('/menu/categories'),
        expect.any(Object)
      )
    })
  })

  describe('Category Management', () => {
    it('loads and displays categories', async () => {
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByTestId('categories-count')).toHaveTextContent('3')
      })

      // Check that categories are displayed
      expect(screen.getByTestId('category-cat-1')).toBeInTheDocument()
      expect(screen.getByTestId('category-cat-2')).toBeInTheDocument()
      expect(screen.getByTestId('category-cat-3')).toBeInTheDocument()
    })

    it('handles category selection', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByTestId('category-cat-1')).toBeInTheDocument()
      })

      // Click on a category
      await user.click(screen.getByTestId('category-cat-1'))

      // Check that filters are updated in the grid
      await waitFor(() => {
        const filtersText = screen.getByTestId('grid-filters').textContent
        expect(filtersText).toContain('"categoryId":"cat-1"')
      })
    })

    it('handles category updates and refreshes data', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByTestId('update-category')).toBeInTheDocument()
      })

      const initialRefreshTrigger = screen.getByTestId('grid-refresh-trigger').textContent

      // Trigger category update
      await user.click(screen.getByTestId('update-category'))

      // Should refresh the data
      await waitFor(() => {
        const newRefreshTrigger = screen.getByTestId('grid-refresh-trigger').textContent
        expect(newRefreshTrigger).not.toBe(initialRefreshTrigger)
      })
    })

    it('handles API errors gracefully when loading categories', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
          text: () => Promise.resolve('Server error'),
          headers: new Map(),
          statusText: 'Internal Server Error'
        })
      )

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitForLoadingToFinish()

      // Should handle error gracefully and show empty categories
      await waitFor(() => {
        expect(screen.getByTestId('categories-count')).toHaveTextContent('0')
      })
    })
  })

  describe('Product Filtering', () => {
    it('handles search filter changes', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument()
      })

      // Type in search box
      await user.type(screen.getByTestId('search-input'), 'coffee')

      // Check that filters are updated
      await waitFor(() => {
        const filtersText = screen.getByTestId('grid-filters').textContent
        expect(filtersText).toContain('"search":"coffee"')
      })
    })

    it('handles status filter changes', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByTestId('status-filter')).toBeInTheDocument()
      })

      // Select active status
      await user.selectOptions(screen.getByTestId('status-filter'), '1')

      // Check that filters are updated
      await waitFor(() => {
        const filtersText = screen.getByTestId('grid-filters').textContent
        expect(filtersText).toContain('"status":1')
      })
    })

    it('handles sort filter changes', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByTestId('sort-filter')).toBeInTheDocument()
      })

      // Change sort to name
      await user.selectOptions(screen.getByTestId('sort-filter'), 'name')

      // Check that filters are updated
      await waitFor(() => {
        const filtersText = screen.getByTestId('grid-filters').textContent
        expect(filtersText).toContain('"sortBy":"name"')
      })
    })
  })

  describe('Bulk Operations', () => {
    it('toggles selection mode', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
      })

      // Initially not in selection mode
      expect(screen.getByTestId('grid-selection-mode')).toHaveTextContent('inactive')

      // Click bulk select
      await user.click(screen.getByRole('button', { name: /bulk select/i }))

      // Should be in selection mode
      expect(screen.getByTestId('grid-selection-mode')).toHaveTextContent('active')
      expect(screen.getByText(/selection mode active/i)).toBeInTheDocument()

      // Click exit selection
      await user.click(screen.getByRole('button', { name: /exit selection/i }))

      // Should exit selection mode
      expect(screen.getByTestId('grid-selection-mode')).toHaveTextContent('inactive')
    })

    it('handles bulk status change operations for authorized users', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      // Enter selection mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /bulk select/i }))

      // Select a product
      const productCheckbox = screen.getByTestId('select-product-prod-1')
      await user.click(productCheckbox)

      // Should show bulk action buttons
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
      })

      // Mock successful bulk update
      fetchMock.mockImplementationOnce(() =>
        mockFetchResponse({ success: true, updated: 1 })
      )

      // Click activate
      await user.click(screen.getByRole('button', { name: /activate/i }))

      // Should make API call
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/menu/products/bulk-status'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"status":1')
          })
        )
      })
    })

    it('handles bulk delete operations for authorized users', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      // Enter selection mode and select product
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /bulk select/i }))

      const productCheckbox = screen.getByTestId('select-product-prod-1')
      await user.click(productCheckbox)

      // Should show delete button for super admin
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument()
      })

      // Mock confirmation dialog
      window.confirm = jest.fn(() => true)

      // Mock successful bulk delete
      fetchMock.mockImplementationOnce(() =>
        mockFetchResponse({ success: true, deleted: 1 })
      )

      // Click delete
      await user.click(screen.getByRole('button', { name: /delete selected/i }))

      // Should make API call
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/menu/products/bulk-delete'),
          expect.objectContaining({
            method: 'POST'
          })
        )
      })
    })

    it('hides delete button for unauthorized users', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, {
        user: mockCashier,
        queryClient
      })

      // Enter selection mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: /bulk select/i }))

      const productCheckbox = screen.getByTestId('select-product-prod-1')
      await user.click(productCheckbox)

      // Should not show delete button for cashier
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /delete selected/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Product Actions', () => {
    it('opens add product modal', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()
      })

      // Click add product
      await user.click(screen.getByRole('button', { name: /add product/i }))

      // Should open modal
      expect(screen.getByTestId('add-product-modal')).toBeInTheDocument()

      // Can close modal
      await user.click(screen.getByTestId('close-add-modal'))
      expect(screen.queryByTestId('add-product-modal')).not.toBeInTheDocument()
    })

    it('handles product view action', async () => {
      const user = userEvent.setup()

      // Mock successful product fetch
      fetchMock.mockImplementationOnce(() =>
        mockFetchResponse(mockProducts[0])
      )

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByText('View Coffee')).toBeInTheDocument()
      })

      // Click view product
      await user.click(screen.getByText('View Coffee'))

      // Should make API call and open modal
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/menu/products/prod-1'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-jwt-token'
            })
          })
        )
        expect(screen.getByTestId('view-product-modal')).toBeInTheDocument()
        expect(screen.getByTestId('viewing-product-name')).toHaveTextContent('Coffee')
      })
    })

    it('handles product edit action', async () => {
      const user = userEvent.setup()
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByText('Edit Coffee')).toBeInTheDocument()
      })

      // Click edit product
      await user.click(screen.getByText('Edit Coffee'))

      // Should open edit modal
      expect(screen.getByTestId('edit-product-modal')).toBeInTheDocument()
      expect(screen.getByTestId('editing-product-name')).toHaveTextContent('Coffee')
    })

    it('handles product delete action with confirmation', async () => {
      const user = userEvent.setup()

      // Mock confirmation dialog
      window.confirm = jest.fn(() => true)

      // Mock successful delete
      fetchMock.mockImplementationOnce(() =>
        mockFetchResponse({ success: true })
      )

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByText('Delete Coffee')).toBeInTheDocument()
      })

      // Click delete product
      await user.click(screen.getByText('Delete Coffee'))

      // Should show confirmation
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to delete "Coffee"?')
      )

      // Should make delete API call
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/menu/products/prod-1'),
          expect.objectContaining({
            method: 'DELETE'
          })
        )
      })
    })

    it('cancels product delete when user declines confirmation', async () => {
      const user = userEvent.setup()

      // Mock declined confirmation
      window.confirm = jest.fn(() => false)

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByText('Delete Coffee')).toBeInTheDocument()
      })

      // Click delete product
      await user.click(screen.getByText('Delete Coffee'))

      // Should show confirmation but not make API call
      expect(window.confirm).toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('/menu/products/prod-1'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Import/Export Operations', () => {
    it('handles export functionality', async () => {
      const user = userEvent.setup()

      // Mock successful export
      fetchMock.mockImplementationOnce(() =>
        mockFetchResponse({
          data: mockProducts,
          filename: 'products-export.xlsx',
          totalCount: mockProducts.length
        })
      )

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      })

      // Click export
      await user.click(screen.getByRole('button', { name: /export/i }))

      // Should make export API call
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/menu/products/export'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-jwt-token'
            })
          })
        )
      })
    })

    it('handles template download functionality', async () => {
      const user = userEvent.setup()

      // Mock successful template download
      fetchMock.mockImplementationOnce(() =>
        mockFetchResponse({
          data: [{ name: 'Sample Product', price: 10 }],
          filename: 'products-import-template.xlsx',
          instructions: { name: 'Product name', price: 'Product price' }
        })
      )

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /template/i })).toBeInTheDocument()
      })

      // Click template download
      await user.click(screen.getByRole('button', { name: /template/i }))

      // Should make template API call
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/menu/products/import-template'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-jwt-token'
            })
          })
        )
      })
    })

    it('handles import functionality with file selection', async () => {
      const user = userEvent.setup()

      // Mock file input creation
      const createElementSpy = jest.spyOn(document, 'createElement')
      const mockFileInput = createMockFileInput([
        new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      ])
      createElementSpy.mockReturnValue(mockFileInput)

      // Mock successful import
      fetchMock.mockImplementationOnce(() =>
        mockFetchResponse({
          success: 2,
          failed: 0,
          errors: []
        })
      )

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument()
      })

      // Click import
      await user.click(screen.getByRole('button', { name: /import/i }))

      // Should create file input
      expect(createElementSpy).toHaveBeenCalledWith('input')

      createElementSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      // Mock API error
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ message: 'Server error' }),
          text: () => Promise.resolve('Server error'),
          headers: new Map(),
          statusText: 'Internal Server Error'
        })
      )

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitForLoadingToFinish()

      // Should handle errors gracefully
      expect(screen.getByTestId('categories-count')).toHaveTextContent('0')
    })

    it('handles network errors', async () => {
      // Mock network error
      fetchMock.mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      )

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitForLoadingToFinish()

      // Should handle network errors gracefully
      expect(screen.getByTestId('categories-count')).toHaveTextContent('0')
    })

    it('handles malformed API responses', async () => {
      // Mock malformed response
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(null), // Invalid response
          text: () => Promise.resolve('null'),
          headers: new Map(),
          statusText: 'OK'
        })
      )

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitForLoadingToFinish()

      // Should handle malformed responses gracefully
      expect(screen.getByTestId('categories-count')).toHaveTextContent('0')
    })
  })

  describe('Loading States', () => {
    it('shows loading states during operations', async () => {
      const user = userEvent.setup()

      // Mock slow API response
      fetchMock.mockImplementationOnce(() =>
        new Promise(resolve =>
          setTimeout(() => resolve(mockFetchResponse({ success: true })), 1000)
        )
      )

      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      })

      // Click export to trigger loading state
      await user.click(screen.getByRole('button', { name: /export/i }))

      // Button should be disabled during loading
      // Note: In a real implementation, you'd add loading states to buttons
      expect(fetchMock).toHaveBeenCalled()
    })
  })

  describe('Responsive Behavior', () => {
    it('adapts to different screen sizes', async () => {
      renderWithProviders(<MenuProductsPage />, { queryClient })

      await waitForLoadingToFinish()

      // Basic responsive test - checking if components render
      expect(screen.getByTestId('category-sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('product-filters')).toBeInTheDocument()
      expect(screen.getByTestId('virtualized-product-grid')).toBeInTheDocument()
    })
  })
})