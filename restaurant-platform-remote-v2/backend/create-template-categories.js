const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTemplateCategories() {
  try {
    console.log('Creating template categories...');

    const categories = [
      {
        name: 'Receipt Templates',
        type: 'receipt',
        description: 'Templates for printing customer receipts',
        icon: 'receipt',
        sortOrder: 1,
        settings: {},
        isActive: true
      },
      {
        name: 'Kitchen Orders',
        type: 'kitchen',
        description: 'Templates for kitchen order tickets',
        icon: 'kitchen',
        sortOrder: 2,
        settings: {},
        isActive: true
      },
      {
        name: 'Reports',
        type: 'report',
        description: 'Templates for daily and summary reports',
        icon: 'report',
        sortOrder: 3,
        settings: {},
        isActive: true
      },
      {
        name: 'Labels',
        type: 'label',
        description: 'Templates for product labels and stickers',
        icon: 'label',
        sortOrder: 4,
        settings: {},
        isActive: true
      }
    ];

    for (const categoryData of categories) {
      try {
        const category = await prisma.templateCategory.create({
          data: categoryData
        });
        console.log(`✅ Created category: ${category.name}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️ Category "${categoryData.name}" already exists`);
        } else {
          console.error(`❌ Error creating category "${categoryData.name}":`, error.message);
        }
      }
    }

    console.log('\n🎉 Template categories created successfully!');

  } catch (error) {
    console.error('❌ Error creating template categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTemplateCategories();