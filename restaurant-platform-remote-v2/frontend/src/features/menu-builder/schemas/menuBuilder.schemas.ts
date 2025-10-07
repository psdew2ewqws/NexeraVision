// Zod schemas for runtime validation

import { z } from 'zod';

// Localized string schema
export const localizedStringSchema = z.object({
  en: z.string(),
  ar: z.string()
});

// Menu product schema
export const menuProductSchema = z.object({
  id: z.string(),
  name: localizedStringSchema,
  description: localizedStringSchema.optional(),
  price: z.number().nonnegative(),
  imageUrl: z.string().url().optional(),
  categoryId: z.string(),
  categoryName: localizedStringSchema.optional(),
  isActive: z.boolean(),
  tags: z.array(z.string()).optional()
});

// Menu category schema
export const menuCategorySchema = z.object({
  id: z.string(),
  name: localizedStringSchema,
  displayNumber: z.number(),
  isActive: z.boolean(),
  productCount: z.number().optional()
});

// Product filters schema
export const productFiltersSchema = z.object({
  status: z.number().optional(),
  categoryId: z.string().nullable().optional(),
  search: z.string().optional(),
  limit: z.number().positive().optional(),
  offset: z.number().nonnegative().optional()
});

// Menu data schema for saving
export const menuDataSchema = z.object({
  name: z.string().min(1, 'Menu name is required'),
  branchIds: z.array(z.string()).min(1, 'At least one branch is required'),
  channelIds: z.array(z.string()).min(1, 'At least one channel is required'),
  productIds: z.array(z.string()).min(1, 'At least one product is required'),
  createdAt: z.string().datetime(),
  createdBy: z.string().optional()
});

// API response schemas
export const paginatedProductsResponseSchema = z.object({
  products: z.array(menuProductSchema),
  total: z.number(),
  hasMore: z.boolean()
});

export const categoriesResponseSchema = z.object({
  categories: z.array(menuCategorySchema)
});

export const saveMenuResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  success: z.boolean()
});

// Type inference from schemas
export type MenuProductSchema = z.infer<typeof menuProductSchema>;
export type MenuCategorySchema = z.infer<typeof menuCategorySchema>;
export type ProductFiltersSchema = z.infer<typeof productFiltersSchema>;
export type MenuDataSchema = z.infer<typeof menuDataSchema>;
