/**
 * AuthContext Tests
 *
 * These tests verify the authentication context functionality
 * and would catch the authentication-related issues that caused the 404 problem.
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useAuth, AuthProvider } from '../../src/contexts/AuthContext'
import { setupLocalStorageMock, mockSuperAdmin } from '../utils/test-utils'

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isLoading, isAuthenticated, isHydrated } = useAuth()

  return (
    <div>
      <div data-testid="user-email">{user?.email || 'No user'}</div>
      <div data-testid="loading-state">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="auth-state">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="hydration-state">{isHydrated ? 'hydrated' : 'not-hydrated'}</div>
    </div>
  )
}

const renderWithAuthProvider = (user = mockSuperAdmin) => {
  if (user) {
    setupLocalStorageMock({
      'auth-token': 'mock-jwt-token',
      'user': JSON.stringify(user)
    })
  } else {
    setupLocalStorageMock({})
  }

  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should provide authentication state when user is logged in', async () => {
    renderWithAuthProvider(mockSuperAdmin)

    // Should eventually show authenticated state
    await waitFor(() => {
      expect(screen.getByTestId('hydration-state')).toHaveTextContent('hydrated')
    })

    expect(screen.getByTestId('user-email')).toHaveTextContent(mockSuperAdmin.email)
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated')
  })

  it('should provide unauthenticated state when no user is stored', async () => {
    renderWithAuthProvider(null)

    await waitFor(() => {
      expect(screen.getByTestId('hydration-state')).toHaveTextContent('hydrated')
    })

    expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
    expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated')
  })

  it('should handle hydration process correctly', async () => {
    renderWithAuthProvider(mockSuperAdmin)

    // Initially not hydrated
    expect(screen.getByTestId('hydration-state')).toHaveTextContent('not-hydrated')

    // Should become hydrated
    await waitFor(() => {
      expect(screen.getByTestId('hydration-state')).toHaveTextContent('hydrated')
    })
  })

  it('should handle malformed user data gracefully', async () => {
    setupLocalStorageMock({
      'auth-token': 'mock-jwt-token',
      'user': 'invalid-json'
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('hydration-state')).toHaveTextContent('hydrated')
    })

    // Should clear invalid data and show unauthenticated state
    expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
    expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated')
  })

  it('should handle storage changes', async () => {
    renderWithAuthProvider(mockSuperAdmin)

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated')
    })

    // Simulate storage change (token removal)
    act(() => {
      localStorage.removeItem('auth-token')
      localStorage.removeItem('user')

      // Trigger storage event
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'auth-token',
        oldValue: 'mock-jwt-token',
        newValue: null
      }))
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('not-authenticated')
    })
  })

  it('should throw error when used outside provider', () => {
    // Mock console.error to avoid error output in tests
    const originalError = console.error
    console.error = jest.fn()

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    console.error = originalError
  })

  it('should handle super admin without companyId', async () => {
    const superAdminWithoutCompany = {
      ...mockSuperAdmin,
      companyId: ''
    }

    renderWithAuthProvider(superAdminWithoutCompany)

    await waitFor(() => {
      expect(screen.getByTestId('hydration-state')).toHaveTextContent('hydrated')
    })

    // Super admin should still be authenticated even without companyId
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user-email')).toHaveTextContent(superAdminWithoutCompany.email)
  })

  it('should handle user with missing companyId for non-super admin', async () => {
    const userWithoutCompany = {
      id: 'test-user-1',
      email: 'user@test.com',
      name: 'Test User',
      role: 'company_owner' as const,
      companyId: '' // Missing companyId
    }

    renderWithAuthProvider(userWithoutCompany)

    await waitFor(() => {
      expect(screen.getByTestId('hydration-state')).toHaveTextContent('hydrated')
    })

    // User should still be authenticated, but the app should handle missing companyId appropriately
    expect(screen.getByTestId('auth-state')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user-email')).toHaveTextContent(userWithoutCompany.email)
  })
})