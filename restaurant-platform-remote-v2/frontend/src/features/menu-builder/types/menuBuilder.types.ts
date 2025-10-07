// TypeScript types for menu builder feature

import { LocalizedString } from '../../../types/localization';

export interface MenuProduct {
  id: string;
  name: LocalizedString;
  description?: LocalizedString;
  price: number;
  imageUrl?: string;
  categoryId: string;
  categoryName?: LocalizedString;
  isActive: boolean;
  tags?: string[];
}

export interface MenuCategory {
  id: string;
  name: LocalizedString;
  displayNumber: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductFilters {
  status?: number;
  categoryId?: string | null;
  search?: string;
  limit?: number;
  page?: number;
}

export interface MenuData {
  name: string;
  branchIds: string[];
  channelIds: string[];
  productIds: string[];
  createdAt: string;
  createdBy?: string;
}

export interface PaginatedProductsResponse {
  products: MenuProduct[];
  total: number;
  hasMore: boolean;
}

export interface CategoriesResponse {
  categories: MenuCategory[];
}

export interface SaveMenuResponse {
  id: string;
  name: string;
  success: boolean;
}
