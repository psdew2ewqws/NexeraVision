// Clean API abstraction for menu builder operations

import type {
  MenuProduct,
  MenuCategory,
  ProductFilters,
  MenuData,
  PaginatedProductsResponse,
  CategoriesResponse,
  SaveMenuResponse
} from '../types/menuBuilder.types';
import { getApiUrl } from '../../../config/api.config';

class MenuBuilderService {
  private apiUrl: string;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.apiUrl = getApiUrl();
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response, context: string): Promise<T> {
    if (!response.ok) {
      let errorMessage = `${context} failed: ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // Use default error message if JSON parsing fails
      }

      // Check for specific error codes
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      } else if (response.status === 403) {
        throw new Error('You do not have permission to perform this action.');
      } else if (response.status === 404) {
        throw new Error(`${context}: Resource not found. Please try again later.`);
      } else if (response.status >= 500) {
        throw new Error(`${context}: Server error. Please try again later.`);
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  private async retryRequest<T>(
    requestFn: () => Promise<Response>,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await requestFn();
        return await this.handleResponse<T>(response, context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on auth errors or client errors (except timeout)
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('403')) {
            throw error;
          }
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error(`${context} failed after ${this.maxRetries} attempts`);
  }

  async getProducts(filters: ProductFilters = {}): Promise<PaginatedProductsResponse> {
    // Clean up filters - remove undefined/null values
    const requestFilters: any = {
      status: filters.status ?? 1,
      limit: filters.limit ?? 100,
      page: filters.page ?? 1
    };

    // Only add categoryId and search if they have values
    if (filters.categoryId !== undefined && filters.categoryId !== null && filters.categoryId !== '') {
      requestFilters.categoryId = filters.categoryId;
    }

    if (filters.search && filters.search.trim() !== '') {
      requestFilters.search = filters.search.trim();
    }

    return this.retryRequest<PaginatedProductsResponse>(
      () => fetch(`${this.apiUrl}/menu/products/paginated`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestFilters)
      }),
      'Load products'
    ).then(data => ({
      products: data.products || [],
      total: data.total || 0,
      hasMore: data.hasMore || false
    })).catch(error => {
      console.error('Failed to load products:', error);
      // Return empty result instead of throwing to prevent UI breakage
      return {
        products: [],
        total: 0,
        hasMore: false
      };
    });
  }

  async getCategories(): Promise<MenuCategory[]> {
    return this.retryRequest<CategoriesResponse>(
      () => fetch(`${this.apiUrl}/menu/categories`, {
        headers: this.getHeaders()
      }),
      'Load categories'
    ).then(data => data.categories || [])
     .catch(error => {
       console.error('Failed to load categories:', error);
       // Return empty array instead of throwing
       return [];
     });
  }

  async saveMenu(menuData: MenuData): Promise<SaveMenuResponse> {
    return this.retryRequest<SaveMenuResponse>(
      () => fetch(`${this.apiUrl}/menu/save`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(menuData)
      }),
      'Save menu'
    );
  }

  async syncToPlatform(platformId: string, menuId: string): Promise<void> {
    await this.retryRequest<void>(
      () => fetch(`${this.apiUrl}/menu/sync`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ platformId, menuId })
      }),
      'Sync menu to platform'
    );
  }
}

// Export singleton instance
export const menuBuilderService = new MenuBuilderService();
