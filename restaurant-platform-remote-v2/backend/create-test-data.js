const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  try {
    // Get the test company
    const company = await prisma.company.findFirst({
      where: { slug: 'test-restaurant' }
    });

    if (!company) {
      console.error('Test company not found. Run create-test-user.js first.');
      return;
    }

    console.log('Creating test data for company:', company.name);

    // Create test categories
    const categories = [
      {
        name: { en: 'Appetizers', ar: 'المقبلات' },
        description: { en: 'Delicious starters', ar: 'مقبلات لذيذة' },
        displayNumber: 1,
        isActive: true,
        companyId: company.id
      },
      {
        name: { en: 'Main Dishes', ar: 'الأطباق الرئيسية' },
        description: { en: 'Our signature main courses', ar: 'أطباقنا الرئيسية المميزة' },
        displayNumber: 2,
        isActive: true,
        companyId: company.id
      },
      {
        name: { en: 'Beverages', ar: 'المشروبات' },
        description: { en: 'Refreshing drinks', ar: 'مشروبات منعشة' },
        displayNumber: 3,
        isActive: true,
        companyId: company.id
      },
      {
        name: { en: 'Desserts', ar: 'الحلويات' },
        description: { en: 'Sweet treats', ar: 'حلويات لذيذة' },
        displayNumber: 4,
        isActive: true,
        companyId: company.id
      }
    ];

    console.log('Creating categories...');
    const createdCategories = [];
    for (const categoryData of categories) {
      const category = await prisma.menuCategory.create({
        data: categoryData
      });
      createdCategories.push(category);
      console.log(`✅ Created category: ${category.name.en}`);
    }

    // Create test products
    console.log('Creating products...');
    const products = [
      {
        name: { en: 'Caesar Salad', ar: 'سلطة قيصر' },
        description: { en: 'Fresh romaine lettuce with parmesan cheese', ar: 'خس طازج مع جبن البارميزان' },
        basePrice: 12.99,
        pricing: {
          base: 12.99,
          talabat: 14.99,
          careem: 13.99
        },
        categoryId: createdCategories[0].id,
        companyId: company.id,
        status: 1,
        priority: 1,
        preparationTime: 10,
        tags: ['healthy', 'vegetarian']
      },
      {
        name: { en: 'Margherita Pizza', ar: 'بيتزا مارغريتا' },
        description: { en: 'Classic pizza with tomato, mozzarella, and basil', ar: 'بيتزا كلاسيكية مع الطماطم والموزاريلا والريحان' },
        basePrice: 18.99,
        pricing: {
          base: 18.99,
          talabat: 21.99,
          careem: 20.99
        },
        categoryId: createdCategories[1].id,
        companyId: company.id,
        status: 1,
        priority: 1,
        preparationTime: 25,
        tags: ['popular', 'vegetarian']
      },
      {
        name: { en: 'Grilled Chicken', ar: 'دجاج مشوي' },
        description: { en: 'Tender grilled chicken breast with herbs', ar: 'صدر دجاج مشوي طري مع الأعشاب' },
        basePrice: 22.99,
        pricing: {
          base: 22.99,
          talabat: 25.99,
          careem: 24.99
        },
        categoryId: createdCategories[1].id,
        companyId: company.id,
        status: 1,
        priority: 2,
        preparationTime: 30,
        tags: ['protein', 'healthy']
      },
      {
        name: { en: 'Fresh Orange Juice', ar: 'عصير برتقال طازج' },
        description: { en: 'Freshly squeezed orange juice', ar: 'عصير برتقال طازج معصور' },
        basePrice: 5.99,
        pricing: {
          base: 5.99,
          talabat: 6.99,
          careem: 6.49
        },
        categoryId: createdCategories[2].id,
        companyId: company.id,
        status: 1,
        priority: 1,
        preparationTime: 5,
        tags: ['fresh', 'healthy']
      },
      {
        name: { en: 'Chocolate Cake', ar: 'كيك الشوكولاتة' },
        description: { en: 'Rich chocolate cake with ganache', ar: 'كيك شوكولاتة غني مع الجاناش' },
        basePrice: 8.99,
        pricing: {
          base: 8.99,
          talabat: 10.99,
          careem: 9.99
        },
        categoryId: createdCategories[3].id,
        companyId: company.id,
        status: 1,
        priority: 1,
        preparationTime: 15,
        tags: ['sweet', 'popular']
      }
    ];

    for (const productData of products) {
      const product = await prisma.menuProduct.create({
        data: productData
      });
      console.log(`✅ Created product: ${product.name.en}`);
    }

    console.log('\n🎉 Test data created successfully!');
    console.log(`Created ${createdCategories.length} categories and ${products.length} products`);
    console.log('You can now access the menu products page with data.');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
