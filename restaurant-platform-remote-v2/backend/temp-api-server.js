const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const port = 3001;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:E$$athecode006@localhost:5432/postgres'
    }
  }
});

// Channel Management Services
class ChannelService {
  async getDeliveryChannels() {
    return prisma.deliveryChannel.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: [
        { isSystemDefault: 'desc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        channelType: true,
        providerName: true,
        apiBaseUrl: true,
        webhookUrl: true,
        authType: true,
        isActive: true,
        isSystemDefault: true,
        configuration: true,
        supportedFeatures: true,
        rateLimits: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }
}

class CompanyChannelAssignmentService {
  async getCompanyChannelAssignments(companyId) {
    return prisma.companyChannelAssignment.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            channelType: true,
            providerName: true,
            supportedFeatures: true,
            isActive: true,
          }
        },
        platformMenuAssignments: {
          where: { deletedAt: null },
          include: {
            platformMenu: {
              select: {
                id: true,
                name: true,
                platformType: true,
              }
            }
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async createChannelAssignment(data) {
    // Check if assignment already exists
    const existing = await prisma.companyChannelAssignment.findFirst({
      where: {
        companyId: data.companyId,
        channelId: data.channelId,
        deletedAt: null,
      }
    });

    if (existing) {
      throw new Error('Channel assignment already exists for this company');
    }

    return prisma.companyChannelAssignment.create({
      data: {
        ...data,
        credentials: data.credentials || {},
        channelSettings: data.channelSettings || {},
        isEnabled: data.isEnabled ?? true,
        priority: data.priority ?? 0,
        syncEnabled: data.syncEnabled ?? true,
        autoSyncInterval: data.autoSyncInterval ?? 15,
      },
      include: {
        channel: true
      }
    });
  }

  async updateChannelAssignment(id, companyId, data) {
    const result = await prisma.companyChannelAssignment.updateMany({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      data
    });

    if (result.count === 0) {
      throw new Error('Channel assignment not found');
    }

    return prisma.companyChannelAssignment.findFirst({
      where: { id, companyId },
      include: { channel: true }
    });
  }

  async deleteChannelAssignment(id, companyId, deletedBy) {
    const result = await prisma.companyChannelAssignment.updateMany({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      }
    });

    if (result.count === 0) {
      throw new Error('Channel assignment not found');
    }

    return { success: true };
  }

  async getSyncStatus(assignmentId, companyId) {
    const assignment = await prisma.companyChannelAssignment.findFirst({
      where: {
        id: assignmentId,
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        syncStatus: true,
        lastSyncAt: true,
        syncErrorMessage: true,
        syncRetryCount: true,
        syncLogs: {
          take: 1,
          orderBy: { startedAt: 'desc' },
          select: {
            status: true,
            startedAt: true,
            completedAt: true,
            itemsProcessed: true,
            itemsTotal: true,
            errors: true,
          }
        }
      }
    });

    if (!assignment) {
      throw new Error('Channel assignment not found');
    }

    return {
      assignmentId: assignment.id,
      currentStatus: assignment.syncStatus,
      lastSyncAt: assignment.lastSyncAt,
      errorMessage: assignment.syncErrorMessage,
      retryCount: assignment.syncRetryCount,
      lastSyncLog: assignment.syncLogs[0] || null,
    };
  }
}

class ChannelSyncService {
  async triggerMenuSync(assignmentId, companyId, triggeredBy) {
    // Create a sync log entry
    const syncLog = await prisma.channelSyncLog.create({
      data: {
        companyChannelAssignmentId: assignmentId,
        syncType: 'manual',
        status: 'pending',
        startedAt: new Date(),
        itemsProcessed: 0,
        itemsTotal: 0,
      }
    });

    // Update assignment status
    await prisma.companyChannelAssignment.updateMany({
      where: { id: assignmentId, companyId },
      data: { syncStatus: 'in_progress' }
    });

    // Simulate sync completion after a short delay
    setTimeout(async () => {
      try {
        await prisma.channelSyncLog.update({
          where: { id: syncLog.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            itemsProcessed: 100,
            itemsTotal: 100,
          }
        });

        await prisma.companyChannelAssignment.updateMany({
          where: { id: assignmentId, companyId },
          data: {
            syncStatus: 'completed',
            lastSyncAt: new Date(),
            syncErrorMessage: null,
            syncRetryCount: 0,
          }
        });
      } catch (error) {
        console.error('Sync completion error:', error);
      }
    }, 2000);

    return {
      syncLogId: syncLog.id,
      message: 'Menu sync started successfully',
    };
  }

  async getSyncLogs(assignmentId, companyId, limit = 20) {
    return prisma.channelSyncLog.findMany({
      where: {
        companyChannelAssignmentId: assignmentId,
        companyChannelAssignment: { companyId }
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        syncType: true,
        status: true,
        startedAt: true,
        completedAt: true,
        itemsProcessed: true,
        itemsTotal: true,
        errors: true,
      }
    });
  }
}

// Service instances
const channelService = new ChannelService();
const companyChannelAssignmentService = new CompanyChannelAssignmentService();
const channelSyncService = new ChannelSyncService();

// Middleware
app.use(cors());
app.use(express.json());

// Simple JWT validation (for testing purposes)
function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  // For now, just check if token exists
  req.user = {
    id: '53d9d9d8-a4c8-4e22-b17b-cbb99e5dfc52',
    companyId: 'fa4e1a71-a91a-4b06-9288-142dfbbef63d',
    role: 'super_admin'
  };
  next();
}

// Platform menu endpoint
app.get('/api/platforms/menu-platforms', validateToken, async (req, res) => {
  try {
    const whereClause = {
      companyId: req.user.companyId,
      deletedAt: null
    };

    const platformMenus = await prisma.platformMenu.findMany({
      where: whereClause,
      include: {
        items: {
          where: { deletedAt: null },
          select: { id: true, isAvailable: true }
        },
        _count: {
          select: {
            items: {
              where: { deletedAt: null }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match frontend expectations
    const platforms = platformMenus.map(menu => ({
      id: menu.id,
      name: menu.name,
      displayName: menu.name,
      platformType: menu.platformType,
      status: menu.isActive ? 1 : 0,
      configuration: menu.settings || {},
      isSystemDefault: false,
      sortOrder: menu.priority || 0,
      companyId: menu.companyId,
      _count: {
        productPlatformAssignments: menu._count.items || 0
      }
    }));

    const response = {
      platforms,
      totalCount: platforms.length,
      permissions: {
        canCreate: true,
        canEdit: true,
        canDelete: true
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching platform menus:', error);
    res.status(500).json({
      error: 'Failed to fetch platform menus',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'temp-platform-api' });
});

// Categories endpoint (in case frontend needs it)
app.get('/api/menu/categories', validateToken, async (req, res) => {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: {
        companyId: req.user.companyId,
        deletedAt: null
      },
      orderBy: { displayNumber: 'asc' }
    });

    res.json({ categories, totalCount: categories.length });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      error: 'Failed to fetch categories',
      details: error.message
    });
  }
});

// Tags endpoint for filters
app.get('/api/menu/tags', validateToken, async (req, res) => {
  try {
    // Get unique tags from all products
    const products = await prisma.menuProduct.findMany({
      where: {
        companyId: req.user.companyId,
        deletedAt: null
      },
      select: { tags: true }
    });

    const allTags = products.flatMap(p => p.tags || []);
    const uniqueTags = [...new Set(allTags)].filter(tag => tag && tag.trim());

    res.json({ tags: uniqueTags, totalCount: uniqueTags.length });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      error: 'Failed to fetch tags',
      details: error.message
    });
  }
});

// Platforms endpoint for filters and management
app.get('/api/menu/platforms', validateToken, async (req, res) => {
  try {
    const platforms = await prisma.platformMenu.findMany({
      where: {
        companyId: req.user.companyId,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        description: true,
        platformType: true,
        priority: true,
        status: true,
        isActive: true
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    res.json({ platforms, totalCount: platforms.length });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({
      error: 'Failed to fetch platforms',
      details: error.message
    });
  }
});

// Critical: Paginated products endpoint for VirtualizedProductGrid
app.post('/api/menu/products/paginated', validateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      categoryId,
      status,
      sortBy = 'priority',
      sortOrder = 'asc',
      tags = []
    } = req.body;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {
      companyId: req.user.companyId,
      deletedAt: null
    };

    if (search) {
      // Search in product names (JSONB field)
      whereClause.OR = [
        { name: { path: ['en'], string_contains: search } },
        { name: { path: ['ar'], string_contains: search } }
      ];
    }

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (status !== undefined) {
      whereClause.status = status;
    }

    if (tags && tags.length > 0) {
      whereClause.tags = { hasSome: tags };
    }

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Get products with pagination
    const [products, totalCount] = await Promise.all([
      prisma.menuProduct.findMany({
        where: whereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              displayNumber: true
            }
          },
          platformMenuItems: {
            where: { deletedAt: null },
            include: {
              platformMenu: {
                select: {
                  id: true,
                  name: true,
                  platformType: true
                }
              }
            }
          }
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.menuProduct.count({ where: whereClause })
    ]);

    // Transform products to match frontend expectations
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.image,
      images: product.images || [],
      basePrice: product.basePrice,
      pricing: product.pricing,
      status: product.status,
      priority: product.priority,
      preparationTime: product.preparationTime,
      tags: product.tags || [],
      category: product.category,
      platforms: product.platformMenuItems.map(item => ({
        id: item.platformMenu.id,
        name: item.platformMenu.name,
        platformType: item.platformMenu.platformType,
        isAvailable: item.isAvailable
      })),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      products: transformedProducts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      filters: {
        search,
        categoryId,
        status,
        tags,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Error fetching paginated products:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      details: error.message
    });
  }
});

// Individual platform details endpoint
app.get('/api/menu/platforms/:platformId', validateToken, async (req, res) => {
  try {
    const { platformId } = req.params;

    const platform = await prisma.platformMenu.findUnique({
      where: {
        id: platformId,
        companyId: req.user.companyId,
        deletedAt: null
      },
      include: {
        items: {
          where: { deletedAt: null },
          select: { id: true, isAvailable: true }
        },
        _count: {
          select: {
            items: {
              where: { deletedAt: null }
            }
          }
        }
      }
    });

    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    // Transform to match frontend expectations
    const transformedPlatform = {
      id: platform.id,
      name: platform.name,
      displayName: platform.name,
      platformType: platform.platformType,
      status: platform.isActive ? 1 : 0,
      configuration: platform.settings || {},
      isSystemDefault: false,
      sortOrder: platform.priority || 0,
      companyId: platform.companyId,
      _count: {
        productPlatformAssignments: platform._count.items || 0
      }
    };

    res.json(transformedPlatform);
  } catch (error) {
    console.error('Error fetching platform:', error);
    res.status(500).json({
      error: 'Failed to fetch platform',
      details: error.message
    });
  }
});

// Get products assigned to a platform
app.get('/api/menu/platforms/:platformId/products', validateToken, async (req, res) => {
  try {
    const { platformId } = req.params;

    // Verify platform exists and belongs to user's company
    const platform = await prisma.platformMenu.findFirst({
      where: {
        id: platformId,
        companyId: req.user.companyId,
        deletedAt: null
      }
    });

    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    // Get all products assigned to this platform
    const platformItems = await prisma.platformMenuItem.findMany({
      where: {
        platformMenuId: platformId,
        deletedAt: null
      },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                displayNumber: true
              }
            }
          }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    // Transform products to match frontend expectations
    const products = platformItems.map(item => ({
      id: item.product.id,
      name: item.product.name,
      description: item.product.description,
      image: item.product.image,
      images: item.product.images || [],
      basePrice: item.product.basePrice,
      pricing: item.product.pricing,
      status: item.product.status,
      priority: item.displayOrder || item.product.priority,
      preparationTime: item.product.preparationTime,
      tags: item.product.tags || [],
      category: item.product.category,
      isAvailable: item.isAvailable,
      createdAt: item.product.createdAt,
      updatedAt: item.product.updatedAt
    }));

    res.json({
      products,
      totalCount: products.length,
      platformId,
      platformName: platform.name
    });
  } catch (error) {
    console.error('Error fetching platform products:', error);
    res.status(500).json({
      error: 'Failed to fetch platform products',
      details: error.message
    });
  }
});

// Add products to platform menu
app.post('/api/menu/platforms/:platformId/products', validateToken, async (req, res) => {
  try {
    const { platformId } = req.params;
    const { productIds, branchId } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    // Verify platform exists and belongs to user's company
    const platform = await prisma.platformMenu.findFirst({
      where: {
        id: platformId,
        companyId: req.user.companyId,
        deletedAt: null
      }
    });

    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    // Verify all products exist and belong to user's company
    const products = await prisma.menuProduct.findMany({
      where: {
        id: { in: productIds },
        companyId: req.user.companyId,
        deletedAt: null
      }
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'One or more products not found' });
    }

    // Get highest priority for ordering
    const maxPriorityItem = await prisma.platformMenuItem.findFirst({
      where: {
        platformMenuId: platformId,
        deletedAt: null
      },
      orderBy: { displayOrder: 'desc' }
    });

    let nextPriority = (maxPriorityItem?.displayOrder || 0) + 1;

    // Create platform menu items
    const createdItems = await Promise.all(
      productIds.map(async (productId) => {
        // Check if already exists (including soft-deleted records)
        const existingItem = await prisma.platformMenuItem.findFirst({
          where: {
            platformMenuId: platformId,
            productId: productId
          }
        });

        if (existingItem) {
          // If item exists but is soft-deleted, restore it
          if (existingItem.deletedAt) {
            return await prisma.platformMenuItem.update({
              where: { id: existingItem.id },
              data: {
                deletedAt: null,
                displayOrder: nextPriority++,
                isAvailable: true,
                updatedAt: new Date()
              }
            });
          }
          // If item exists and is not deleted, return existing
          return existingItem;
        }

        // Create new platform menu item
        return await prisma.platformMenuItem.create({
          data: {
            platformMenuId: platformId,
            productId: productId,
            displayOrder: nextPriority++,
            isAvailable: true,
            platformSpecificData: {}
          }
        });
      })
    );

    res.json({
      success: true,
      message: `${productIds.length} products added to platform menu`,
      addedItems: createdItems.length,
      platformId,
      productIds
    });
  } catch (error) {
    console.error('Error adding products to platform:', error);
    res.status(500).json({
      error: 'Failed to add products to platform',
      details: error.message
    });
  }
});

