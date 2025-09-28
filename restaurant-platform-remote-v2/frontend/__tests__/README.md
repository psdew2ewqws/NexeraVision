# Frontend Test Suite

This directory contains comprehensive tests for the restaurant platform frontend application.

## Test Structure

```
__tests__/
├── pages/                 # Page component tests
│   └── menu/
│       └── products.test.tsx
├── integration/           # Integration tests
│   └── menu-products.test.tsx
├── utils/                 # Test utilities and helpers
│   └── test-utils.tsx
└── README.md             # This file
```

## Test Coverage

### Unit Tests (`pages/menu/products.test.tsx`)
- ✅ Page rendering and layout verification
- ✅ Authentication and authorization flows
- ✅ Category management functionality
- ✅ Product filtering and search operations
- ✅ Bulk operations (select, activate, deactivate, delete)
- ✅ Product actions (view, edit, delete)
- ✅ Import/export functionality
- ✅ Error handling and loading states
- ✅ Role-based access control
- ✅ Responsive behavior

### Integration Tests (`integration/menu-products.test.tsx`)
- ✅ Complete authentication integration flows
- ✅ Full API integration scenarios
- ✅ Complex user interaction workflows
- ✅ Error recovery and retry mechanisms
- ✅ Real-time updates and data synchronization
- ✅ Performance testing with large datasets
- ✅ Concurrent operations handling
- ✅ Network status and offline scenarios

## Key Test Features

### Comprehensive Mocking
- Next.js router and navigation
- API endpoints with realistic responses
- File upload and Excel operations
- Authentication contexts
- Network status simulation

### Error Scenario Testing
- API failures and network errors
- Authentication state changes
- Invalid data handling
- Offline operation scenarios
- Concurrent operation conflicts

### Performance Testing
- Large dataset rendering
- Virtualized component behavior
- Memory usage optimization
- Debounced filter operations

### Accessibility Testing
- Component structure validation
- Keyboard navigation support
- Screen reader compatibility
- ARIA attributes verification

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- products.test.tsx
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Integration Tests Only
```bash
npm test -- integration/
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- Next.js optimized setup
- TypeScript support
- Module path mapping
- Coverage thresholds (70% minimum)
- Custom test environment setup

### Setup Files
- `jest.setup.js` - Global test setup and mocks
- `jest.polyfills.js` - Browser API polyfills
- `__mocks__/fileMock.js` - Static file mocks

### Test Utilities (`utils/test-utils.tsx`)
- Custom render function with providers
- Mock data factories
- API response builders
- Authentication state helpers
- Network status simulation

## Mock Data

### Users
- `mockSuperAdmin` - Full system access
- `mockCompanyOwner` - Company-level access
- `mockBranchManager` - Branch-level access
- `mockCashier` - Limited read-only access

### Menu Data
- `mockCategories` - Sample category data
- `mockProducts` - Sample product data
- `mockApiResponses` - Realistic API responses

### API Responses
- Success scenarios with realistic data
- Error scenarios with appropriate error messages
- Empty state responses
- Paginated responses

## Test Patterns

### Component Testing
```tsx
it('should render component with correct props', async () => {
  renderWithProviders(<Component />, { user: mockSuperAdmin })

  await waitFor(() => {
    expect(screen.getByText('Expected Content')).toBeInTheDocument()
  })
})
```

### API Integration Testing
```tsx
it('should handle API call with proper error handling', async () => {
  fetchMock.mockImplementationOnce(() =>
    Promise.reject(new Error('Network error'))
  )

  renderWithProviders(<Component />)

  await waitFor(() => {
    expect(screen.getByText(/error message/i)).toBeInTheDocument()
  })
})
```

### User Interaction Testing
```tsx
it('should handle user interactions correctly', async () => {
  const user = userEvent.setup()
  renderWithProviders(<Component />)

  await user.click(screen.getByRole('button', { name: /action/i }))

  await waitFor(() => {
    expect(mockApiCall).toHaveBeenCalledWith(expectedParams)
  })
})
```

## Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Statements | 70% | ✅ |
| Branches | 70% | ✅ |
| Functions | 70% | ✅ |
| Lines | 70% | ✅ |

## Test Checklist

When adding new tests, ensure:

- [ ] All user interactions are tested
- [ ] Error scenarios are covered
- [ ] Loading states are verified
- [ ] API calls are mocked properly
- [ ] Authentication flows are tested
- [ ] Role-based access is verified
- [ ] Network failures are handled
- [ ] Data validation is tested
- [ ] Performance edge cases are covered
- [ ] Accessibility requirements are met

## Common Issues and Solutions

### Test Timeouts
- Increase `testTimeout` in Jest config
- Use `waitForLoadingToFinish()` helper
- Mock slow operations appropriately

### Mock Conflicts
- Clear mocks in `afterEach`
- Use isolated mock implementations
- Reset fetch mocks between tests

### Component Rendering Issues
- Ensure all providers are wrapped
- Mock external dependencies
- Use proper async/await patterns

### API Mock Problems
- Verify fetch mock setup
- Check URL matching patterns
- Validate response formats

## Continuous Integration

Tests run automatically on:
- Pull request creation
- Code commits to main branch
- Scheduled nightly builds

Requirements for CI passage:
- All tests must pass
- Coverage thresholds must be met
- No TypeScript errors
- Linting rules compliance

## Contributing

When adding new functionality:

1. Write tests first (TDD approach)
2. Ensure comprehensive coverage
3. Test error scenarios
4. Validate accessibility
5. Update test documentation
6. Review test performance

For bug fixes:
1. Write a failing test that reproduces the bug
2. Fix the bug
3. Ensure the test passes
4. Add regression test coverage