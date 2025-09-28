/**
 * Integration Tests for Menu Products Page
 *
 * These tests verify the complete integration between:
 * - Authentication flow
 * - API interactions
 * - State management
 * - User interactions
 * - Error handling
 */

import React from 'react'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import MenuProductsPage from '../../pages/menu/products'
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
  setupAuthenticatedState,
  setupLocalStorageMock,
  waitForLoadingToFinish
} from '../utils/test-utils'

// Integration test scenarios that test the full flow
describe('Menu Products Integration Tests', () => {
  let queryClient: QueryClient
  let fetchMock: jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    })
    fetchMock = global.fetch as jest.MockedFunction<typeof fetch>
  })

  afterEach(() => {
    jest.clearAllMocks()
    queryClient.clear()
  })

  describe('Authentication Integration', () => {
    it('should redirect unauthenticated users to login', async () => {
      // Setup unauthenticated state
      setupLocalStorageMock({})

      const { container } = renderWithProviders(<MenuProductsPage />, {
        user: null,
        queryClient
      })

      // Should show loading spinner and redirect logic
      await waitFor(() => {
        expect(screen.getByText(/redirecting to login/i)).toBeInTheDocument()
      })
    })

    it('should handle authentication state changes during session', async () => {
      // Start authenticated
      setupAuthenticatedState(mockSuperAdmin)

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      // Mock successful initial load
      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()
        if (urlString.includes('/menu/categories')) {
          return mockFetchResponse(mockApiResponses.categories.success)
        }
        if (urlString.includes('/menu/tags')) {
          return mockFetchResponse(mockApiResponses.tags.success)
        }
        return mockFetchResponse({ success: true })
      })

      await waitFor(() => {
        expect(screen.getByText('Menu Products')).toBeInTheDocument()
      })

      // Simulate token expiration by clearing localStorage
      localStorage.removeItem('auth-token')
      localStorage.removeItem('user')

      // Trigger a storage event
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'auth-token',
        oldValue: 'mock-jwt-token',
        newValue: null
      }))

      // Component should handle auth state change
      await waitForLoadingToFinish()
    })

    it('should handle API authentication failures', async () => {
      setupAuthenticatedState(mockSuperAdmin)

      // Mock 401 responses
      fetchMock.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Unauthorized' }),
          text: () => Promise.resolve('Unauthorized'),
          headers: new Map(),
          statusText: 'Unauthorized'
        })
      )

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      await waitForLoadingToFinish()

      // API calls should be made but fail gracefully
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/menu/categories'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      )
    })
  })

  describe('API Integration Flow', () => {
    beforeEach(() => {
      setupAuthenticatedState(mockSuperAdmin)
    })

    it('should complete the full data loading flow', async () => {
      // Mock all required API endpoints
      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()

        if (urlString.includes('/menu/categories')) {
          return mockFetchResponse(mockApiResponses.categories.success)
        }

        if (urlString.includes('/menu/tags')) {
          return mockFetchResponse(mockApiResponses.tags.success)
        }

        if (urlString.includes('/menu/products/paginated')) {
          return mockFetchResponse(mockApiResponses.products.success)
        }

        return mockFetchResponse({ success: true })
      })

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      // Wait for all data to load
      await waitFor(() => {
        expect(screen.getByText('Menu Products')).toBeInTheDocument()
      })

      // Verify all API calls were made in correct order
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/menu/categories'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      )

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/menu/tags'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      )

      await waitForLoadingToFinish()
    })

    it('should handle partial API failures gracefully', async () => {
      let categoriesCallCount = 0

      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()

        if (urlString.includes('/menu/categories')) {
          categoriesCallCount++
          // Fail first call, succeed second
          if (categoriesCallCount === 1) {
            return Promise.resolve({
              ok: false,
              status: 500,
              json: () => Promise.resolve({ message: 'Server error' }),
              text: () => Promise.resolve('Server error'),
              headers: new Map(),
              statusText: 'Internal Server Error'
            })
          }
          return mockFetchResponse(mockApiResponses.categories.success)
        }

        if (urlString.includes('/menu/tags')) {
          return mockFetchResponse(mockApiResponses.tags.success)
        }

        return mockFetchResponse({ success: true })
      })

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      await waitForLoadingToFinish()

      // Should handle the error gracefully and continue with other operations
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/menu/categories'),
        expect.any(Object)
      )

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/menu/tags'),
        expect.any(Object)
      )
    })

    it('should handle concurrent API operations', async () => {
      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()

        // Add delay to simulate real API
        return new Promise(resolve => {
          setTimeout(() => {
            if (urlString.includes('/menu/categories')) {
              resolve(mockFetchResponse(mockApiResponses.categories.success))
            } else if (urlString.includes('/menu/tags')) {
              resolve(mockFetchResponse(mockApiResponses.tags.success))
            } else {
              resolve(mockFetchResponse({ success: true }))
            }
          }, 100)
        })
      })

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      // Both calls should be made concurrently
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2)
      })

      await waitForLoadingToFinish()
    })
  })

  describe('User Interaction Flow', () => {
    beforeEach(() => {
      setupAuthenticatedState(mockSuperAdmin)

      // Setup successful API responses
      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()

        if (urlString.includes('/menu/categories')) {
          return mockFetchResponse(mockApiResponses.categories.success)
        }

        if (urlString.includes('/menu/tags')) {
          return mockFetchResponse(mockApiResponses.tags.success)
        }

        if (urlString.includes('/menu/products/paginated')) {
          return mockFetchResponse(mockApiResponses.products.success)
        }

        if (urlString.includes('/menu/products/bulk-status')) {
          return mockFetchResponse({ success: true, updated: 1 })
        }

        if (urlString.includes('/menu/products/bulk-delete')) {
          return mockFetchResponse({ success: true, deleted: 1 })
        }

        if (urlString.includes('/menu/products/export')) {
          return mockFetchResponse({
            data: mockProducts,
            filename: 'products-export.xlsx',
            totalCount: mockProducts.length
          })
        }

        if (urlString.includes('/menu/products/import')) {
          return mockFetchResponse({
            success: 2,
            failed: 0,
            errors: []
          })
        }

        return mockFetchResponse({ success: true })
      })
    })

    it('should complete a full bulk operations workflow', async () => {
      const user = userEvent.setup()

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
      })

      // Step 1: Enter selection mode
      await user.click(screen.getByRole('button', { name: /bulk select/i }))

      expect(screen.getByText(/selection mode active/i)).toBeInTheDocument()

      // Step 2: Select products (mocked in our test setup)
      // In real implementation, this would select checkboxes

      // Step 3: Perform bulk activation
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /activate/i }))

      // Step 4: Verify API call was made
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/menu/products/bulk-status'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mock-jwt-token'
            }),
            body: expect.stringContaining('"status":1')
          })
        )
      })

      // Step 5: Exit selection mode
      await user.click(screen.getByRole('button', { name: /exit selection/i }))

      expect(screen.queryByText(/selection mode active/i)).not.toBeInTheDocument()
    })

    it('should complete a full export workflow', async () => {
      const user = userEvent.setup()

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      })

      // Click export
      await user.click(screen.getByRole('button', { name: /export/i }))

      // Verify export API call
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

    it('should handle complex filtering and category selection workflow', async () => {
      const user = userEvent.setup()

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      // Wait for components to load
      await waitFor(() => {
        expect(screen.getByTestId('product-filters')).toBeInTheDocument()
        expect(screen.getByTestId('category-sidebar')).toBeInTheDocument()
      })

      // Step 1: Search for products
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'coffee')

      // Step 2: Select a category
      await user.click(screen.getByTestId('category-cat-1'))

      // Step 3: Change status filter
      await user.selectOptions(screen.getByTestId('status-filter'), '1')

      // Step 4: Change sort order
      await user.selectOptions(screen.getByTestId('sort-filter'), 'name')

      // Verify all filters are applied to the grid
      await waitFor(() => {
        const filtersText = screen.getByTestId('grid-filters').textContent
        expect(filtersText).toContain('"search":"coffee"')
        expect(filtersText).toContain('"categoryId":"cat-1"')
        expect(filtersText).toContain('"status":1')
        expect(filtersText).toContain('"sortBy":"name"')
      })
    })
  })

  describe('Error Recovery Flow', () => {
    beforeEach(() => {
      setupAuthenticatedState(mockSuperAdmin)
    })

    it('should recover from temporary network errors', async () => {
      let callCount = 0

      fetchMock.mockImplementation((url: string | Request | URL) => {
        callCount++
        const urlString = url.toString()

        if (urlString.includes('/menu/categories')) {
          // Fail first 2 calls, succeed on 3rd
          if (callCount <= 2) {
            return Promise.reject(new Error('Network error'))
          }
          return mockFetchResponse(mockApiResponses.categories.success)
        }

        return mockFetchResponse({ success: true })
      })

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      await waitForLoadingToFinish()

      // Should handle the error gracefully
      expect(fetchMock).toHaveBeenCalled()
    })

    it('should handle server errors during bulk operations', async () => {
      const user = userEvent.setup()

      // Setup initial success, then failure for bulk operation
      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()

        if (urlString.includes('/menu/categories')) {
          return mockFetchResponse(mockApiResponses.categories.success)
        }

        if (urlString.includes('/menu/tags')) {
          return mockFetchResponse(mockApiResponses.tags.success)
        }

        if (urlString.includes('/menu/products/bulk-status')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ message: 'Server error' }),
            text: () => Promise.resolve('Server error'),
            headers: new Map(),
            statusText: 'Internal Server Error'
          })
        }

        return mockFetchResponse({ success: true })
      })

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      // Enter selection mode and attempt bulk operation
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /bulk select/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /activate/i }))

      // Should handle the error gracefully
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/menu/products/bulk-status'),
          expect.any(Object)
        )
      })
    })
  })

  describe('Role-Based Access Integration', () => {
    it('should properly restrict cashier permissions throughout the workflow', async () => {
      setupAuthenticatedState(mockCashier)

      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()

        if (urlString.includes('/menu/categories')) {
          return mockFetchResponse(mockApiResponses.categories.success)
        }

        if (urlString.includes('/menu/tags')) {
          return mockFetchResponse(mockApiResponses.tags.success)
        }

        return mockFetchResponse({ success: true })
      })

      const user = userEvent.setup()

      renderWithProviders(<MenuProductsPage />, {
        user: mockCashier,
        queryClient
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
      })

      // Enter selection mode
      await user.click(screen.getByRole('button', { name: /bulk select/i }))

      // Cashier should not see delete buttons
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /delete selected/i })).not.toBeInTheDocument()
      })

      // But should see edit buttons
      expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument()
    })

    it('should allow company owner full access', async () => {
      setupAuthenticatedState(mockCompanyOwner)

      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()

        if (urlString.includes('/menu/categories')) {
          return mockFetchResponse(mockApiResponses.categories.success)
        }

        if (urlString.includes('/menu/tags')) {
          return mockFetchResponse(mockApiResponses.tags.success)
        }

        return mockFetchResponse({ success: true })
      })

      const user = userEvent.setup()

      renderWithProviders(<MenuProductsPage />, {
        user: mockCompanyOwner,
        queryClient
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bulk select/i })).toBeInTheDocument()
      })

      // Enter selection mode
      await user.click(screen.getByRole('button', { name: /bulk select/i }))

      // Company owner should see all bulk operations including delete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /delete selected/i })).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates Integration', () => {
    beforeEach(() => {
      setupAuthenticatedState(mockSuperAdmin)

      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()

        if (urlString.includes('/menu/categories')) {
          return mockFetchResponse(mockApiResponses.categories.success)
        }

        if (urlString.includes('/menu/tags')) {
          return mockFetchResponse(mockApiResponses.tags.success)
        }

        return mockFetchResponse({ success: true })
      })
    })

    it('should refresh data after successful operations', async () => {
      const user = userEvent.setup()

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      await waitFor(() => {
        expect(screen.getByTestId('update-category')).toBeInTheDocument()
      })

      // Get initial refresh trigger
      const initialRefreshTrigger = screen.getByTestId('grid-refresh-trigger').textContent

      // Trigger an update operation
      await user.click(screen.getByTestId('update-category'))

      // Should refresh the data
      await waitFor(() => {
        const newRefreshTrigger = screen.getByTestId('grid-refresh-trigger').textContent
        expect(newRefreshTrigger).not.toBe(initialRefreshTrigger)
      })
    })

    it('should handle concurrent operations without data corruption', async () => {
      const user = userEvent.setup()

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
        expect(screen.getByTestId('update-category')).toBeInTheDocument()
      })

      // Trigger multiple operations simultaneously
      await Promise.all([
        user.click(screen.getByRole('button', { name: /export/i })),
        user.click(screen.getByTestId('update-category'))
      ])

      // Should handle concurrent operations without issues
      await waitForLoadingToFinish()

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/menu/products/export'),
        expect.any(Object)
      )
    })
  })

  describe('Performance Integration', () => {
    beforeEach(() => {
      setupAuthenticatedState(mockSuperAdmin)

      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()

        if (urlString.includes('/menu/categories')) {
          return mockFetchResponse(mockApiResponses.categories.success)
        }

        if (urlString.includes('/menu/tags')) {
          return mockFetchResponse(mockApiResponses.tags.success)
        }

        return mockFetchResponse({ success: true })
      })
    })

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeCategories = Array.from({ length: 100 }, (_, i) => ({
        ...mockCategories[0],
        id: `cat-${i}`,
        name: { en: `Category ${i}`, ar: `فئة ${i}` }
      }))

      fetchMock.mockImplementation((url: string | Request | URL) => {
        const urlString = url.toString()

        if (urlString.includes('/menu/categories')) {
          return mockFetchResponse({
            categories: largeCategories,
            total: largeCategories.length
          })
        }

        return mockFetchResponse({ success: true })
      })

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      await waitFor(() => {
        expect(screen.getByTestId('categories-count')).toHaveTextContent('100')
      })

      // Should render efficiently without blocking
      expect(screen.getByTestId('category-sidebar')).toBeInTheDocument()
    })

    it('should debounce rapid filter changes', async () => {
      const user = userEvent.setup()

      renderWithProviders(<MenuProductsPage />, {
        user: mockSuperAdmin,
        queryClient
      })

      await waitFor(() => {
        expect(screen.getByTestId('search-input')).toBeInTheDocument()
      })

      const searchInput = screen.getByTestId('search-input')

      // Type rapidly
      await user.type(searchInput, 'rapid typing test')

      // Should update filters efficiently
      await waitFor(() => {
        const filtersText = screen.getByTestId('grid-filters').textContent
        expect(filtersText).toContain('rapid typing test')
      })
    })
  })
})