// Remove products from platform menu
app.delete('/api/menu/platforms/:platformId/products', validateToken, async (req, res) => {
  try {
    const { platformId } = req.params;
    const { productIds, branchId } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    // Verify platform exists and belongs to user's company
    const platform = await prisma.platformMenu.findFirst({
      where: {
        id: platformId,
        companyId: req.user.companyId,
        deletedAt: null
      }
    });

    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    // Soft delete platform menu items
    const deletedItems = await prisma.platformMenuItem.updateMany({
      where: {
        platformMenuId: platformId,
        productId: { in: productIds },
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `${deletedItems.count} products removed from platform menu`,
      removedCount: deletedItems.count,
      platformId,
      productIds
    });
  } catch (error) {
    console.error('Error removing products from platform:', error);
    res.status(500).json({
      error: 'Failed to remove products from platform',
      details: error.message
    });
  }
});

// Reorder products in platform menu
app.put('/api/menu/platforms/:platformId/products/reorder', validateToken, async (req, res) => {
  try {
    const { platformId } = req.params;
    const { productIds, branchId } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    // Verify platform exists and belongs to user's company
    const platform = await prisma.platformMenu.findFirst({
      where: {
        id: platformId,
        companyId: req.user.companyId,
        deletedAt: null
      }
    });

    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    // Update priority for each product in the specified order
    const updatePromises = productIds.map(async (productId, index) => {
      return await prisma.platformMenuItem.updateMany({
        where: {
          platformMenuId: platformId,
          productId: productId,
          deletedAt: null
        },
        data: {
          displayOrder: index + 1
        }
      });
    });

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Menu order updated for ${productIds.length} products`,
      platformId,
      newOrder: productIds
    });
  } catch (error) {
    console.error('Error reordering platform products:', error);
    res.status(500).json({
      error: 'Failed to reorder platform products',
      details: error.message
    });
  }
});

// ================================================================
// CHANNEL ASSIGNMENT SYSTEM API ENDPOINTS
// ================================================================

// 1. Get all available delivery channels
app.get('/api/channels/delivery-channels', validateToken, async (req, res) => {
  try {
    const channels = await channelService.getDeliveryChannels();

    res.json({
      channels,
      totalCount: channels.length
    });
  } catch (error) {
    console.error('Error fetching delivery channels:', error);
    res.status(500).json({
      error: 'Failed to fetch delivery channels',
      details: error.message
    });
  }
});

// 2. Get company's channel assignments
app.get('/api/channels/company-assignments', validateToken, async (req, res) => {
  try {
    const assignments = await companyChannelAssignmentService.getCompanyChannelAssignments(req.user.companyId);

    res.json({
      assignments,
      totalCount: assignments.length
    });
  } catch (error) {
    console.error('Error fetching company channel assignments:', error);
    res.status(500).json({
      error: 'Failed to fetch channel assignments',
      details: error.message
    });
  }
});

// 3. Create company channel assignment
app.post('/api/channels/company-assignments', validateToken, async (req, res) => {
  try {
    const {
      channelId,
      isEnabled = true,
      priority = 0,
      credentials = {},
      channelSettings = {},
      syncEnabled = true,
      autoSyncInterval = 15
    } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    const assignment = await companyChannelAssignmentService.createChannelAssignment({
      companyId: req.user.companyId,
      channelId,
      isEnabled,
      priority,
      credentials,
      channelSettings,
      syncEnabled,
      autoSyncInterval,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Channel assigned to company successfully',
      assignment
    });
  } catch (error) {
    console.error('Error creating company channel assignment:', error);

    if (error.message === 'Channel assignment already exists for this company') {
      return res.status(409).json({
        error: 'Channel assignment already exists',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to create channel assignment',
      details: error.message
    });
  }
});

// 4. Update company channel assignment
app.put('/api/channels/company-assignments/:assignmentId', validateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const {
      isEnabled,
      priority,
      credentials,
      channelSettings,
      syncEnabled,
      autoSyncInterval
    } = req.body;

    const updatedAssignment = await companyChannelAssignmentService.updateChannelAssignment(
      assignmentId,
      req.user.companyId,
      {
        isEnabled,
        priority,
        credentials,
        channelSettings,
        syncEnabled,
        autoSyncInterval,
        updatedBy: req.user.id
      }
    );

    res.json({
      success: true,
      message: 'Channel assignment updated successfully',
      assignment: updatedAssignment
    });
  } catch (error) {
    console.error('Error updating company channel assignment:', error);

    if (error.message === 'Channel assignment not found') {
      return res.status(404).json({
        error: 'Assignment not found',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to update channel assignment',
      details: error.message
    });
  }
});

// 5. Delete company channel assignment
app.delete('/api/channels/company-assignments/:assignmentId', validateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    await companyChannelAssignmentService.deleteChannelAssignment(
      assignmentId,
      req.user.companyId,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Channel assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting company channel assignment:', error);

    if (error.message === 'Channel assignment not found') {
      return res.status(404).json({
        error: 'Assignment not found',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to delete channel assignment',
      details: error.message
    });
  }
});

// 6. Get platform menu channel assignments
app.get('/api/channels/platform-menu-assignments', validateToken, async (req, res) => {
  try {
    const { platformMenuId, branchId } = req.query;

    const whereClause = {
      companyChannelAssignment: {
        companyId: req.user.companyId,
        deletedAt: null
      },
      deletedAt: null
    };

    if (platformMenuId) {
      whereClause.platformMenuId = platformMenuId;
    }

    if (branchId) {
      whereClause.branchId = branchId;
    }

    const assignments = await prisma.platformMenuChannelAssignment.findMany({
      where: whereClause,
      include: {
        platformMenu: {
          select: {
            id: true,
            name: true,
            platformType: true,
            status: true
          }
        },
        companyChannelAssignment: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
                slug: true,
                channelType: true,
                providerName: true
              }
            }
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    res.json({
      assignments,
      totalCount: assignments.length
    });
  } catch (error) {
    console.error('Error fetching platform menu channel assignments:', error);
    res.status(500).json({
      error: 'Failed to fetch platform menu assignments',
      details: error.message
    });
  }
});

// 7. Assign platform menu to channel
app.post('/api/channels/platform-menu-assignments', validateToken, async (req, res) => {
  try {
    const {
      platformMenuId,
      companyChannelAssignmentId,
      branchId = null,
      isActive = true,
      syncEnabled = true,
      channelSpecificSettings = {},
      displayOrder = 0
    } = req.body;

    if (!platformMenuId || !companyChannelAssignmentId) {
      return res.status(400).json({
        error: 'platformMenuId and companyChannelAssignmentId are required'
      });
    }

    // Verify platform menu exists and belongs to company
    const platformMenu = await prisma.platformMenu.findFirst({
      where: {
        id: platformMenuId,
        companyId: req.user.companyId,
        deletedAt: null
      }
    });

    if (!platformMenu) {
      return res.status(404).json({ error: 'Platform menu not found' });
    }

    // Verify company channel assignment exists and belongs to company
    const companyChannelAssignment = await prisma.companyChannelAssignment.findFirst({
      where: {
        id: companyChannelAssignmentId,
        companyId: req.user.companyId,
        deletedAt: null
      }
    });

    if (!companyChannelAssignment) {
      return res.status(404).json({ error: 'Company channel assignment not found' });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.platformMenuChannelAssignment.findFirst({
      where: {
        platformMenuId,
        companyChannelAssignmentId,
        deletedAt: null
      }
    });

    if (existingAssignment) {
      return res.status(409).json({
        error: 'Platform menu already assigned to this channel'
      });
    }

    const assignment = await prisma.platformMenuChannelAssignment.create({
      data: {
        platformMenuId,
        companyChannelAssignmentId,
        branchId,
        isActive,
        syncEnabled,
        channelSpecificSettings,
        displayOrder,
        createdBy: req.user.id
      },
      include: {
        platformMenu: {
          select: {
            id: true,
            name: true,
            platformType: true
          }
        },
        companyChannelAssignment: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
                slug: true,
                channelType: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Platform menu assigned to channel successfully',
      assignment
    });
  } catch (error) {
    console.error('Error creating platform menu channel assignment:', error);
    res.status(500).json({
      error: 'Failed to assign platform menu to channel',
      details: error.message
    });
  }
});

// 8. Update platform menu channel assignment
app.put('/api/channels/platform-menu-assignments/:assignmentId', validateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const {
      isActive,
      syncEnabled,
      channelSpecificSettings,
      displayOrder
    } = req.body;

    // Verify assignment exists and belongs to company
    const existingAssignment = await prisma.platformMenuChannelAssignment.findFirst({
      where: {
        id: assignmentId,
        companyChannelAssignment: {
          companyId: req.user.companyId
        },
        deletedAt: null
      }
    });

    if (!existingAssignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const updatedAssignment = await prisma.platformMenuChannelAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(syncEnabled !== undefined && { syncEnabled }),
        ...(channelSpecificSettings !== undefined && { channelSpecificSettings }),
        ...(displayOrder !== undefined && { displayOrder }),
        updatedAt: new Date(),
        updatedBy: req.user.id
      },
      include: {
        platformMenu: {
          select: {
            id: true,
            name: true,
            platformType: true
          }
        },
        companyChannelAssignment: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
                slug: true,
                channelType: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Platform menu channel assignment updated successfully',
      assignment: updatedAssignment
    });
  } catch (error) {
    console.error('Error updating platform menu channel assignment:', error);
    res.status(500).json({
      error: 'Failed to update assignment',
      details: error.message
    });
  }
});

// 9. Remove platform menu from channel
app.delete('/api/channels/platform-menu-assignments/:assignmentId', validateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // Verify assignment exists and belongs to company
    const existingAssignment = await prisma.platformMenuChannelAssignment.findFirst({
      where: {
        id: assignmentId,
        companyChannelAssignment: {
          companyId: req.user.companyId
        },
        deletedAt: null
      }
    });

    if (!existingAssignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Soft delete the assignment
    await prisma.platformMenuChannelAssignment.update({
      where: { id: assignmentId },
      data: {
        deletedAt: new Date(),
        updatedBy: req.user.id
      }
    });

    res.json({
      success: true,
      message: 'Platform menu removed from channel successfully'
    });
  } catch (error) {
    console.error('Error removing platform menu from channel:', error);
    res.status(500).json({
      error: 'Failed to remove assignment',
      details: error.message
    });
  }
});

// 10. Trigger menu sync to channel
app.post('/api/channels/sync/menu/:assignmentId', validateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { syncType = 'menu_sync', force = false } = req.body;

    // Verify assignment exists and belongs to company
    const assignment = await prisma.platformMenuChannelAssignment.findFirst({
      where: {
        id: assignmentId,
        companyChannelAssignment: {
          companyId: req.user.companyId
        },
        deletedAt: null
      },
      include: {
        platformMenu: true,
        companyChannelAssignment: {
          include: {
            channel: true
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (!assignment.syncEnabled) {
      return res.status(400).json({ error: 'Sync is disabled for this assignment' });
    }

    // Create sync log entry
    const syncLog = await prisma.channelSyncLog.create({
      data: {
        companyChannelAssignmentId: assignment.companyChannelAssignmentId,
        platformMenuChannelAssignmentId: assignment.id,
        syncType,
        syncDirection: 'push',
        syncStatus: 'started',
        startedAt: new Date()
      }
    });

    // Update assignment sync status
    await prisma.platformMenuChannelAssignment.update({
      where: { id: assignmentId },
      data: {
        menuSyncStatus: 'syncing',
        updatedAt: new Date()
      }
    });

    // Here you would trigger the actual sync process
    // For now, we'll simulate a successful sync
    setTimeout(async () => {
      try {
        // Update sync log as completed
        await prisma.channelSyncLog.update({
          where: { id: syncLog.id },
          data: {
            syncStatus: 'completed',
            completedAt: new Date(),
            durationMs: 2000,
            recordsProcessed: 1,
            recordsSuccess: 1,
            recordsFailed: 0
          }
        });

        // Update assignment sync status
        await prisma.platformMenuChannelAssignment.update({
          where: { id: assignmentId },
          data: {
            menuSyncStatus: 'success',
            lastMenuSyncAt: new Date(),
            updatedAt: new Date()
          }
        });
      } catch (error) {
        console.error('Error updating sync status:', error);
      }
    }, 2000);

    res.json({
      success: true,
      message: 'Menu sync initiated successfully',
      syncId: syncLog.id,
      status: 'started'
    });
  } catch (error) {
    console.error('Error initiating menu sync:', error);
    res.status(500).json({
      error: 'Failed to initiate menu sync',
      details: error.message
    });
  }
});

// 11. Get sync logs
app.get('/api/channels/sync/logs', validateToken, async (req, res) => {
  try {
    const {
      assignmentId,
      syncType,
      syncStatus,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;

    const whereClause = {
      companyChannelAssignment: {
        companyId: req.user.companyId
      }
    };

    if (assignmentId) {
      whereClause.OR = [
        { companyChannelAssignmentId: assignmentId },
        { platformMenuChannelAssignmentId: assignmentId }
      ];
    }

    if (syncType) {
      whereClause.syncType = syncType;
    }

    if (syncStatus) {
      whereClause.syncStatus = syncStatus;
    }

    const [logs, totalCount] = await Promise.all([
      prisma.channelSyncLog.findMany({
        where: whereClause,
        include: {
          companyChannelAssignment: {
            include: {
              channel: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            }
          },
          platformMenuChannelAssignment: {
            include: {
              platformMenu: {
                select: {
                  id: true,
                  name: true,
                  platformType: true
                }
              }
            }
          }
        },
        orderBy: { startedAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.channelSyncLog.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({
      error: 'Failed to fetch sync logs',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Temporary Platform API server running on http://localhost:${port}`);
  console.log(`📋 Original Endpoints:`);
  console.log(`   GET /api/platforms/menu-platforms`);
  console.log(`   GET /api/menu/categories`);
  console.log(`   GET /api/menu/tags`);
  console.log(`   GET /api/menu/platforms`);
  console.log(`   GET /api/menu/platforms/:platformId`);
  console.log(`   GET /api/menu/platforms/:platformId/products`);
  console.log(`   POST /api/menu/platforms/:platformId/products`);
  console.log(`   DELETE /api/menu/platforms/:platformId/products`);
  console.log(`   PUT /api/menu/platforms/:platformId/products/reorder`);
  console.log(`   POST /api/menu/products/paginated`);
  console.log(`   GET /api/health`);
  console.log(`\n🔗 Channel Assignment System Endpoints:`);
  console.log(`   GET /api/channels/delivery-channels`);
  console.log(`   GET /api/channels/company-assignments`);
  console.log(`   POST /api/channels/company-assignments`);
  console.log(`   PUT /api/channels/company-assignments/:assignmentId`);
  console.log(`   DELETE /api/channels/company-assignments/:assignmentId`);
  console.log(`   GET /api/channels/platform-menu-assignments`);
  console.log(`   POST /api/channels/platform-menu-assignments`);
  console.log(`   PUT /api/channels/platform-menu-assignments/:assignmentId`);
  console.log(`   DELETE /api/channels/platform-menu-assignments/:assignmentId`);
  console.log(`   POST /api/channels/sync/menu/:assignmentId`);
  console.log(`   GET /api/channels/sync/logs`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down temporary API server...');
  await prisma.$disconnect();
  process.exit(0);
});