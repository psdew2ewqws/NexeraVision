const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedProducts() {
  try {
    console.log('Adding test products...');

    // Get categories
    const categories = await prisma.menuCategory.findMany({
      where: { companyId: 'test-company-uuid-123456789' }
    });

    if (categories.length === 0) {
      console.error('No categories found. Please run seed.ts first.');
      return;
    }

    const appetizerCategory = categories.find(c => c.name.en === 'Appetizers');
    const mainCategory = categories.find(c => c.name.en === 'Main Courses');
    const dessertCategory = categories.find(c => c.name.en === 'Desserts');
    const beverageCategory = categories.find(c => c.name.en === 'Beverages');

    // Create products with correct schema fields
    const products = [
      {
        name: { en: 'Caesar Salad', ar: 'سلطة سيزر' },
        description: { en: 'Fresh romaine lettuce with parmesan', ar: 'خس روماني طازج مع جبنة البارميزان' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 8.99,
        pricing: {
          defaultPrice: 8.99,
          platforms: {
            dineIn: 8.99,
            takeaway: 8.99,
            delivery: 9.99
          }
        },
        status: 1, // 1 = active
        tags: ['vegetarian', 'salad']
      },
      {
        name: { en: 'Chicken Wings', ar: 'أجنحة الدجاج' },
        description: { en: 'Spicy buffalo wings', ar: 'أجنحة بوفالو حارة' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 12.99,
        pricing: {
          defaultPrice: 12.99,
          platforms: {
            dineIn: 12.99,
            takeaway: 12.99,
            delivery: 14.99
          }
        },
        status: 1,
        tags: ['spicy', 'chicken']
      },
      {
        name: { en: 'Grilled Chicken', ar: 'دجاج مشوي' },
        description: { en: 'Marinated grilled chicken breast', ar: 'صدر دجاج مشوي متبل' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 18.99,
        pricing: {
          defaultPrice: 18.99,
          platforms: {
            dineIn: 18.99,
            takeaway: 18.99,
            delivery: 20.99
          }
        },
        status: 1,
        tags: ['grilled', 'chicken', 'main']
      },
      {
        name: { en: 'Beef Burger', ar: 'برجر لحم البقر' },
        description: { en: 'Juicy beef burger with fries', ar: 'برجر لحم بقري مع البطاطس' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 15.99,
        pricing: {
          defaultPrice: 15.99,
          platforms: {
            dineIn: 15.99,
            takeaway: 15.99,
            delivery: 17.99
          }
        },
        status: 1,
        tags: ['beef', 'burger']
      },
      {
        name: { en: 'Chocolate Cake', ar: 'كعكة الشوكولاتة' },
        description: { en: 'Rich chocolate layer cake', ar: 'كعكة شوكولاتة غنية' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 6.99,
        pricing: {
          defaultPrice: 6.99,
          platforms: {
            dineIn: 6.99,
            takeaway: 6.99,
            delivery: 7.99
          }
        },
        status: 1,
        tags: ['dessert', 'chocolate']
      },
      {
        name: { en: 'Ice Cream', ar: 'آيس كريم' },
        description: { en: 'Vanilla ice cream', ar: 'آيس كريم فانيليا' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 4.99,
        pricing: {
          defaultPrice: 4.99,
          platforms: {
            dineIn: 4.99,
            takeaway: 4.99,
            delivery: 5.99
          }
        },
        status: 1,
        tags: ['dessert', 'ice-cream']
      },
      {
        name: { en: 'Orange Juice', ar: 'عصير البرتقال' },
        description: { en: 'Fresh squeezed orange juice', ar: 'عصير برتقال طازج' },
        categoryId: beverageCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 3.99,
        pricing: {
          defaultPrice: 3.99,
          platforms: {
            dineIn: 3.99,
            takeaway: 3.99,
            delivery: 4.99
          }
        },
        status: 1,
        tags: ['juice', 'fresh']
      },
      {
        name: { en: 'Cola', ar: 'كولا' },
        description: { en: 'Refreshing cola drink', ar: 'مشروب كولا منعش' },
        categoryId: beverageCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 2.99,
        pricing: {
          defaultPrice: 2.99,
          platforms: {
            dineIn: 2.99,
            takeaway: 2.99,
            delivery: 3.99
          }
        },
        status: 1,
        tags: ['soda', 'cold']
      }
    ];

    for (const product of products) {
      const created = await prisma.menuProduct.create({
        data: product
      });
      console.log(`✅ Created product: ${created.name.en}`);
    }

    console.log('✅ Successfully added test products!');
  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedProducts();