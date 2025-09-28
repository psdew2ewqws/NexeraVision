const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTemplateCategories() {
  console.log('🌱 Seeding template categories...');

  const categories = [
    {
      name: 'Receipt Templates',
      type: 'receipt',
      description: 'Standard customer receipt templates',
      icon: 'receipt',
      sortOrder: 1,
      settings: {
        paperWidth: 58,
        printDensity: 'medium',
        encoding: 'utf8'
      }
    },
    {
      name: 'Kitchen Tickets',
      type: 'kitchen',
      description: 'Kitchen order processing tickets',
      icon: 'chef-hat',
      sortOrder: 2,
      settings: {
        paperWidth: 80,
        printDensity: 'high',
        encoding: 'utf8'
      }
    },
    {
      name: 'Order Confirmations',
      type: 'confirmation',
      description: 'Order confirmation slips',
      icon: 'check-circle',
      sortOrder: 3,
      settings: {
        paperWidth: 58,
        printDensity: 'medium',
        encoding: 'utf8'
      }
    },
    {
      name: 'Delivery Labels',
      type: 'delivery',
      description: 'Delivery and pickup labels',
      icon: 'truck',
      sortOrder: 4,
      settings: {
        paperWidth: 80,
        printDensity: 'high',
        encoding: 'utf8'
      }
    },
    {
      name: 'Custom Templates',
      type: 'custom',
      description: 'User-defined custom templates',
      icon: 'palette',
      sortOrder: 5,
      settings: {
        paperWidth: 58,
        printDensity: 'medium',
        encoding: 'utf8'
      }
    }
  ];

  try {
    for (const category of categories) {
      const existing = await prisma.templateCategory.findFirst({
        where: { type: category.type }
      });

      if (!existing) {
        await prisma.templateCategory.create({
          data: category
        });
        console.log(`✅ Created category: ${category.name}`);
      } else {
        console.log(`⏭️  Category already exists: ${category.name}`);
      }
    }

    console.log('🎉 Template categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding template categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTemplateCategories();