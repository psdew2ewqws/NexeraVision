import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../src/contexts/AuthContext'
import { LanguageProvider } from '../../src/contexts/LanguageContext'

// Mock user types for testing
export interface MockUser {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'company_owner' | 'branch_manager' | 'call_center' | 'cashier'
  companyId: string
  branchId?: string
  company?: any
  branch?: any
}

// Default mock user for tests
export const mockSuperAdmin: MockUser = {
  id: 'test-user-1',
  email: 'admin@test.com',
  name: 'Test Admin',
  role: 'super_admin',
  companyId: 'test-company-1',
  company: { id: 'test-company-1', name: 'Test Company' }
}

export const mockCompanyOwner: MockUser = {
  id: 'test-user-2',
  email: 'owner@test.com',
  name: 'Test Owner',
  role: 'company_owner',
  companyId: 'test-company-2',
  company: { id: 'test-company-2', name: 'Test Company 2' }
}

export const mockBranchManager: MockUser = {
  id: 'test-user-3',
  email: 'manager@test.com',
  name: 'Test Manager',
  role: 'branch_manager',
  companyId: 'test-company-2',
  branchId: 'test-branch-1',
  company: { id: 'test-company-2', name: 'Test Company 2' },
  branch: { id: 'test-branch-1', name: 'Test Branch' }
}

export const mockCashier: MockUser = {
  id: 'test-user-4',
  email: 'cashier@test.com',
  name: 'Test Cashier',
  role: 'cashier',
  companyId: 'test-company-2',
  branchId: 'test-branch-1',
  company: { id: 'test-company-2', name: 'Test Company 2' },
  branch: { id: 'test-branch-1', name: 'Test Branch' }
}

// Mock categories for testing
export const mockCategories = [
  {
    id: 'cat-1',
    companyId: 'test-company-1',
    name: { en: 'Beverages', ar: 'المشروبات' },
    description: { en: 'All drinks', ar: 'جميع المشروبات' },
    displayNumber: 1,
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'cat-2',
    companyId: 'test-company-1',
    name: { en: 'Main Dishes', ar: 'الأطباق الرئيسية' },
    description: { en: 'Main course items', ar: 'عناصر الطبق الرئيسي' },
    displayNumber: 2,
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'cat-3',
    companyId: 'test-company-1',
    name: { en: 'Desserts', ar: 'الحلويات' },
    description: { en: 'Sweet treats', ar: 'الحلويات اللذيذة' },
    displayNumber: 3,
    isActive: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }
]

// Mock products for testing
export const mockProducts = [
  {
    id: 'prod-1',
    companyId: 'test-company-1',
    categoryId: 'cat-1',
    name: { en: 'Coffee', ar: 'قهوة' },
    description: { en: 'Fresh brewed coffee', ar: 'قهوة طازجة' },
    basePrice: 5.00,
    pricing: { default: 5.00, uber_eats: 5.50, website: 4.80 },
    cost: 2.00,
    status: 1,
    priority: 10,
    preparationTime: 5,
    tags: ['hot', 'caffeine'],
    category: mockCategories[0],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'prod-2',
    companyId: 'test-company-1',
    categoryId: 'cat-2',
    name: { en: 'Burger', ar: 'برجر' },
    description: { en: 'Beef burger with fries', ar: 'برجر لحم مع بطاطس' },
    basePrice: 15.00,
    pricing: { default: 15.00, uber_eats: 16.50, website: 14.50 },
    cost: 8.00,
    status: 1,
    priority: 5,
    preparationTime: 15,
    tags: ['main', 'beef'],
    category: mockCategories[1],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'prod-3',
    companyId: 'test-company-1',
    categoryId: 'cat-3',
    name: { en: 'Ice Cream', ar: 'آيس كريم' },
    description: { en: 'Vanilla ice cream', ar: 'آيس كريم الفانيليا' },
    basePrice: 8.00,
    pricing: { default: 8.00, uber_eats: 8.80, website: 7.60 },
    cost: 3.00,
    status: 0, // inactive
    priority: 1,
    preparationTime: 2,
    tags: ['dessert', 'cold'],
    category: mockCategories[2],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z'
  }
]

