import { Injectable } from '@nestjs/common';

interface ProductPreparationData {
  basePrice: number;
  categoryId: string;
  tags: string[];
  hasCustomPreparation?: boolean;
}

@Injectable()
export class PreparationTimeService {
  
  // Base preparation times by category (in minutes)
  private readonly baseCategoryTimes: { [key: string]: number } = {
    'appetizers': 8,
    'salads': 10,
    'soups': 12,
    'main_dishes': 18,
    'grilled': 25,
    'pasta': 15,
    'pizza': 20,
    'burgers': 12,
    'sandwiches': 8,
    'desserts': 5,
    'beverages': 3,
    'coffee': 5,
    'juices': 3
  };

  // Time modifiers based on price range
  private readonly priceModifiers: { min: number; max: number; modifier: number }[] = [
    { min: 0, max: 5, modifier: 0.8 },     // Simple/cheap items
    { min: 5, max: 15, modifier: 1.0 },    // Standard items
    { min: 15, max: 30, modifier: 1.2 },   // Premium items
    { min: 30, max: 999, modifier: 1.5 }   // Luxury items
  ];

  // Time modifiers based on tags
  private readonly tagModifiers: { [key: string]: number } = {
    'spicy': 1.1,
    'grilled': 1.3,
    'fried': 1.2,
    'fresh': 0.9,
    'cold': 0.7,
    'hot': 1.1,
    'custom': 1.4,
    'special': 1.3,
    'complex': 1.5,
    'simple': 0.8,
    'raw': 0.5,
    'cooked': 1.2,
    'baked': 1.4,
    'steamed': 1.1
  };

  /**
   * Calculate preparation time based on product data
   */
  calculatePreparationTime(productData: ProductPreparationData): number {
    // Start with base time for category
    let baseTime = this.getBaseCategoryTime(productData.categoryId);
    
    // Apply price modifier
    const priceModifier = this.getPriceModifier(productData.basePrice);
    baseTime *= priceModifier;
    
    // Apply tag modifiers
    const tagModifier = this.getTagModifier(productData.tags);
    baseTime *= tagModifier;
    
    // Round to nearest minute, minimum 3 minutes
    return Math.max(3, Math.round(baseTime));
  }

  /**
   * Get base preparation time for a category
   */
  private getBaseCategoryTime(categoryId: string): number {
    // Try to find exact match first
    if (this.baseCategoryTimes[categoryId]) {
      return this.baseCategoryTimes[categoryId];
    }

    // Try to find partial match (category name might contain keywords)
    for (const [category, time] of Object.entries(this.baseCategoryTimes)) {
      if (categoryId.toLowerCase().includes(category) || category.includes(categoryId.toLowerCase())) {
        return time;
      }
    }

    // Default time if no category match
    return 15; // 15 minutes default
  }

  /**
   * Get price-based modifier
   */
  private getPriceModifier(price: number): number {
    const modifier = this.priceModifiers.find(m => price >= m.min && price <= m.max);
    return modifier ? modifier.modifier : 1.0;
  }

  /**
   * Get tag-based modifier (compound if multiple matching tags)
   */
  private getTagModifier(tags: string[]): number {
    if (!tags || tags.length === 0) return 1.0;

    let totalModifier = 1.0;
    let appliedModifiers = 0;

    for (const tag of tags) {
      const tagKey = tag.toLowerCase().trim();
      if (this.tagModifiers[tagKey]) {
        totalModifier *= this.tagModifiers[tagKey];
        appliedModifiers++;
      }
    }

    // If too many modifiers, cap the impact
    if (appliedModifiers > 3) {
      totalModifier = Math.min(totalModifier, 2.0);
    }

    return totalModifier;
  }

  /**
   * Get estimated preparation time ranges for different categories
   */
  getPreparationTimeRanges(): { [category: string]: { min: number; max: number; avg: number } } {
    const ranges: { [category: string]: { min: number; max: number; avg: number } } = {};

    for (const [category, baseTime] of Object.entries(this.baseCategoryTimes)) {
      ranges[category] = {
        min: Math.round(baseTime * 0.8),
        max: Math.round(baseTime * 1.5),
        avg: baseTime
      };
    }

    return ranges;
  }

  /**
   * Validate and adjust preparation time based on business rules
   */
  validatePreparationTime(calculatedTime: number, categoryId: string): number {
    const baseTime = this.getBaseCategoryTime(categoryId);
    
    // Don't allow times that are too far from category base
    const minAllowed = Math.max(3, Math.round(baseTime * 0.5));
    const maxAllowed = Math.round(baseTime * 3);
    
    return Math.min(maxAllowed, Math.max(minAllowed, calculatedTime));
  }
}