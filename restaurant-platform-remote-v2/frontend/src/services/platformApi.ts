import axios, { AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// Types
export interface Platform {
  id: string;
  name: string;
  displayName: { en: string; ar?: string };
  platformType: string;
  status: number;
  configuration: any;
  isSystemDefault: boolean;
  sortOrder: number;
  companyId: string;
  _count?: {
    productPlatformAssignments: number;
  };
  company?: {
    id: string;
    name: string;
    businessType: string;
  };
}

export interface PlatformResponse {
  platforms: Platform[];
  totalCount: number;
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}

export interface CreatePlatformDto {
  name: string;
  displayName: { en: string; ar?: string };
  platformType: string;
  configuration?: any;
  companyId?: string;
}

export interface UpdatePlatformDto {
  name?: string;
  displayName?: { en: string; ar?: string };
  platformType?: string;
  configuration?: any;
  status?: number;
}

export interface BulkAssignmentDto {
  productIds: string[];
  platformIds: string[];
  action: 'assign' | 'unassign';
}

export interface PlatformFiltersDto {
  search?: string;
  status?: number;
  platformType?: string;
  companyId?: string;
}

export interface AssignmentResult {
  success: boolean;
  message: string;
  assignedCount?: number;
  unassignedCount?: number;
}

export interface PlatformAssignment {
  id: string;
  productId: string;
  platformId: string;
  isAvailable: boolean;
  syncStatus: string;
  platform: {
    id: string;
    name: string;
    displayName: { en: string; ar?: string };
    platformType: string;
  };
}

// API Client
class PlatformApiClient {
  private baseURL = process.env.NEXT_PUBLIC_API_URL;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth-token');
  }

  private getAuthHeaders() {
    const token = this.getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    useCache: boolean = false
  ): Promise<T> {
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(data)}`;

    // Check cache for GET requests
    if (useCache && method === 'GET') {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    const config: AxiosRequestConfig = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      }
    };

    if (data) {
      if (method === 'GET') {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    try {
      const response = await axios(config);

      if (useCache && method === 'GET') {
        this.setCache(cacheKey, response.data);
      }

      return response.data;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }

  private getFromCache(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private handleApiError(error: any) {
    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    }
  }

  // Platform Management APIs

  async getPlatforms(filters?: PlatformFiltersDto): Promise<PlatformResponse> {
    return this.request<PlatformResponse>('GET', '/api/v1/platforms/menu-platforms', filters, true);
  }

  async createPlatform(platform: CreatePlatformDto): Promise<Platform> {
    const result = await this.request<Platform>('POST', '/api/v1/menu/platforms', platform);
    this.invalidateCache();
    return result;
  }

  async updatePlatform(id: string, updates: UpdatePlatformDto): Promise<Platform> {
    const result = await this.request<Platform>('PUT', `/api/v1/menu/platforms/${id}`, updates);
    this.invalidateCache();
    return result;
  }

  async deletePlatform(id: string): Promise<{ success: boolean; message: string }> {
    const result = await this.request<{ success: boolean; message: string }>('DELETE', `/api/v1/menu/platforms/${id}`);
    this.invalidateCache();
    return result;
  }

  async bulkAssignProducts(assignment: BulkAssignmentDto): Promise<AssignmentResult> {
    const result = await this.request<AssignmentResult>('POST', '/api/v1/platforms/bulk-assign', assignment);
    this.invalidateCache();
    return result;
  }

  async getPlatformsForUser(): Promise<{ platforms: Platform[] }> {
    return this.request<{ platforms: Platform[] }>('GET', '/api/v1/platforms/for-user', undefined, true);
  }

  async getProductAssignments(productIds: string[]): Promise<{ assignments: Record<string, PlatformAssignment[]> }> {
    return this.request<{ assignments: Record<string, PlatformAssignment[]> }>('POST', '/api/v1/platforms/assignments', { productIds });
  }

  // Menu Platform Integration APIs

  async getPlatformsForMenu(): Promise<{ platforms: Platform[] }> {
    return this.request<{ platforms: Platform[] }>('GET', '/api/v1/menu/platforms', undefined, true);
  }

  async getProductsByPlatform(filters: any): Promise<any> {
    return this.request('POST', '/api/v1/menu/products/by-platform', filters);
  }

  async bulkPlatformAssignment(assignment: BulkAssignmentDto): Promise<AssignmentResult> {
    const result = await this.request<AssignmentResult>('POST', '/api/v1/menu/products/platform-assignment', assignment);
    this.invalidateCache();
    return result;
  }

  // Platform Product Management APIs
  async assignProductsToPlatform(platformId: string, productIds: string[]): Promise<{ assignedCount: number; message: string }> {
    const result = await this.request<{ assignedCount: number; message: string }>('POST', `/api/v1/menu/platforms/${platformId}/products`, { productIds });
    this.invalidateCache();
    return result;
  }

  async removeProductsFromPlatform(platformId: string, productIds: string[]): Promise<{ removedCount: number; message: string }> {
    const result = await this.request<{ removedCount: number; message: string }>('DELETE', `/api/v1/menu/platforms/${platformId}/products`, { productIds });
    this.invalidateCache();
    return result;
  }

  // Cache management
  invalidateCache() {
    this.cache.clear();
  }

  clearCachePattern(pattern: string) {
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const platformApi = new PlatformApiClient();