/**
 * Mock Components for Testing
 *
 * This file contains mock implementations of complex components
 * that are used in the products page but aren't the focus of unit tests.
 */

import React from 'react'

// Mock implementations for features/menu/components
export const MockVirtualizedProductGrid = ({
  filters,
  onProductSelect,
  onProductEdit,
  onProductDelete,
  onProductView,
  selectedProducts,
  selectionMode,
  refreshTrigger
}: any) => {
  return (
    <div data-testid="virtualized-product-grid">
      <div data-testid="grid-filters">{JSON.stringify(filters)}</div>
      <div data-testid="grid-selection-mode">{selectionMode ? 'active' : 'inactive'}</div>
      <div data-testid="grid-selected-products">{selectedProducts.join(',')}</div>
      <div data-testid="grid-refresh-trigger">{refreshTrigger}</div>
      <div data-testid="grid-loading">Loading products...</div>
    </div>
  )
}

export const MockProductFilters = ({ filters, onFiltersChange }: any) => {
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

export const MockCategorySidebar = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
  onCategoryUpdate
}: any) => {
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

export const MockAddProductModal = ({ isOpen, onClose, onProductAdded }: any) => {
  if (!isOpen) return null
  return (
    <div data-testid="add-product-modal">
      <button onClick={onClose} data-testid="close-add-modal">Close</button>
      <button onClick={onProductAdded} data-testid="add-product-success">Add Product</button>
    </div>
  )
}

export const MockEditProductModal = ({ isOpen, onClose, onProductUpdated, product }: any) => {
  if (!isOpen) return null
  return (
    <div data-testid="edit-product-modal">
      <div data-testid="editing-product-name">{product?.name?.en}</div>
      <button onClick={onClose} data-testid="close-edit-modal">Close</button>
      <button onClick={onProductUpdated} data-testid="update-product-success">Update Product</button>
    </div>
  )
}

export const MockProductViewModal = ({ isOpen, onClose, product }: any) => {
  if (!isOpen) return null
  return (
    <div data-testid="view-product-modal">
      <div data-testid="viewing-product-name">{product?.name?.en}</div>
      <button onClick={onClose} data-testid="close-view-modal">Close</button>
    </div>
  )
}

// Mock ErrorBoundary component
export const MockErrorBoundary = ({ children, fallback }: any) => {
  return <div data-testid="error-boundary">{children}</div>
}

// Mock ProtectedRoute component
export const MockProtectedRoute = ({ children }: any) => {
  return <div data-testid="protected-route">{children}</div>
}

// Helper to create mock components for jest.mock
export const createMockComponent = (name: string, testId?: string) => {
  return function MockComponent(props: any) {
    return (
      <div data-testid={testId || name.toLowerCase()}>
        Mock {name}
        {props.children && <div>{props.children}</div>}
      </div>
    )
  }
}