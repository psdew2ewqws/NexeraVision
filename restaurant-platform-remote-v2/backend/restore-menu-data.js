const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🍔 Restoring menu data...');
    
    // Get the demo company and branch
    const company = await prisma.company.findFirst({
      where: { name: 'Demo Restaurant' }
    });
    
    const branch = await prisma.branch.findFirst({
      where: { companyId: company.id }
    });
    
    if (!company || !branch) {
      console.log('❌ Demo company/branch not found');
      return;
    }

    // Create menu categories
    const categories = [
      {
        id: 'cat-1',
        name: { en: 'Burgers', ar: 'برجر' },
        description: { en: 'Delicious burgers', ar: 'برجر لذيذ' },
        displayOrder: 1,
        isActive: true,
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'cat-2', 
        name: { en: 'Pizza', ar: 'بيتزا' },
        description: { en: 'Italian pizza', ar: 'بيتزا إيطالية' },
        displayOrder: 2,
        isActive: true,
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'cat-3',
        name: { en: 'Drinks', ar: 'مشروبات' },
        description: { en: 'Refreshing drinks', ar: 'مشروبات منعشة' },
        displayOrder: 3,
        isActive: true,
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const category of categories) {
      await prisma.menuCategory.upsert({
        where: { id: category.id },
        update: category,
        create: category
      });
      console.log(`✓ Created category: ${category.name.en}`);
    }

    // Create menu products
    const products = [
      {
        id: 'prod-1',
        name: { en: 'Classic Burger', ar: 'برجر كلاسيكي' },
        description: { en: 'Beef patty with lettuce and tomato', ar: 'قطعة لحم مع خس وطماطم' },
        basePrice: 8.50,
        categoryId: 'cat-1',
        companyId: company.id,
        isActive: true,
        preparationTimeMinutes: 15,
        calories: 650,
        tags: ['popular', 'beef'],
        priority: 1,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'prod-2',
        name: { en: 'Margherita Pizza', ar: 'بيتزا مارجريتا' },
        description: { en: 'Classic pizza with tomato and mozzarella', ar: 'بيتزا كلاسيكية مع طماطم وموتزاريلا' },
        basePrice: 12.00,
        categoryId: 'cat-2',
        companyId: company.id,
        isActive: true,
        preparationTimeMinutes: 20,
        calories: 800,
        tags: ['vegetarian', 'cheese'],
        priority: 1,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'prod-3',
        name: { en: 'Coca Cola', ar: 'كوكا كولا' },
        description: { en: 'Refreshing cola drink', ar: 'مشروب كولا منعش' },
        basePrice: 2.50,
        categoryId: 'cat-3',
        companyId: company.id,
        isActive: true,
        preparationTimeMinutes: 1,
        calories: 140,
        tags: ['cold', 'sweet'],
        priority: 1,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const product of products) {
      await prisma.menuProduct.upsert({
        where: { id: product.id },
        update: product,
        create: product
      });
      console.log(`✓ Created product: ${product.name.en}`);
    }

    console.log('✅ Menu data restored successfully!');
    
    // Check counts
    const categoryCount = await prisma.menuCategory.count();
    const productCount = await prisma.menuProduct.count();
    console.log(`📊 Database now has ${categoryCount} categories and ${productCount} products`);
    
  } catch (error) {
    console.error('❌ Error restoring menu data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();