// Mock API responses
export const mockApiResponses = {
  categories: {
    success: {
      categories: mockCategories,
      total: mockCategories.length
    },
    empty: {
      categories: [],
      total: 0
    },
    error: null
  },
  products: {
    success: {
      products: mockProducts,
      pagination: {
        page: 1,
        limit: 50,
        total: mockProducts.length,
        hasMore: false
      }
    },
    paginated: {
      products: mockProducts.slice(0, 2),
      pagination: {
        page: 1,
        limit: 2,
        total: mockProducts.length,
        hasMore: true
      }
    },
    empty: {
      products: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        hasMore: false
      }
    }
  },
  tags: {
    success: {
      tags: ['hot', 'cold', 'main', 'dessert', 'caffeine', 'beef'],
      total: 6
    },
    empty: {
      tags: [],
      total: 0
    }
  }
}

// Mock fetch responses helper
export const mockFetchResponse = (data: any, status = 200, ok = true) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Map(),
    statusText: ok ? 'OK' : 'Error'
  })
}

// Mock authentication context
export const mockAuthContext = (user: MockUser | null = mockSuperAdmin, overrides: any = {}) => ({
  user,
  token: user ? 'mock-jwt-token' : null,
  isLoading: false,
  isHydrated: true,
  login: jest.fn(),
  logout: jest.fn(),
  isAuthenticated: !!user,
  ...overrides
})

// Mock language context
export const mockLanguageContext = (language: 'en' | 'ar' = 'en') => ({
  language,
  setLanguage: jest.fn(),
  t: jest.fn((key: string) => key), // Simple passthrough for testing
  isRTL: language === 'ar'
})

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: MockUser | null
  authOverrides?: any
  language?: 'en' | 'ar'
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  {
    user = mockSuperAdmin,
    authOverrides = {},
    language = 'en',
    queryClient,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Create a fresh QueryClient for each test to prevent test interference
  const testQueryClient = queryClient || new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })

  // Mock the contexts
  jest.doMock('../../src/contexts/AuthContext', () => ({
    useAuth: () => mockAuthContext(user, authOverrides),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children
  }))

  jest.doMock('../../src/contexts/LanguageContext', () => ({
    useLanguage: () => mockLanguageContext(language),
    LanguageProvider: ({ children }: { children: React.ReactNode }) => children
  }))

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  }
}

// Utility for waiting for async operations
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Utility for mocking localStorage with initial data
export const setupLocalStorageMock = (initialData: Record<string, string> = {}) => {
  const store: Record<string, string> = { ...initialData }

  localStorage.getItem = jest.fn((key: string) => store[key] || null)
  localStorage.setItem = jest.fn((key: string, value: string) => {
    store[key] = value
  })
  localStorage.removeItem = jest.fn((key: string) => {
    delete store[key]
  })
  localStorage.clear = jest.fn(() => {
    Object.keys(store).forEach(key => delete store[key])
  })

  return store
}

// Utility for setting up authenticated state
export const setupAuthenticatedState = (user: MockUser = mockSuperAdmin) => {
  setupLocalStorageMock({
    'auth-token': 'mock-jwt-token',
    'user': JSON.stringify(user)
  })
}

// Utility for setting up fetch mocks
export const setupFetchMocks = () => {
  const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>

  // Default successful responses
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

    if (urlString.includes('/menu/products/export')) {
      return mockFetchResponse({
        data: mockProducts,
        filename: 'products-export.xlsx',
        totalCount: mockProducts.length
      })
    }

    if (urlString.includes('/menu/products/import-template')) {
      return mockFetchResponse({
        data: [{ name: 'Sample Product', price: 10 }],
        filename: 'import-template.xlsx',
        instructions: { name: 'Product name', price: 'Product price' }
      })
    }

    // Default fallback
    return mockFetchResponse({ success: true })
  })

  return fetchMock
}

// Utility for creating mock file input events
export const createMockFileInput = (files: File[]) => {
  const input = document.createElement('input')
  input.type = 'file'

  Object.defineProperty(input, 'files', {
    value: files,
    writable: false,
  })

  return input
}

// Export everything for easy importing in tests
export * from '@testing-library/react'
export { renderWithProviders as render }