import toast from 'react-hot-toast';

// Retry configuration
interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Retry on network errors, 5xx errors, and timeouts
    if (!error.response) return true; // Network error
    const status = error.response?.status;
    return status >= 500 || status === 408; // Server errors or timeout
  }
};

// Sleep function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced fetch with retry logic
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      // Add timeout to the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        }
      });

      clearTimeout(timeoutId);

      // If response is ok, return it
      if (response.ok) {
        return response;
      }

      // Create error object for non-ok responses
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).response = response;

      // Check if we should retry this error
      if (attempt < config.maxAttempts && config.retryCondition?.(error)) {
        console.warn(`API request failed (attempt ${attempt}/${config.maxAttempts}):`, error.message);
        await sleep(config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1));
        continue;
      }

      throw error;

    } catch (error: any) {
      lastError = error;

      // Handle AbortError (timeout)
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout - please check your connection');
        (timeoutError as any).isTimeout = true;
        lastError = timeoutError;
      }

      // Check if we should retry
      if (attempt < config.maxAttempts && config.retryCondition?.(error)) {
        console.warn(`API request failed (attempt ${attempt}/${config.maxAttempts}):`, error.message);
        await sleep(config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}

// Safe JSON parsing with validation
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error('JSON parsing failed:', error);
    return fallback;
  }
}

// API response validation
export function validateApiResponse(data: any, expectedFields: string[] = []): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  for (const field of expectedFields) {
    if (!(field in data)) {
      console.warn(`Missing expected field in API response: ${field}`);
      return false;
    }
  }

  return true;
}

// Type guards for common data structures
export function isMenuProduct(obj: any): obj is import('../types/menu').MenuProduct {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'object' &&
    typeof obj.pricing === 'object';
}

export function isMenuCategory(obj: any): obj is import('../types/menu').MenuCategory {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'object' &&
    typeof obj.displayNumber === 'number';
}

// Safe array validation
export function validateArray<T>(
  data: any,
  validator: (item: any) => item is T,
  fallback: T[] = []
): T[] {
  if (!Array.isArray(data)) {
    console.warn('Expected array but received:', typeof data);
    return fallback;
  }

  const validItems = data.filter(validator);

  if (validItems.length !== data.length) {
    console.warn(`Filtered ${data.length - validItems.length} invalid items from array`);
  }

  return validItems;
}

// Enhanced API call with comprehensive error handling
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  config: {
    requireAuth?: boolean;
    validateResponse?: (data: any) => boolean;
    fallbackData?: T;
    showErrorToast?: boolean;
    retryConfig?: Partial<RetryConfig>;
  } = {}
): Promise<{ data: T | null; error: string | null; success: boolean }> {

  const {
    requireAuth = true,
    validateResponse,
    fallbackData = null,
    showErrorToast = true,
    retryConfig
  } = config;

  try {
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    // Add authorization if required
    if (requireAuth) {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('Authentication required');
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Make the API call
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const response = await fetchWithRetry(url, {
      ...options,
      headers
    }, retryConfig);

    // Parse response
    const responseText = await response.text();
    const data = responseText ? safeJsonParse(responseText, fallbackData) : fallbackData;

    // Validate response if validator provided
    if (validateResponse && !validateResponse(data)) {
      throw new Error('Invalid response format from server');
    }

    return {
      data: data as T,
      error: null,
      success: true
    };

  } catch (error: any) {
    console.error(`API call failed for ${endpoint}:`, error);

    let errorMessage = 'An unexpected error occurred';

    if (error.isTimeout) {
      errorMessage = 'Request timeout - please check your connection and try again';
    } else if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          errorMessage = 'Authentication failed - please log in again';
          // Clear invalid auth
          localStorage.removeItem('auth-token');
          localStorage.removeItem('user');
          break;
        case 403:
          errorMessage = 'Access denied - insufficient permissions';
          break;
        case 404:
          errorMessage = 'Requested resource not found';
          break;
        case 429:
          errorMessage = 'Too many requests - please wait a moment and try again';
          break;
        case 500:
          errorMessage = 'Server error - please try again later';
          break;
        default:
          errorMessage = `Request failed (${status}): ${error.message}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    if (showErrorToast) {
      toast.error(errorMessage);
    }

    return {
      data: fallbackData as T,
      error: errorMessage,
      success: false
    };
  }
}

// Specific API helpers for menu operations
export const menuApi = {
  getCategories: () => apiCall<{ categories: import('../types/menu').MenuCategory[] }>(
    '/api/v1/menu/categories',
    {},
    {
      validateResponse: (data) => Array.isArray(data?.categories),
      fallbackData: { categories: [] }
    }
  ),

  getTags: () => apiCall<{ tags: string[] }>(
    '/api/v1/menu/tags',
    {},
    {
      validateResponse: (data) => Array.isArray(data?.tags),
      fallbackData: { tags: [] }
    }
  ),

  getProducts: (filters: any) => apiCall<{
    products: import('../types/menu').MenuProduct[];
    pagination: { hasMore: boolean; total: number; page: number; }
  }>(
    '/api/v1/menu/products/paginated',
    {
      method: 'POST',
      body: JSON.stringify(filters)
    },
    {
      validateResponse: (data) => Array.isArray(data?.products) && data?.pagination,
      fallbackData: { products: [], pagination: { hasMore: false, total: 0, page: 1 } }
    }
  ),

  deleteProduct: (productId: string) => apiCall(
    `/api/v1/menu/products/${productId}`,
    { method: 'DELETE' },
    { showErrorToast: false } // Handle toast in component
  ),

  bulkUpdateProducts: (productIds: string[], updates: any) => apiCall(
    '/api/v1/menu/products/bulk-status',
    {
      method: 'POST',
      body: JSON.stringify({ productIds, ...updates })
    }
  )
};

export default {
  fetchWithRetry,
  safeJsonParse,
  validateApiResponse,
  validateArray,
  apiCall,
  menuApi,
  isMenuProduct,
  isMenuCategory
};