const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedModifiers() {
  try {
    console.log('Creating modifier categories and modifiers...');

    const companyId = 'test-company-uuid-123456789';

    // Create modifier categories
    const modifierCategories = [
      {
        name: { en: 'Size Options', ar: 'خيارات الحجم' },
        description: { en: 'Choose your preferred size', ar: 'اختر الحجم المفضل لديك' },
        companyId,
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        displayNumber: 1,
        selectionType: 'single'
      },
      {
        name: { en: 'Extra Toppings', ar: 'إضافات إضافية' },
        description: { en: 'Add extra toppings to your order', ar: 'أضف إضافات إضافية لطلبك' },
        companyId,
        isRequired: false,
        minSelections: 0,
        maxSelections: 5,
        displayNumber: 2,
        selectionType: 'multiple'
      },
      {
        name: { en: 'Sauce Options', ar: 'خيارات الصلصة' },
        description: { en: 'Select your sauce preferences', ar: 'حدد تفضيلاتك للصلصة' },
        companyId,
        isRequired: false,
        minSelections: 0,
        maxSelections: 3,
        displayNumber: 3,
        selectionType: 'multiple'
      },
      {
        name: { en: 'Cooking Preferences', ar: 'تفضيلات الطهي' },
        description: { en: 'How would you like it cooked?', ar: 'كيف تريد أن يتم طهيه؟' },
        companyId,
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        displayNumber: 4,
        selectionType: 'single'
      },
      {
        name: { en: 'Drink Options', ar: 'خيارات المشروبات' },
        description: { en: 'Choose drink size and ice', ar: 'اختر حجم المشروب والثلج' },
        companyId,
        isRequired: false,
        minSelections: 0,
        maxSelections: 2,
        displayNumber: 5,
        selectionType: 'multiple'
      }
    ];

    const createdCategories = [];
    for (const category of modifierCategories) {
      const created = await prisma.modifierCategory.create({
        data: category
      });
      createdCategories.push(created);
      console.log(`✅ Created modifier category: ${created.name.en}`);
    }

    // Create modifiers for each category
    const modifiersData = [
      // Size Options
      {
        categoryId: createdCategories[0].id,
        modifiers: [
          { name: { en: 'Small', ar: 'صغير' }, price: 0, isDefault: false },
          { name: { en: 'Medium', ar: 'وسط' }, price: 2.00, isDefault: true },
          { name: { en: 'Large', ar: 'كبير' }, price: 4.00, isDefault: false },
          { name: { en: 'Extra Large', ar: 'كبير جداً' }, price: 6.00, isDefault: false }
        ]
      },
      // Extra Toppings
      {
        categoryId: createdCategories[1].id,
        modifiers: [
          { name: { en: 'Extra Cheese', ar: 'جبنة إضافية' }, price: 1.50, isDefault: false },
          { name: { en: 'Bacon', ar: 'لحم مقدد' }, price: 2.00, isDefault: false },
          { name: { en: 'Mushrooms', ar: 'فطر' }, price: 1.00, isDefault: false },
          { name: { en: 'Onions', ar: 'بصل' }, price: 0.50, isDefault: false },
          { name: { en: 'Jalapeños', ar: 'هالابينو' }, price: 0.75, isDefault: false },
          { name: { en: 'Olives', ar: 'زيتون' }, price: 0.75, isDefault: false },
          { name: { en: 'Tomatoes', ar: 'طماطم' }, price: 0.50, isDefault: false },
          { name: { en: 'Pickles', ar: 'مخللات' }, price: 0.50, isDefault: false }
        ]
      },
      // Sauce Options
      {
        categoryId: createdCategories[2].id,
        modifiers: [
          { name: { en: 'Ketchup', ar: 'كاتشب' }, price: 0, isDefault: false },
          { name: { en: 'Mayo', ar: 'مايونيز' }, price: 0, isDefault: false },
          { name: { en: 'BBQ Sauce', ar: 'صلصة باربكيو' }, price: 0.50, isDefault: false },
          { name: { en: 'Ranch', ar: 'رانش' }, price: 0.50, isDefault: false },
          { name: { en: 'Hot Sauce', ar: 'صلصة حارة' }, price: 0, isDefault: false },
          { name: { en: 'Garlic Sauce', ar: 'صلصة الثوم' }, price: 0.50, isDefault: false },
          { name: { en: 'Honey Mustard', ar: 'خردل بالعسل' }, price: 0.50, isDefault: false }
        ]
      },
      // Cooking Preferences
      {
        categoryId: createdCategories[3].id,
        modifiers: [
          { name: { en: 'Rare', ar: 'نيئ' }, price: 0, isDefault: false },
          { name: { en: 'Medium Rare', ar: 'نصف نيئ' }, price: 0, isDefault: false },
          { name: { en: 'Medium', ar: 'متوسط' }, price: 0, isDefault: true },
          { name: { en: 'Medium Well', ar: 'متوسط ناضج' }, price: 0, isDefault: false },
          { name: { en: 'Well Done', ar: 'ناضج جداً' }, price: 0, isDefault: false }
        ]
      },
      // Drink Options
      {
        categoryId: createdCategories[4].id,
        modifiers: [
          { name: { en: 'No Ice', ar: 'بدون ثلج' }, price: 0, isDefault: false },
          { name: { en: 'Less Ice', ar: 'ثلج قليل' }, price: 0, isDefault: false },
          { name: { en: 'Regular Ice', ar: 'ثلج عادي' }, price: 0, isDefault: true },
          { name: { en: 'Extra Ice', ar: 'ثلج إضافي' }, price: 0, isDefault: false },
          { name: { en: 'Upsize Drink', ar: 'حجم أكبر للمشروب' }, price: 1.50, isDefault: false }
        ]
      }
    ];

    // Create all modifiers
    const allModifiers = [];
    for (const categoryData of modifiersData) {
      for (const modifier of categoryData.modifiers) {
        const created = await prisma.modifier.create({
          data: {
            name: modifier.name,
            basePrice: modifier.price,
            isDefault: modifier.isDefault,
            companyId,
            modifierCategoryId: categoryData.categoryId,
            status: 1,
            displayNumber: categoryData.modifiers.indexOf(modifier) + 1,
            pricing: {}
          }
        });
        allModifiers.push(created);
        console.log(`  ✅ Added modifier: ${created.name.en} (${modifier.price} JOD)`);
      }
    }

    console.log('\n🎯 Now linking modifiers to all products...\n');

    // Get all products
    const products = await prisma.menuProduct.findMany({
      where: { companyId }
    });

    // Determine which modifier categories to assign to each product
    for (const product of products) {
      const productName = product.name.en.toLowerCase();
      const modifierCategoryIds = [];

      // Size options for most items
      if (productName.includes('burger') || productName.includes('pizza') ||
          productName.includes('sandwich') || productName.includes('salad') ||
          productName.includes('chicken') || productName.includes('steak')) {
        modifierCategoryIds.push(createdCategories[0].id); // Size Options
      }

      // Extra toppings for certain items
      if (productName.includes('burger') || productName.includes('pizza') ||
          productName.includes('sandwich') || productName.includes('salad')) {
        modifierCategoryIds.push(createdCategories[1].id); // Extra Toppings
      }

      // Sauce options for many items
      if (productName.includes('burger') || productName.includes('sandwich') ||
          productName.includes('wings') || productName.includes('chicken') ||
          productName.includes('fries') || productName.includes('nuggets')) {
        modifierCategoryIds.push(createdCategories[2].id); // Sauce Options
      }

      // Cooking preferences for meat items
      if (productName.includes('steak') || productName.includes('burger') ||
          productName.includes('chicken') || productName.includes('beef')) {
        modifierCategoryIds.push(createdCategories[3].id); // Cooking Preferences
      }

      // Drink options for beverages
      if (productName.includes('juice') || productName.includes('cola') ||
          productName.includes('lemonade') || productName.includes('tea') ||
          productName.includes('coffee') || productName.includes('drink')) {
        modifierCategoryIds.push(createdCategories[4].id); // Drink Options
      }

      // If no specific categories matched, add at least Size and Sauce options
      if (modifierCategoryIds.length === 0) {
        modifierCategoryIds.push(createdCategories[0].id); // Size Options
        modifierCategoryIds.push(createdCategories[2].id); // Sauce Options
      }

      // Create ProductModifierCategory links
      for (const categoryId of modifierCategoryIds) {
        await prisma.productModifierCategory.create({
          data: {
            productId: product.id,
            modifierCategoryId: categoryId
          }
        });
      }

      console.log(`✅ Linked ${modifierCategoryIds.length} modifier categories to: ${product.name.en}`);
    }

    console.log('\n🎉 Successfully added modifiers to all products!');
    console.log(`📊 Summary:`);
    console.log(`   - ${createdCategories.length} modifier categories created`);
    console.log(`   - ${allModifiers.length} individual modifiers created`);
    console.log(`   - ${products.length} products linked with modifiers`);

  } catch (error) {
    console.error('Error seeding modifiers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedModifiers();