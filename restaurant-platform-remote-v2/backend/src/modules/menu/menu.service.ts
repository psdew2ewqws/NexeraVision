import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { BaseService, BaseEntity, BaseUser } from '../../common/services/base.service';
import { PreparationTimeService } from './services/preparation-time.service';
import { TaxesService } from '../taxes/taxes.service';
import { CreateProductDto, UpdateProductDto, ProductFiltersDto, BulkStatusUpdateDto, BulkDeleteDto, CreateCategoryDto } from './dto';

export interface MenuProductEntity extends BaseEntity {
  companyId: string;
  name: any;
  status: number;
}

@Injectable()
export class MenuService extends BaseService<MenuProductEntity> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly preparationTimeService: PreparationTimeService,
    @Inject(forwardRef(() => TaxesService))
    private readonly taxesService: TaxesService
  ) {
    super(prisma, 'menuProduct');
  }

  // Enterprise paginated products with company isolation
  async getPaginatedProducts(filters: ProductFiltersDto, userCompanyId?: string, userRole?: string) {
    const {
      search,
      categoryId,
      status,
      tags,
      sortBy = 'priority',
      sortOrder = 'asc',
      page = 1,
      limit = 50,
      companyId
    } = filters;

    const currentUser: BaseUser = {
      id: 'system',
      companyId: userCompanyId || '',
      role: userRole || 'user'
    };

    // Use BaseService helper for company isolation and additional filters
    const additionalWhere: any = {
      ...(status !== undefined && { status }),
      ...(categoryId && { categoryId }),
      ...(tags?.length && { tags: { hasEvery: tags } }),
    };

    // For super_admin, allow specific company filtering
    if (userRole === 'super_admin' && companyId) {
      additionalWhere.companyId = companyId;
    }

    const where = this.buildBaseWhereClause(currentUser, additionalWhere);

    // Case-insensitive search using simplified JSONB search
    if (search) {
      const searchLower = search.toLowerCase();
      const searchUpper = search.toUpperCase();
      const searchTitle = search.charAt(0).toUpperCase() + search.slice(1).toLowerCase();
      
      where.OR = [
        // Search in English names - use contains instead of string_contains
        {
          name: {
            path: ['en'],
            string_contains: search
          }
        },
        // Search in English names with different cases
        {
          name: {
            path: ['en'],
            string_contains: searchLower
          }
        },
        {
          name: {
            path: ['en'],
            string_contains: searchUpper
          }
        },
        {
          name: {
            path: ['en'],
            string_contains: searchTitle
          }
        },
        // Search in Arabic names
        {
          name: {
            path: ['ar'],
            string_contains: search
          }
        },
        {
          name: {
            path: ['ar'],
            string_contains: searchLower
          }
        },
        // Search in tags (try different cases)
        { 
          tags: { 
            hasSome: [search, searchLower, searchUpper, searchTitle] 
          } 
        }
      ];
    }

    // Sorting configuration
    let orderBy: any = {};
    if (sortBy === 'name') {
      // For JSON fields in Prisma, we need to handle this differently
      // We'll sort by priority as fallback to avoid errors, and implement client-side sorting for name
      orderBy.priority = 'asc'; // Fallback sorting to prevent errors
    } else if (sortBy === 'price') {
      orderBy.basePrice = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'priority') {
      orderBy.priority = sortOrder;
    }

    // Use BaseService pagination helper
    const { skip, take } = this.buildPaginationParams(page, limit);

    const [products, totalCount] = await Promise.all([
      this.prisma.menuProduct.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true }
          },
          company: {
            select: { id: true, name: true, slug: true }
          }
        },
        orderBy,
        skip,
        take,
      }),
      this.prisma.menuProduct.count({ where })
    ]);

    // Handle name sorting on the server side after fetch
    let sortedProducts = products;
    if (sortBy === 'name') {
      sortedProducts = products.sort((a, b) => {
        const nameA = (a.name as any)?.en?.toLowerCase() || '';
        const nameB = (b.name as any)?.en?.toLowerCase() || '';
        
        if (sortOrder === 'desc') {
          return nameB.localeCompare(nameA);
        } else {
          return nameA.localeCompare(nameB);
        }
      });
    }

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    // Transform products to ensure decimal fields are numbers for frontend
    const transformedProducts = await Promise.all(
      sortedProducts.map(async (product) => {
        // Basic transformation
        const baseTransformed = {
          ...product,
          basePrice: Number(product.basePrice),
          cost: Number(product.cost),
          pricing: typeof product.pricing === 'object' && product.pricing
            ? Object.fromEntries(
                Object.entries(product.pricing as Record<string, any>).map(([key, value]) => [
                  key,
                  typeof value === 'number' ? value : Number(value) || 0
                ])
              )
            : {}
        };

        // Try to enhance with tax calculations (non-blocking)
        try {
          const enhancedPricing = await this.taxesService.enhancePricingWithTax(
            product.id,
            baseTransformed.pricing as Record<string, number>,
            product.companyId
          );

          return {
            ...baseTransformed,
            pricingWithTax: enhancedPricing,
            // Keep original pricing for backward compatibility
            pricing: baseTransformed.pricing
          };
        } catch (error) {
          // If tax calculation fails, return base product without tax info
          console.warn(`Tax calculation failed for product ${product.id}:`, error.message);
          return baseTransformed;
        }
      })
    );

    return {
      products: transformedProducts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore
      }
    };
  }

  // Create new product with company isolation
  async createProduct(createProductDto: CreateProductDto, userCompanyId?: string) {
    const { companyId, calculatePreparationTime, preparationTimeOverride, ...productData } = createProductDto;
    
    // Use provided companyId (super_admin) or user's company (others)
    const effectiveCompanyId = companyId || userCompanyId;
    
    if (!effectiveCompanyId) {
      throw new ForbiddenException('Company ID is required');
    }

    // Verify category belongs to the same company
    const category = await this.prisma.menuCategory.findFirst({
      where: { 
        id: productData.categoryId,
        companyId: effectiveCompanyId
      }
    });

    if (!category) {
      throw new NotFoundException('Category not found or does not belong to your company');
    }

    // Calculate or use provided preparation time
    let finalPreparationTime = preparationTimeOverride;
    if (calculatePreparationTime && !preparationTimeOverride) {
      finalPreparationTime = this.preparationTimeService.calculatePreparationTime({
        basePrice: productData.basePrice,
        categoryId: productData.categoryId,
        tags: productData.tags || []
      });
    }

    // Process images array - use first image as primary image for backward compatibility
    const primaryImage = productData.images?.[0] || productData.image;
    const additionalImages = productData.images?.slice(1) || [];

    return this.prisma.menuProduct.create({
      data: {
        ...productData,
        companyId: effectiveCompanyId,
        status: productData.status ?? 1, // Default to active
        priority: productData.priority ?? 999, // Default to end of list
        tags: productData.tags ?? [],
        image: primaryImage,
        images: productData.images || [],
        preparationTime: finalPreparationTime,
        pricing: (productData.pricing as any) || {}
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      }
    });
  }

  // Get single product with company isolation
  async getProduct(id: string, userCompanyId?: string) {
    const product = await this.prisma.menuProduct.findFirst({
      where: { 
        id,
        ...(userCompanyId && { companyId: userCompanyId })
      },
      include: {
        category: {
          select: { id: true, name: true, companyId: true }
        }
      }
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  // Update product with company isolation
  async updateProduct(id: string, updateProductDto: UpdateProductDto, userCompanyId?: string) {
    // Verify product exists and belongs to company
    const existingProduct = await this.getProduct(id, userCompanyId);

    // Verify new category belongs to same company if changed
    if (updateProductDto.categoryId && updateProductDto.categoryId !== existingProduct.categoryId) {
      const category = await this.prisma.menuCategory.findFirst({
        where: { 
          id: updateProductDto.categoryId,
          companyId: existingProduct.companyId
        }
      });

      if (!category) {
        throw new NotFoundException('Category not found or does not belong to your company');
      }
    }

    const { companyId, ...updateData } = updateProductDto;
    
    return this.prisma.menuProduct.update({
      where: { id },
      data: updateData as any,
      include: {
        category: {
          select: { id: true, name: true }
        }
      }
    });
  }

  // Delete product with company isolation
  async deleteProduct(id: string, userCompanyId?: string) {
    // Verify product exists and belongs to company
    await this.getProduct(id, userCompanyId);

    return this.prisma.menuProduct.delete({
      where: { id }
    });
  }

  // Bulk status update with company isolation
  async bulkUpdateStatus(bulkStatusDto: BulkStatusUpdateDto, userCompanyId?: string) {
    const { productIds, status } = bulkStatusDto;

    // Verify all products belong to the company
    const products = await this.prisma.menuProduct.findMany({
      where: {
        id: { in: productIds },
        ...(userCompanyId && { companyId: userCompanyId })
      }
    });

    if (products.length !== productIds.length) {
      throw new ForbiddenException('Some products do not exist or do not belong to your company');
    }

    const result = await this.prisma.menuProduct.updateMany({
      where: {
        id: { in: productIds },
        ...(userCompanyId && { companyId: userCompanyId })
      },
      data: { status }
    });

    return { updatedCount: result.count };
  }

  // Bulk delete with company isolation
  async bulkDelete(bulkDeleteDto: BulkDeleteDto, userCompanyId?: string) {
    const { productIds } = bulkDeleteDto;

    // Verify all products belong to the company
    const products = await this.prisma.menuProduct.findMany({
      where: {
        id: { in: productIds },
        ...(userCompanyId && { companyId: userCompanyId })
      }
    });

    if (products.length !== productIds.length) {
      throw new ForbiddenException('Some products do not exist or do not belong to your company');
    }

    const result = await this.prisma.menuProduct.deleteMany({
      where: {
        id: { in: productIds },
        ...(userCompanyId && { companyId: userCompanyId })
      }
    });

    return { deletedCount: result.count };
  }

  // Get categories for filters and management (includes both active and inactive)
  async getCategories(userCompanyId?: string, userRole?: string) {
    // Super admin can see all categories, regular users only their company's
    const shouldFilterByCompany = userRole !== 'super_admin' && userCompanyId;
    
    const categories = await this.prisma.menuCategory.findMany({
      where: {
        ...(shouldFilterByCompany && { companyId: userCompanyId }),
        // Remove isActive filter so we get both active and inactive categories for management
      },
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
        displayNumber: true,
        isActive: true,
        companyId: true
      },
      orderBy: { displayNumber: 'asc' }
    });

    return { categories };
  }

  // Get available tags for filters
  async getTags(userCompanyId?: string) {
    // Get unique tags from all products in the company
    const products = await this.prisma.menuProduct.findMany({
      where: {
        ...(userCompanyId && { companyId: userCompanyId }),
        status: 1
      },
      select: { tags: true }
    });

    // Extract unique tags
    const allTags = products.flatMap(product => product.tags);
    const uniqueTags = [...new Set(allTags)].filter(tag => tag && tag.trim());

    return { tags: uniqueTags.sort() };
  }

  // Create category
  async createCategory(createCategoryDto: CreateCategoryDto, userCompanyId?: string) {
    const { companyId, ...categoryData } = createCategoryDto;
    const effectiveCompanyId = companyId || userCompanyId;
    
    if (!effectiveCompanyId) {
      throw new ForbiddenException('Company ID is required');
    }

    // Get next display number
    const maxDisplayNumber = await this.prisma.menuCategory.aggregate({
      where: { companyId: effectiveCompanyId },
      _max: { displayNumber: true }
    });

    return this.prisma.menuCategory.create({
      data: {
        ...categoryData,
        companyId: effectiveCompanyId,
        displayNumber: (maxDisplayNumber._max.displayNumber || 0) + 1,
        isActive: true // Default to active
      }
    });
  }

  // Get product statistics for dashboard
  async getProductStats(userCompanyId?: string) {
    const where = userCompanyId ? { companyId: userCompanyId } : {};

    const [totalProducts, activeProducts, avgPrice, categoryCount] = await Promise.all([
      this.prisma.menuProduct.count({ where }),
      this.prisma.menuProduct.count({ where: { ...where, status: 1 } }),
      this.prisma.menuProduct.aggregate({
        where,
        _avg: { basePrice: true }
      }),
      this.prisma.menuCategory.count({ where })
    ]);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      avgPrice: avgPrice._avg.basePrice || 0,
      categoryCount
    };
  }

  // Update category
  async updateCategory(id: string, updateCategoryDto: CreateCategoryDto, userCompanyId?: string) {
    const { companyId, ...categoryData } = updateCategoryDto;
    
    // Determine effective company ID for data isolation
    const effectiveCompanyId = userCompanyId || companyId;
    
    if (!effectiveCompanyId) {
      throw new ForbiddenException('Company ID is required');
    }

    // Verify category exists and belongs to user's company
    const existingCategory = await this.prisma.menuCategory.findFirst({
      where: { 
        id, 
        companyId: effectiveCompanyId 
      }
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found or access denied');
    }

    return this.prisma.menuCategory.update({
      where: { id },
      data: categoryData
    });
  }

  // Delete category
  async deleteCategory(id: string, userCompanyId?: string) {
    // Verify category exists and belongs to user's company
    const existingCategory = await this.prisma.menuCategory.findFirst({
      where: { 
        id, 
        ...(userCompanyId && { companyId: userCompanyId })
      }
    });

    if (!existingCategory) {
      throw new NotFoundException('Category not found or access denied');
    }

    // Check if category has products
    const productCount = await this.prisma.menuProduct.count({
      where: { categoryId: id }
    });

    if (productCount > 0) {
      throw new ForbiddenException('Cannot delete category with existing products. Please move or delete products first.');
    }

    return this.prisma.menuCategory.delete({
      where: { id }
    });
  }

  // Get modifier categories for a specific product
  async getProductModifiers(productId: string, userCompanyId?: string) {
    // First verify the product exists and user has access
    const product = await this.prisma.menuProduct.findFirst({
      where: {
        id: productId,
        ...(userCompanyId && { companyId: userCompanyId }),
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get modifier categories associated with this product
    const productModifiers = await this.prisma.productModifierCategory.findMany({
      where: { productId },
      include: {
        modifierCategory: {
          include: {
            modifiers: {
              where: { status: 1 }, // Only active modifiers
              orderBy: { displayNumber: 'asc' },
            },
          },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return {
      categories: productModifiers.map(pm => ({
        ...pm.modifierCategory,
        modifiers: pm.modifierCategory.modifiers.map(modifier => ({
          ...modifier,
          basePrice: Number(modifier.basePrice),
          priority: modifier.displayNumber,
        })),
        priority: pm.displayOrder,
        isRequired: pm.isRequired,
        minSelections: pm.minQuantity,
        maxSelections: pm.maxQuantity,
      })),
    };
  }

  // Save modifier categories for a specific product
  async saveProductModifiers(productId: string, modifierCategoryIds: string[], userCompanyId?: string) {
    // Verify the product exists and user has access
    const product = await this.prisma.menuProduct.findFirst({
      where: {
        id: productId,
        ...(userCompanyId && { companyId: userCompanyId }),
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Remove existing associations
    await this.prisma.productModifierCategory.deleteMany({
      where: { productId },
    });

    // Create new associations
    if (modifierCategoryIds && modifierCategoryIds.length > 0) {
      const associations = modifierCategoryIds.map((categoryId, index) => ({
        productId,
        modifierCategoryId: categoryId,
        displayOrder: index + 1,
        isRequired: false,
        minQuantity: 0,
        maxQuantity: 1,
      }));

      await this.prisma.productModifierCategory.createMany({
        data: associations,
      });
    }

    return { message: 'Product modifiers saved successfully' };
  }

  // Export products to Excel format
  async exportProducts(userCompanyId?: string, userRole?: string) {
    // Super admin can export all products, regular users only their company's
    const where = userRole === 'super_admin' ? {} : { companyId: userCompanyId };

    const products = await this.prisma.menuProduct.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true }
        },
        company: {
          select: { id: true, name: true, slug: true }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Transform data for export
    const exportData = products.map(product => {
      const name = product.name as any;
      const description = product.description as any;
      const categoryName = product.category?.name as any;
      const pricing = product.pricing as any;
      
      return {
        'Product ID': product.id,
        'Name (English)': name?.en || '',
        'Name (Arabic)': name?.ar || '',
        'Description (English)': description?.en || '',
        'Description (Arabic)': description?.ar || '',
        'Category ID': product.categoryId,
        'Category Name': categoryName?.en || categoryName?.ar || '',
        'Base Price': product.basePrice,
        'Talabat Price': pricing?.talabat || product.basePrice,
        'Careem Price': pricing?.careem || product.basePrice,
        'Call Center Price': pricing?.callCenter || product.basePrice,
        'Website Price': pricing?.website || product.basePrice,
        'Status': product.status === 1 ? 'Active' : 'Inactive',
        'Priority': product.priority,
        'Preparation Time': product.preparationTime || '',
        'Tags': Array.isArray(product.tags) ? product.tags.join(', ') : '',
        'Image URL': product.image || '',
        'Company ID': product.companyId,
        'Company Name': product.company?.name || '',
        'Created At': product.createdAt.toISOString(),
        'Updated At': product.updatedAt.toISOString()
      };
    });

    return {
      data: exportData,
      filename: `products-export-${new Date().toISOString().split('T')[0]}.xlsx`,
      totalCount: exportData.length
    };
  }

  // Import products from Excel data
  async importProducts(importData: any[], userCompanyId?: string, userRole?: string) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Validate required company for non-super-admin users
    if (userRole !== 'super_admin' && !userCompanyId) {
      throw new ForbiddenException('Company ID is required');
    }

    // Get all categories for validation
    const categories = await this.prisma.menuCategory.findMany({
      where: userRole === 'super_admin' ? {} : { companyId: userCompanyId },
      select: { id: true, name: true, companyId: true }
    });

    for (let i = 0; i < importData.length; i++) {
      const row = importData[i];
      const rowNumber = i + 2; // Excel rows start from 2 (after header)

      try {
        // Validate required fields
        if (!row['Name (English)'] && !row['Name (Arabic)']) {
          results.errors.push(`Row ${rowNumber}: Name is required in at least one language`);
          results.failed++;
          continue;
        }

        if (!row['Base Price'] || isNaN(parseFloat(row['Base Price']))) {
          results.errors.push(`Row ${rowNumber}: Valid base price is required`);
          results.failed++;
          continue;
        }

        // Determine effective company ID
        let effectiveCompanyId = userCompanyId;
        if (userRole === 'super_admin') {
          effectiveCompanyId = row['Company ID'] || userCompanyId;
        }

        if (!effectiveCompanyId) {
          results.errors.push(`Row ${rowNumber}: Company ID is required`);
          results.failed++;
          continue;
        }

        // Validate category
        let categoryId = row['Category ID'];
        if (!categoryId) {
          // Try to find category by name
          const categoryName = row['Category Name'];
          if (categoryName) {
            const category = categories.find(c => {
              const name = c.name as any;
              return c.companyId === effectiveCompanyId && 
                (name?.en === categoryName || name?.ar === categoryName);
            });
            categoryId = category?.id;
          }
        }

        if (!categoryId) {
          results.errors.push(`Row ${rowNumber}: Valid category is required`);
          results.failed++;
          continue;
        }

        // Validate category belongs to company
        const validCategory = categories.find(c => c.id === categoryId && c.companyId === effectiveCompanyId);
        if (!validCategory) {
          results.errors.push(`Row ${rowNumber}: Category does not belong to the specified company`);
          results.failed++;
          continue;
        }

        // Prepare product data
        const productData = {
          name: {
            ...(row['Name (English)'] && { en: row['Name (English)'] }),
            ...(row['Name (Arabic)'] && { ar: row['Name (Arabic)'] })
          },
          description: {
            ...(row['Description (English)'] && { en: row['Description (English)'] }),
            ...(row['Description (Arabic)'] && { ar: row['Description (Arabic)'] })
          },
          categoryId,
          companyId: effectiveCompanyId,
          basePrice: parseFloat(row['Base Price']),
          pricing: {
            talabat: parseFloat(row['Talabat Price']) || parseFloat(row['Base Price']),
            careem: parseFloat(row['Careem Price']) || parseFloat(row['Base Price']),
            callCenter: parseFloat(row['Call Center Price']) || parseFloat(row['Base Price']),
            website: parseFloat(row['Website Price']) || parseFloat(row['Base Price'])
          },
          status: row['Status'] === 'Active' ? 1 : 0,
          priority: parseInt(row['Priority']) || 999,
          preparationTime: row['Preparation Time'] || null,
          tags: row['Tags'] ? row['Tags'].split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : [],
          image: row['Image URL'] || null,
          images: row['Image URL'] ? [row['Image URL']] : []
        };

        // Check if product already exists (by name and company)
        const existingProduct = await this.prisma.menuProduct.findFirst({
          where: {
            companyId: effectiveCompanyId,
            OR: [
              { name: { path: ['en'], equals: productData.name.en } },
              { name: { path: ['ar'], equals: productData.name.ar } }
            ]
          }
        });

        if (existingProduct) {
          // Update existing product
          await this.prisma.menuProduct.update({
            where: { id: existingProduct.id },
            data: productData as any
          });
        } else {
          // Create new product
          await this.prisma.menuProduct.create({
            data: productData as any
          });
        }

        results.success++;
      } catch (error) {
        results.errors.push(`Row ${rowNumber}: ${error.message}`);
        results.failed++;
      }
    }

    return results;
  }

  // Generate import template with example data
  async generateImportTemplate(userCompanyId?: string, userRole?: string) {
    // Get categories for the template
    const categories = await this.prisma.menuCategory.findMany({
      where: userRole === 'super_admin' ? {} : { companyId: userCompanyId },
      select: { id: true, name: true, companyId: true },
      orderBy: { displayNumber: 'asc' },
      take: 5 // Just get a few categories for the template
    });

    const templateData = [
      {
        'Product ID': '', // Leave empty for new products
        'Name (English)': 'Margherita Pizza',
        'Name (Arabic)': 'بيتزا مارغريتا',
        'Description (English)': 'Classic pizza with tomato sauce, mozzarella cheese, and fresh basil',
        'Description (Arabic)': 'بيتزا كلاسيكية بصلصة الطماطم والموتزاريلا والريحان الطازج',
        'Category ID': categories.length > 0 ? categories[0].id : 'REQUIRED_CATEGORY_ID',
        'Category Name': categories.length > 0 ? (categories[0].name as any)?.en || (categories[0].name as any)?.ar || 'Pizza' : 'Pizza',
        'Base Price': 25.00,
        'Talabat Price': 27.00,
        'Careem Price': 26.50,
        'Call Center Price': 25.00,
        'Website Price': 24.00,
        'Status': 'Active',
        'Priority': 1,
        'Preparation Time': '15-20 minutes',
        'Tags': 'vegetarian, popular, cheese',
        'Image URL': 'https://example.com/images/margherita-pizza.jpg',
        'Company ID': userRole === 'super_admin' ? 'COMPANY_ID_IF_SUPER_ADMIN' : (userCompanyId || 'AUTO_ASSIGNED'),
        'Company Name': 'Your Restaurant Name',
        'Created At': '', // Auto-generated
        'Updated At': '', // Auto-generated
      },
      {
        'Product ID': '', 
        'Name (English)': 'Chicken Burger',
        'Name (Arabic)': 'برجر الدجاج',
        'Description (English)': 'Grilled chicken breast with lettuce, tomato, and mayo',
        'Description (Arabic)': 'صدر دجاج مشوي مع الخس والطماطم والمايونيز',
        'Category ID': categories.length > 1 ? categories[1].id : categories.length > 0 ? categories[0].id : 'REQUIRED_CATEGORY_ID',
        'Category Name': categories.length > 1 ? (categories[1].name as any)?.en || (categories[1].name as any)?.ar || 'Burgers' : 'Burgers',
        'Base Price': 18.00,
        'Talabat Price': 20.00,
        'Careem Price': 19.50,
        'Call Center Price': 18.00,
        'Website Price': 17.00,
        'Status': 'Active',
        'Priority': 2,
        'Preparation Time': '12-15 minutes',
        'Tags': 'chicken, burger, grilled',
        'Image URL': 'https://example.com/images/chicken-burger.jpg',
        'Company ID': userRole === 'super_admin' ? 'COMPANY_ID_IF_SUPER_ADMIN' : (userCompanyId || 'AUTO_ASSIGNED'),
        'Company Name': 'Your Restaurant Name',
        'Created At': '',
        'Updated At': '',
      },
      {
        'Product ID': '', 
        'Name (English)': 'Caesar Salad',
        'Name (Arabic)': 'سلطة سيزر',
        'Description (English)': 'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan',
        'Description (Arabic)': 'خس روماني طازج مع صلصة سيزر والخبز المحمص والبارميزان',
        'Category ID': categories.length > 2 ? categories[2].id : categories.length > 0 ? categories[0].id : 'REQUIRED_CATEGORY_ID',
        'Category Name': categories.length > 2 ? (categories[2].name as any)?.en || (categories[2].name as any)?.ar || 'Salads' : 'Salads',
        'Base Price': 12.00,
        'Talabat Price': 14.00,
        'Careem Price': 13.50,
        'Call Center Price': 12.00,
        'Website Price': 11.50,
        'Status': 'Active',
        'Priority': 3,
        'Preparation Time': '5-8 minutes',
        'Tags': 'healthy, vegetarian, salad',
        'Image URL': 'https://example.com/images/caesar-salad.jpg',
        'Company ID': userRole === 'super_admin' ? 'COMPANY_ID_IF_SUPER_ADMIN' : (userCompanyId || 'AUTO_ASSIGNED'),
        'Company Name': 'Your Restaurant Name',
        'Created At': '',
        'Updated At': '',
      }
    ];

    return {
      data: templateData,
      filename: `products-import-template-${new Date().toISOString().split('T')[0]}.xlsx`,
      instructions: {
        'Required Fields': ['Name (English) OR Name (Arabic)', 'Base Price', 'Category ID OR Category Name'],
        'Status Options': ['Active', 'Inactive'],
        'Priority': 'Lower numbers appear first (1 = top priority)',
        'Tags': 'Separate multiple tags with commas',
        'Pricing': 'If platform prices are empty, Base Price will be used',
        'Company ID': userRole === 'super_admin' ? 'Required for super admin users' : 'Auto-assigned to your company',
        'Product ID': 'Leave empty for new products, provide ID to update existing products',
        'Categories': categories.map(cat => `${cat.id}: ${(cat.name as any)?.en || (cat.name as any)?.ar || 'Category'}`),
        'Image URL': 'Optional - provide direct image URLs',
        'Date Fields': 'Created At and Updated At are auto-generated, leave empty'
      }
    };
  }

  /**
   * Get product with enhanced tax calculations
   */
  async getProductWithTaxCalculations(id: string, userCompanyId?: string, platform?: string) {
    const product = await this.getProduct(id, userCompanyId);

    try {
      // Get base pricing for the platform or use base price
      const basePricing = product.pricing as Record<string, number> || {};
      const platformPrice = platform ? basePricing[platform] : undefined;
      const effectivePrice = platformPrice || Number(product.basePrice);

      // Calculate tax for the specific price
      const taxResult = await this.taxesService.calculateProductTax(
        product.id,
        {
          basePrice: effectivePrice,
          platformPricing: basePricing,
          companyId: product.companyId,
        }
      );

      return {
        ...product,
        basePrice: Number(product.basePrice),
        cost: Number(product.cost),
        taxCalculations: taxResult,
        pricingWithTax: await this.taxesService.enhancePricingWithTax(
          product.id,
          basePricing,
          product.companyId
        ),
      };
    } catch (error) {
      console.warn(`Tax calculation failed for product ${id}:`, error.message);
      return {
        ...product,
        basePrice: Number(product.basePrice),
        cost: Number(product.cost),
      };
    }
  }

  /**
   * Create product with automatic tax assignment
   */
  async createProductWithTax(createProductDto: CreateProductDto, userCompanyId?: string, autoAssignTax: boolean = true) {
    const product = await this.createProduct(createProductDto, userCompanyId);

    if (autoAssignTax) {
      try {
        // Check if company has default tax settings
        const taxSettings = await this.taxesService.getCompanyTaxSettings(product.companyId);

        if (taxSettings.autoApplyDefaultTax && taxSettings.defaultTaxId) {
          // Assign default tax to the new product
          await this.taxesService.assignTaxToProduct(taxSettings.defaultTaxId, product.id);
        }
      } catch (error) {
        console.warn(`Auto tax assignment failed for product ${product.id}:`, error.message);
      }
    }

    return product;
  }

  /**
   * Update product pricing with tax recalculation
   */
  async updateProductPricingWithTax(
    id: string,
    newPricing: Record<string, number>,
    userCompanyId?: string
  ) {
    const product = await this.getProduct(id, userCompanyId);

    // Update the product pricing
    const updatedProduct = await this.prisma.menuProduct.update({
      where: { id },
      data: {
        pricing: newPricing as any,
        basePrice: newPricing.base || product.basePrice,
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      }
    });

    // Return with enhanced tax calculations
    return this.getProductWithTaxCalculations(id, userCompanyId);
  }

  /**
   * Get menu products for receipt/thermal printing with tax breakdown
   */
  async getProductsForReceipt(
    productIds: string[],
    quantities: Record<string, number>,
    modifierData: Record<string, Array<{ modifierId: string; price: number }>>,
    companyId: string
  ) {
    const products = await this.prisma.menuProduct.findMany({
      where: {
        id: { in: productIds },
        companyId,
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      }
    });

    const orderItems = products.map(product => ({
      productId: product.id,
      quantity: quantities[product.id] || 1,
      unitPrice: Number(product.basePrice),
      modifiers: modifierData[product.id] || [],
    }));

    // Generate receipt tax summary
    const receiptData = await this.taxesService.generateReceiptTaxSummary(
      orderItems,
      companyId
    );

    return {
      products: products.map(p => ({
        ...p,
        basePrice: Number(p.basePrice),
        cost: Number(p.cost),
      })),
      receiptData,
    };
  }

  /**
   * Bulk assign tax to multiple products
   */
  async bulkAssignTaxToProducts(
    productIds: string[],
    taxId: string,
    userCompanyId?: string
  ) {
    // Verify all products belong to the user's company
    const products = await this.prisma.menuProduct.findMany({
      where: {
        id: { in: productIds },
        ...(userCompanyId && { companyId: userCompanyId })
      },
      select: { id: true, companyId: true }
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found or do not belong to your company');
    }

    // Verify tax belongs to the same company
    const tax = await this.prisma.tax.findFirst({
      where: {
        id: taxId,
        companyId: products[0].companyId
      }
    });

    if (!tax) {
      throw new NotFoundException('Tax not found or does not belong to your company');
    }

    // Create tax assignments
    const assignments = productIds.map(productId => ({
      taxId,
      productId,
    }));

    const result = await this.prisma.taxableProduct.createMany({
      data: assignments,
      skipDuplicates: true,
    });

    return {
      message: `Tax assigned to ${result.count} products`,
      assignedCount: result.count,
      skippedCount: productIds.length - result.count,
    };
  }

  /**
   * Get products with Jordan VAT compliance information
   */
  async getProductsWithJordanVAT(userCompanyId?: string, limit: number = 50) {
    const products = await this.prisma.menuProduct.findMany({
      where: {
        ...(userCompanyId && { companyId: userCompanyId }),
        deletedAt: null,
      },
      include: {
        category: {
          select: { id: true, name: true }
        },
        taxableProducts: {
          include: {
            tax: {
              select: {
                id: true,
                name: true,
                percentage: true,
                taxType: true,
                taxCode: true,
              }
            }
          }
        }
      },
      take: limit,
      orderBy: { priority: 'asc' },
    });

    const enhancedProducts = await Promise.all(
      products.map(async (product) => {
        const basePrice = Number(product.basePrice);

        // Calculate Jordan VAT
        const jordanVAT = await this.taxesService.calculateJordanVAT(basePrice, true);

        // Check if product has Jordan VAT tax assigned
        const hasJordanVAT = product.taxableProducts.some(
          tp => tp.tax.percentage === 16 &&
               (tp.tax.taxCode === 'VAT-JO' ||
                (typeof tp.tax.name === 'object' && tp.tax.name &&
                 (tp.tax.name as any).en?.toLowerCase().includes('jordan')))
        );

        return {
          ...product,
          basePrice,
          cost: Number(product.cost),
          jordanVATCalculation: jordanVAT,
          hasJordanVATAssigned: hasJordanVAT,
          assignedTaxes: product.taxableProducts.map(tp => ({
            id: tp.tax.id,
            name: tp.tax.name,
            percentage: tp.tax.percentage,
            type: tp.tax.taxType,
            code: tp.tax.taxCode,
          })),
        };
      })
    );

    return {
      products: enhancedProducts,
      jordanVATCompliance: {
        totalProducts: enhancedProducts.length,
        productsWithJordanVAT: enhancedProducts.filter(p => p.hasJordanVATAssigned).length,
        vatRate: '16%',
        compliancePercentage: enhancedProducts.length > 0
          ? (enhancedProducts.filter(p => p.hasJordanVATAssigned).length / enhancedProducts.length) * 100
          : 0,
      },
    };
  }
}