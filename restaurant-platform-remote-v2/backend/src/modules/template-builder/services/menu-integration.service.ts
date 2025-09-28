/**
 * Menu Integration Service
 * Connects thermal printer templates with real restaurant menu data
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface MenuItemForTemplate {
  id: string;
  name: {
    en: string;
    ar: string;
  };
  description?: {
    en: string;
    ar: string;
  };
  price: number;
  currency: string;
  category: {
    id: string;
    name: {
      en: string;
      ar: string;
    };
  };
  modifiers?: ModifierForTemplate[];
  isActive: boolean;
  preparationTime?: number;
  tags?: string[];
  allergens?: string[];
  nutritionalInfo?: any;
}

export interface ModifierForTemplate {
  id: string;
  name: {
    en: string;
    ar: string;
  };
  price: number;
  category: string;
  isRequired: boolean;
}

export interface OrderForTemplate {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  items: OrderItemForTemplate[];
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableNumber?: string;
  status: string;
  totals: {
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    deliveryFee?: number;
    serviceCharge?: number;
    discount?: number;
    total: number;
  };
  paymentMethod: string;
  paymentStatus: string;
  createdAt: Date;
  estimatedDeliveryTime?: Date;
  notes?: string;
  currency: string;
}

export interface OrderItemForTemplate {
  id: string;
  productName: {
    en: string;
    ar: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: Array<{
    name: {
      en: string;
      ar: string;
    };
    price: number;
  }>;
  specialRequests?: string;
}

export interface CompanyForTemplate {
  id: string;
  name: string;
  businessType: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxNumber?: string;
  currency: string;
  timezone: string;
  logo?: {
    thermal58: string;
    thermal80: string;
    web: string;
  };
}

export interface BranchForTemplate {
  id: string;
  name: string;
  nameAr: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  openTime?: string;
  closeTime?: string;
}

@Injectable()
export class MenuIntegrationService {
  private readonly logger = new Logger(MenuIntegrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get menu items for template generation
   */
  async getMenuItemsForTemplates(
    companyId: string,
    options?: {
      categoryId?: string;
      includeInactive?: boolean;
      limit?: number;
    }
  ): Promise<MenuItemForTemplate[]> {
    const whereClause: any = {
      companyId,
      ...(options?.categoryId && { categoryId: options.categoryId }),
      ...(options?.includeInactive === false && { isActive: true })
    };

    const products = await this.prisma.menuProduct.findMany({
      where: whereClause,
      take: options?.limit,
      include: {
        category: true,
        modifierCategories: {
          include: {
            modifierCategory: {
              include: {
                modifiers: true
              }
            }
          }
        }
      },
      orderBy: {
        priority: 'asc'
      }
    });

    return products.map(product => this.mapProductToTemplate(product));
  }

  /**
   * Get real order data for template testing
   */
  async getOrderForTemplate(
    orderId: string,
    companyId: string
  ): Promise<OrderForTemplate | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        branch: {
          companyId
        }
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        },
        branch: {
          include: {
            company: true
          }
        }
      }
    });

    if (!order) return null;

    return this.mapOrderToTemplate(order);
  }

  /**
   * Get recent orders for template testing
   */
  async getRecentOrdersForTemplates(
    companyId: string,
    limit: number = 10
  ): Promise<OrderForTemplate[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        branch: {
          companyId
        }
      },
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        },
        branch: {
          include: {
            company: true
          }
        }
      }
    });

    return orders.map(order => this.mapOrderToTemplate(order));
  }

  /**
   * Get company data for templates
   */
  async getCompanyForTemplate(companyId: string): Promise<CompanyForTemplate | null> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        companyLogo: true
      }
    });

    if (!company) return null;

    return {
      id: company.id,
      name: company.name,
      businessType: company.businessType || 'restaurant',
      currency: company.defaultCurrency,
      timezone: company.timezone,
      taxNumber: `TAX${company.id.slice(0, 8).toUpperCase()}`,
      logo: company.companyLogo ? {
        thermal58: company.companyLogo.thermal58Data,
        thermal80: company.companyLogo.thermal80Data,
        web: company.companyLogo.webUrl
      } : undefined
    };
  }

  /**
   * Get branch data for templates
   */
  async getBranchForTemplate(branchId: string, companyId: string): Promise<BranchForTemplate | null> {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId
      }
    });

    if (!branch) return null;

    return {
      id: branch.id,
      name: branch.name,
      nameAr: branch.nameAr,
      address: branch.address || undefined,
      phone: branch.phone || undefined,
      email: branch.email || undefined,
      timezone: branch.timezone,
      openTime: branch.openTime || undefined,
      closeTime: branch.closeTime || undefined
    };
  }

  /**
   * Generate sample order for template testing
   */
  async generateSampleOrder(
    companyId: string,
    branchId?: string,
    options?: {
      includeArabic?: boolean;
      orderType?: 'dine_in' | 'takeaway' | 'delivery';
      itemCount?: number;
    }
  ): Promise<OrderForTemplate> {
    const company = await this.getCompanyForTemplate(companyId);
    const branch = branchId ? await this.getBranchForTemplate(branchId, companyId) : null;
    const menuItems = await this.getMenuItemsForTemplates(companyId, { limit: 20 });

    const sampleItems = menuItems.slice(0, options?.itemCount || 3).map((item, index) => {
      const quantity = Math.floor(Math.random() * 3) + 1;
      const basePrice = item.price * quantity;

      return {
        id: `sample-item-${index}`,
        productName: item.name,
        quantity,
        unitPrice: item.price,
        totalPrice: basePrice,
        modifiers: item.modifiers?.slice(0, 2).map(mod => ({
          name: mod.name,
          price: mod.price
        })),
        specialRequests: index === 0 ? (options?.includeArabic ? 'طلب خاص | Special request' : 'Special request') : undefined
      };
    });

    const subtotal = sampleItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = 0.16; // Jordan VAT
    const taxAmount = subtotal * taxRate;
    const deliveryFee = options?.orderType === 'delivery' ? 2.000 : 0;
    const total = subtotal + taxAmount + deliveryFee;

    return {
      id: 'sample-order-' + Date.now(),
      orderNumber: `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      customer: {
        name: options?.includeArabic ? 'أحمد محمد | Ahmad Mohammad' : 'Ahmad Mohammad',
        phone: '+962 79 123 4567',
        email: 'ahmad@example.com',
        address: options?.orderType === 'delivery' ? (options?.includeArabic ? 'شارع الرينبو، عمان | Rainbow Street, Amman' : 'Rainbow Street, Amman') : undefined
      },
      items: sampleItems,
      orderType: options?.orderType || 'dine_in',
      tableNumber: options?.orderType === 'dine_in' ? 'T15' : undefined,
      status: 'confirmed',
      totals: {
        subtotal,
        taxAmount,
        taxRate,
        deliveryFee,
        total
      },
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      createdAt: new Date(),
      estimatedDeliveryTime: options?.orderType === 'delivery' ? new Date(Date.now() + 30 * 60 * 1000) : undefined,
      notes: options?.includeArabic ? 'ملاحظات خاصة | Special notes' : 'Special notes',
      currency: company?.currency || 'JOD'
    };
  }

  /**
   * Map database product to template format
   */
  private mapProductToTemplate(product: any): MenuItemForTemplate {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price.toString()),
      currency: product.currency || 'JOD',
      category: {
        id: product.category.id,
        name: product.category.name
      },
      modifiers: product.productModifierCategories?.flatMap((pmc: any) =>
        pmc.modifierCategory.modifiers.map((mod: any) => ({
          id: mod.id,
          name: mod.name,
          price: parseFloat(mod.price.toString()),
          category: pmc.modifierCategory.name.en,
          isRequired: pmc.isRequired
        }))
      ),
      isActive: product.isActive,
      preparationTime: product.preparationTime,
      tags: product.tags,
      allergens: product.allergens
    };
  }

  /**
   * Map database order to template format
   */
  private mapOrderToTemplate(order: any): OrderForTemplate {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
        address: order.deliveryAddress
      },
      items: order.orderItems.map((item: any) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice.toString()),
        totalPrice: parseFloat(item.totalPrice.toString()),
        modifiers: item.modifiers || [],
        specialRequests: item.specialRequests
      })),
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      status: order.status,
      totals: {
        subtotal: parseFloat(order.subtotal.toString()),
        taxAmount: parseFloat(order.taxAmount.toString()),
        taxRate: 0.16, // Jordan VAT
        deliveryFee: parseFloat(order.deliveryFee?.toString() || '0'),
        total: parseFloat(order.totalAmount.toString())
      },
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      notes: order.notes,
      currency: order.branch?.company?.defaultCurrency || 'JOD'
    };
  }

  /**
   * Get popular menu items for template suggestions
   */
  async getPopularMenuItems(
    companyId: string,
    limit: number = 10
  ): Promise<MenuItemForTemplate[]> {
    // Get items that appear most frequently in orders
    const popularItems = await this.prisma.menuProduct.findMany({
      where: {
        companyId,
        status: 1,
        orderItems: {
          some: {}
        }
      },
      include: {
        category: true,
        orderItems: true,
        modifierCategories: {
          include: {
            modifierCategory: {
              include: {
                modifiers: true
              }
            }
          }
        }
      },
      orderBy: {
        orderItems: {
          _count: 'desc'
        }
      },
      take: limit
    });

    return popularItems.map(product => this.mapProductToTemplate(product));
  }

  /**
   * Get menu statistics for insights
   */
  async getMenuStatistics(companyId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    averagePrice: number;
    priceRange: { min: number; max: number };
    topCategories: Array<{ name: string; count: number }>;
  }> {
    const [
      totalProducts,
      activeProducts,
      categories,
      priceStats,
      topCategories
    ] = await Promise.all([
      this.prisma.menuProduct.count({ where: { companyId } }),
      this.prisma.menuProduct.count({ where: { companyId, status: 1 } }),
      this.prisma.menuCategory.count({ where: { companyId } }),
      this.prisma.menuProduct.aggregate({
        where: { companyId, status: 1 },
        _avg: { basePrice: true },
        _min: { basePrice: true },
        _max: { basePrice: true }
      }),
      this.prisma.menuCategory.findMany({
        where: { companyId },
        include: {
          _count: {
            select: { products: true }
          }
        },
        orderBy: {
          products: {
            _count: 'desc'
          }
        },
        take: 5
      })
    ]);

    return {
      totalProducts,
      activeProducts,
      totalCategories: categories,
      averagePrice: parseFloat(priceStats._avg.basePrice?.toString() || '0'),
      priceRange: {
        min: parseFloat(priceStats._min.basePrice?.toString() || '0'),
        max: parseFloat(priceStats._max.basePrice?.toString() || '0')
      },
      topCategories: topCategories.map(cat => ({
        name: typeof cat.name === 'object' ? (cat.name as any).en || (cat.name as any).ar || 'Unknown' : cat.name,
        count: cat._count.products
      }))
    };
  }
}