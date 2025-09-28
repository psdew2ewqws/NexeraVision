const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed50Products() {
  try {
    console.log('🍽️ Adding 50 restaurant products with images...');

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

    // Create 50 products with realistic restaurant data and images
    const products = [
      // Appetizers (15 items)
      {
        name: { en: 'Hummus with Pita', ar: 'حمص مع خبز البيتا' },
        description: { en: 'Traditional chickpea dip with warm pita bread', ar: 'غموس الحمص التقليدي مع خبز البيتا الدافئ' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 7.99,
        image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
        pricing: { defaultPrice: 7.99, platforms: { dineIn: 7.99, takeaway: 7.99, delivery: 8.99 } },
        status: 1,
        tags: ['vegetarian', 'mediterranean', 'starter'],
        preparationTime: 10
      },
      {
        name: { en: 'Mozzarella Sticks', ar: 'أصابع الموتزاريلا' },
        description: { en: 'Crispy fried mozzarella with marinara sauce', ar: 'جبنة موتزاريلا مقلية مقرمشة مع صلصة المارينارا' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 9.99,
        image: 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=400',
        pricing: { defaultPrice: 9.99, platforms: { dineIn: 9.99, takeaway: 9.99, delivery: 10.99 } },
        status: 1,
        tags: ['fried', 'cheese', 'vegetarian'],
        preparationTime: 12
      },
      {
        name: { en: 'Bruschetta', ar: 'بروشيتا' },
        description: { en: 'Toasted bread topped with tomatoes and basil', ar: 'خبز محمص مع الطماطم والريحان' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 8.49,
        image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400',
        pricing: { defaultPrice: 8.49, platforms: { dineIn: 8.49, takeaway: 8.49, delivery: 9.49 } },
        status: 1,
        tags: ['italian', 'vegetarian', 'fresh'],
        preparationTime: 8
      },
      {
        name: { en: 'Calamari Rings', ar: 'حلقات الكاليماري' },
        description: { en: 'Golden fried squid rings with lemon aioli', ar: 'حلقات الحبار المقلية الذهبية مع أيولي الليمون' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 12.99,
        image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400',
        pricing: { defaultPrice: 12.99, platforms: { dineIn: 12.99, takeaway: 12.99, delivery: 14.99 } },
        status: 1,
        tags: ['seafood', 'fried', 'crispy'],
        preparationTime: 15
      },
      {
        name: { en: 'Nachos Supreme', ar: 'ناتشوز سوبريم' },
        description: { en: 'Loaded nachos with cheese, jalapeños, and salsa', ar: 'ناتشوز محملة بالجبن والهالابينو والصلصة' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 11.99,
        image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400',
        pricing: { defaultPrice: 11.99, platforms: { dineIn: 11.99, takeaway: 11.99, delivery: 13.99 } },
        status: 1,
        tags: ['mexican', 'sharing', 'spicy'],
        preparationTime: 10
      },
      {
        name: { en: 'Spring Rolls', ar: 'سبرينغ رول' },
        description: { en: 'Crispy vegetable spring rolls with sweet chili sauce', ar: 'لفائف الخضار المقرمشة مع صلصة الشيلي الحلوة' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 7.99,
        image: 'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400',
        pricing: { defaultPrice: 7.99, platforms: { dineIn: 7.99, takeaway: 7.99, delivery: 8.99 } },
        status: 1,
        tags: ['asian', 'vegetarian', 'crispy'],
        preparationTime: 12
      },
      {
        name: { en: 'Garlic Bread', ar: 'خبز بالثوم' },
        description: { en: 'Warm baguette with garlic butter and herbs', ar: 'خبز فرنسي دافئ مع زبدة الثوم والأعشاب' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 5.99,
        image: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?w=400',
        pricing: { defaultPrice: 5.99, platforms: { dineIn: 5.99, takeaway: 5.99, delivery: 6.99 } },
        status: 1,
        tags: ['bread', 'vegetarian', 'italian'],
        preparationTime: 8
      },
      {
        name: { en: 'Cheese Platter', ar: 'طبق الجبن' },
        description: { en: 'Assorted premium cheeses with crackers', ar: 'مجموعة من الأجبان الفاخرة مع البسكويت' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 16.99,
        image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400',
        pricing: { defaultPrice: 16.99, platforms: { dineIn: 16.99, takeaway: 16.99, delivery: 18.99 } },
        status: 1,
        tags: ['cheese', 'sharing', 'premium'],
        preparationTime: 5
      },
      {
        name: { en: 'Shrimp Cocktail', ar: 'كوكتيل الروبيان' },
        description: { en: 'Chilled jumbo shrimp with cocktail sauce', ar: 'روبيان جامبو مبرد مع صلصة الكوكتيل' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 14.99,
        image: 'https://images.unsplash.com/photo-1599663253423-7cad6e3c73a4?w=400',
        pricing: { defaultPrice: 14.99, platforms: { dineIn: 14.99, takeaway: 14.99, delivery: 16.99 } },
        status: 1,
        tags: ['seafood', 'cold', 'premium'],
        preparationTime: 5
      },
      {
        name: { en: 'Stuffed Mushrooms', ar: 'فطر محشو' },
        description: { en: 'Baked mushrooms filled with herbs and cheese', ar: 'فطر مخبوز محشو بالأعشاب والجبن' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 9.99,
        image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
        pricing: { defaultPrice: 9.99, platforms: { dineIn: 9.99, takeaway: 9.99, delivery: 10.99 } },
        status: 1,
        tags: ['vegetarian', 'baked', 'mushrooms'],
        preparationTime: 18
      },
      {
        name: { en: 'Chicken Satay', ar: 'ساتاي الدجاج' },
        description: { en: 'Grilled chicken skewers with peanut sauce', ar: 'أسياخ دجاج مشوية مع صلصة الفول السوداني' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 10.99,
        image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400',
        pricing: { defaultPrice: 10.99, platforms: { dineIn: 10.99, takeaway: 10.99, delivery: 12.99 } },
        status: 1,
        tags: ['asian', 'grilled', 'chicken'],
        preparationTime: 15
      },
      {
        name: { en: 'Onion Rings', ar: 'حلقات البصل' },
        description: { en: 'Crispy battered onion rings with ranch dip', ar: 'حلقات بصل مقرمشة مع صلصة الرانش' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 7.49,
        image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400',
        pricing: { defaultPrice: 7.49, platforms: { dineIn: 7.49, takeaway: 7.49, delivery: 8.49 } },
        status: 1,
        tags: ['fried', 'vegetarian', 'crispy'],
        preparationTime: 10
      },
      {
        name: { en: 'Edamame', ar: 'إدامامي' },
        description: { en: 'Steamed soybeans with sea salt', ar: 'فول الصويا المطهو على البخار مع ملح البحر' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 6.99,
        image: 'https://images.unsplash.com/photo-1564768048938-b7e7c3e2a2a5?w=400',
        pricing: { defaultPrice: 6.99, platforms: { dineIn: 6.99, takeaway: 6.99, delivery: 7.99 } },
        status: 1,
        tags: ['japanese', 'healthy', 'vegan'],
        preparationTime: 8
      },
      {
        name: { en: 'Potato Skins', ar: 'قشور البطاطس' },
        description: { en: 'Loaded potato skins with bacon and cheese', ar: 'قشور بطاطس محملة باللحم المقدد والجبن' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 8.99,
        image: 'https://images.unsplash.com/photo-1552332386-a347e9261e2c?w=400',
        pricing: { defaultPrice: 8.99, platforms: { dineIn: 8.99, takeaway: 8.99, delivery: 9.99 } },
        status: 1,
        tags: ['american', 'baked', 'bacon'],
        preparationTime: 15
      },
      {
        name: { en: 'Spinach Dip', ar: 'غموس السبانخ' },
        description: { en: 'Creamy spinach and artichoke dip with chips', ar: 'غموس كريمي بالسبانخ والخرشوف مع الرقائق' },
        categoryId: appetizerCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 9.49,
        image: 'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=400',
        pricing: { defaultPrice: 9.49, platforms: { dineIn: 9.49, takeaway: 9.49, delivery: 10.49 } },
        status: 1,
        tags: ['vegetarian', 'dip', 'creamy'],
        preparationTime: 12
      },

      // Main Courses (20 items)
      {
        name: { en: 'Ribeye Steak', ar: 'ستيك ريب آي' },
        description: { en: 'Prime cut ribeye grilled to perfection', ar: 'قطعة لحم ريب آي فاخرة مشوية بإتقان' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 32.99,
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400',
        pricing: { defaultPrice: 32.99, platforms: { dineIn: 32.99, takeaway: 32.99, delivery: 35.99 } },
        status: 1,
        tags: ['steak', 'premium', 'beef'],
        preparationTime: 25
      },
      {
        name: { en: 'Salmon Teriyaki', ar: 'سلمون ترياكي' },
        description: { en: 'Glazed salmon with teriyaki sauce and vegetables', ar: 'سلمون مزجج بصلصة الترياكي والخضروات' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 24.99,
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
        pricing: { defaultPrice: 24.99, platforms: { dineIn: 24.99, takeaway: 24.99, delivery: 26.99 } },
        status: 1,
        tags: ['seafood', 'japanese', 'healthy'],
        preparationTime: 20
      },
      {
        name: { en: 'Chicken Alfredo', ar: 'دجاج ألفريدو' },
        description: { en: 'Creamy fettuccine with grilled chicken', ar: 'فيتوتشيني كريمي مع الدجاج المشوي' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 18.99,
        image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400',
        pricing: { defaultPrice: 18.99, platforms: { dineIn: 18.99, takeaway: 18.99, delivery: 20.99 } },
        status: 1,
        tags: ['pasta', 'italian', 'creamy'],
        preparationTime: 18
      },
      {
        name: { en: 'BBQ Ribs', ar: 'أضلاع الشواء' },
        description: { en: 'Slow-cooked pork ribs with BBQ sauce', ar: 'أضلاع خنزير مطبوخة ببطء مع صلصة الباربكيو' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 26.99,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
        pricing: { defaultPrice: 26.99, platforms: { dineIn: 26.99, takeaway: 26.99, delivery: 29.99 } },
        status: 1,
        tags: ['bbq', 'pork', 'american'],
        preparationTime: 30
      },
      {
        name: { en: 'Vegetarian Pizza', ar: 'بيتزا نباتية' },
        description: { en: '12" pizza with fresh vegetables and cheese', ar: 'بيتزا 12 بوصة مع الخضار الطازجة والجبن' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 16.99,
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
        pricing: { defaultPrice: 16.99, platforms: { dineIn: 16.99, takeaway: 16.99, delivery: 18.99 } },
        status: 1,
        tags: ['pizza', 'vegetarian', 'italian'],
        preparationTime: 20
      },
      {
        name: { en: 'Fish and Chips', ar: 'سمك وبطاطس' },
        description: { en: 'Beer-battered cod with crispy fries', ar: 'سمك القد المغطى بالبيرة مع البطاطس المقرمشة' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 17.99,
        image: 'https://images.unsplash.com/photo-1580217593608-61931cefc821?w=400',
        pricing: { defaultPrice: 17.99, platforms: { dineIn: 17.99, takeaway: 17.99, delivery: 19.99 } },
        status: 1,
        tags: ['seafood', 'british', 'fried'],
        preparationTime: 18
      },
      {
        name: { en: 'Lamb Chops', ar: 'قطع لحم الضأن' },
        description: { en: 'Herb-crusted lamb chops with mint sauce', ar: 'قطع لحم ضأن مغطاة بالأعشاب مع صلصة النعناع' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 29.99,
        image: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=400',
        pricing: { defaultPrice: 29.99, platforms: { dineIn: 29.99, takeaway: 29.99, delivery: 32.99 } },
        status: 1,
        tags: ['lamb', 'premium', 'mediterranean'],
        preparationTime: 25
      },
      {
        name: { en: 'Chicken Tacos', ar: 'تاكو الدجاج' },
        description: { en: 'Three soft tacos with seasoned chicken', ar: 'ثلاث تاكو طرية مع الدجاج المتبل' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 14.99,
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400',
        pricing: { defaultPrice: 14.99, platforms: { dineIn: 14.99, takeaway: 14.99, delivery: 16.99 } },
        status: 1,
        tags: ['mexican', 'chicken', 'tacos'],
        preparationTime: 15
      },
      {
        name: { en: 'Spaghetti Bolognese', ar: 'سباغيتي بولونيز' },
        description: { en: 'Classic pasta with meat sauce', ar: 'باستا كلاسيكية مع صلصة اللحم' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 16.99,
        image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
        pricing: { defaultPrice: 16.99, platforms: { dineIn: 16.99, takeaway: 16.99, delivery: 18.99 } },
        status: 1,
        tags: ['pasta', 'italian', 'beef'],
        preparationTime: 20
      },
      {
        name: { en: 'Thai Green Curry', ar: 'كاري أخضر تايلاندي' },
        description: { en: 'Spicy coconut curry with vegetables', ar: 'كاري جوز الهند الحار مع الخضروات' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 15.99,
        image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400',
        pricing: { defaultPrice: 15.99, platforms: { dineIn: 15.99, takeaway: 15.99, delivery: 17.99 } },
        status: 1,
        tags: ['thai', 'spicy', 'curry'],
        preparationTime: 22
      },
      {
        name: { en: 'Double Cheeseburger', ar: 'برجر مزدوج بالجبن' },
        description: { en: 'Two beef patties with cheese and fries', ar: 'قرصان من اللحم البقري مع الجبن والبطاطس' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 17.99,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
        pricing: { defaultPrice: 17.99, platforms: { dineIn: 17.99, takeaway: 17.99, delivery: 19.99 } },
        status: 1,
        tags: ['burger', 'american', 'beef'],
        preparationTime: 18
      },
      {
        name: { en: 'Chicken Shawarma', ar: 'شاورما دجاج' },
        description: { en: 'Middle Eastern spiced chicken wrap', ar: 'لفة دجاج بالتوابل الشرق أوسطية' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 12.99,
        image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400',
        pricing: { defaultPrice: 12.99, platforms: { dineIn: 12.99, takeaway: 12.99, delivery: 14.99 } },
        status: 1,
        tags: ['middle-eastern', 'chicken', 'wrap'],
        preparationTime: 15
      },
      {
        name: { en: 'Seafood Paella', ar: 'بايلا المأكولات البحرية' },
        description: { en: 'Spanish rice with mixed seafood', ar: 'أرز إسباني مع مأكولات بحرية مختلطة' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 28.99,
        image: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400',
        pricing: { defaultPrice: 28.99, platforms: { dineIn: 28.99, takeaway: 28.99, delivery: 31.99 } },
        status: 1,
        tags: ['spanish', 'seafood', 'rice'],
        preparationTime: 35
      },
      {
        name: { en: 'Chicken Pad Thai', ar: 'باد تاي بالدجاج' },
        description: { en: 'Stir-fried rice noodles with chicken', ar: 'نودلز الأرز المقلية مع الدجاج' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 15.99,
        image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400',
        pricing: { defaultPrice: 15.99, platforms: { dineIn: 15.99, takeaway: 15.99, delivery: 17.99 } },
        status: 1,
        tags: ['thai', 'noodles', 'chicken'],
        preparationTime: 20
      },
      {
        name: { en: 'Vegan Buddha Bowl', ar: 'وعاء بوذا النباتي' },
        description: { en: 'Quinoa bowl with roasted vegetables', ar: 'وعاء الكينوا مع الخضار المحمصة' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 13.99,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
        pricing: { defaultPrice: 13.99, platforms: { dineIn: 13.99, takeaway: 13.99, delivery: 15.99 } },
        status: 1,
        tags: ['vegan', 'healthy', 'bowl'],
        preparationTime: 15
      },
      {
        name: { en: 'Lobster Roll', ar: 'رول الكركند' },
        description: { en: 'Fresh lobster meat in a toasted bun', ar: 'لحم الكركند الطازج في خبز محمص' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 34.99,
        image: 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=400',
        pricing: { defaultPrice: 34.99, platforms: { dineIn: 34.99, takeaway: 34.99, delivery: 37.99 } },
        status: 1,
        tags: ['seafood', 'premium', 'sandwich'],
        preparationTime: 15
      },
      {
        name: { en: 'Chicken Biryani', ar: 'برياني الدجاج' },
        description: { en: 'Fragrant rice with spiced chicken', ar: 'أرز عطري مع الدجاج المتبل' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 16.99,
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
        pricing: { defaultPrice: 16.99, platforms: { dineIn: 16.99, takeaway: 16.99, delivery: 18.99 } },
        status: 1,
        tags: ['indian', 'rice', 'chicken'],
        preparationTime: 30
      },
      {
        name: { en: 'Mushroom Risotto', ar: 'ريزوتو الفطر' },
        description: { en: 'Creamy Italian rice with mushrooms', ar: 'أرز إيطالي كريمي مع الفطر' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 18.99,
        image: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400',
        pricing: { defaultPrice: 18.99, platforms: { dineIn: 18.99, takeaway: 18.99, delivery: 20.99 } },
        status: 1,
        tags: ['italian', 'vegetarian', 'rice'],
        preparationTime: 25
      },
      {
        name: { en: 'Beef Fajitas', ar: 'فاهيتا اللحم' },
        description: { en: 'Sizzling beef with peppers and onions', ar: 'لحم بقري متبل مع الفلفل والبصل' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 19.99,
        image: 'https://images.unsplash.com/photo-1564767655658-4e6b365884ff?w=400',
        pricing: { defaultPrice: 19.99, platforms: { dineIn: 19.99, takeaway: 19.99, delivery: 21.99 } },
        status: 1,
        tags: ['mexican', 'beef', 'spicy'],
        preparationTime: 20
      },
      {
        name: { en: 'Pork Schnitzel', ar: 'شنيتزل' },
        description: { en: 'Breaded pork cutlet with lemon', ar: 'قطعة لحم خنزير مقلية مع الليمون' },
        categoryId: mainCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 17.99,
        image: 'https://images.unsplash.com/photo-1599921841143-819065280869?w=400',
        pricing: { defaultPrice: 17.99, platforms: { dineIn: 17.99, takeaway: 17.99, delivery: 19.99 } },
        status: 1,
        tags: ['german', 'pork', 'fried'],
        preparationTime: 18
      },

      // Desserts (10 items)
      {
        name: { en: 'Tiramisu', ar: 'تيراميسو' },
        description: { en: 'Italian coffee-flavored dessert', ar: 'حلوى إيطالية بنكهة القهوة' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 7.99,
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400',
        pricing: { defaultPrice: 7.99, platforms: { dineIn: 7.99, takeaway: 7.99, delivery: 8.99 } },
        status: 1,
        tags: ['italian', 'coffee', 'dessert'],
        preparationTime: 5
      },
      {
        name: { en: 'Cheesecake', ar: 'تشيز كيك' },
        description: { en: 'New York style cheesecake with berry sauce', ar: 'تشيز كيك بطريقة نيويورك مع صلصة التوت' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 8.49,
        image: 'https://images.unsplash.com/photo-1508737804141-4c3b688e2546?w=400',
        pricing: { defaultPrice: 8.49, platforms: { dineIn: 8.49, takeaway: 8.49, delivery: 9.49 } },
        status: 1,
        tags: ['american', 'cheese', 'sweet'],
        preparationTime: 5
      },
      {
        name: { en: 'Apple Pie', ar: 'فطيرة التفاح' },
        description: { en: 'Warm apple pie with vanilla ice cream', ar: 'فطيرة التفاح الدافئة مع آيس كريم الفانيليا' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 6.99,
        image: 'https://images.unsplash.com/photo-1535920527002-b35e96722eb9?w=400',
        pricing: { defaultPrice: 6.99, platforms: { dineIn: 6.99, takeaway: 6.99, delivery: 7.99 } },
        status: 1,
        tags: ['american', 'pie', 'warm'],
        preparationTime: 8
      },
      {
        name: { en: 'Crème Brûlée', ar: 'كريم بروليه' },
        description: { en: 'French custard with caramelized sugar', ar: 'كاسترد فرنسي مع السكر المكرمل' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 8.99,
        image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=400',
        pricing: { defaultPrice: 8.99, platforms: { dineIn: 8.99, takeaway: 8.99, delivery: 9.99 } },
        status: 1,
        tags: ['french', 'custard', 'caramel'],
        preparationTime: 5
      },
      {
        name: { en: 'Brownie Sundae', ar: 'براوني سانداي' },
        description: { en: 'Warm brownie with ice cream and chocolate sauce', ar: 'براوني دافئ مع الآيس كريم وصلصة الشوكولاتة' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 9.49,
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400',
        pricing: { defaultPrice: 9.49, platforms: { dineIn: 9.49, takeaway: 9.49, delivery: 10.49 } },
        status: 1,
        tags: ['chocolate', 'ice-cream', 'warm'],
        preparationTime: 10
      },
      {
        name: { en: 'Panna Cotta', ar: 'بانا كوتا' },
        description: { en: 'Italian vanilla pudding with fruit', ar: 'بودينغ فانيليا إيطالي مع الفواكه' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 7.49,
        image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
        pricing: { defaultPrice: 7.49, platforms: { dineIn: 7.49, takeaway: 7.49, delivery: 8.49 } },
        status: 1,
        tags: ['italian', 'pudding', 'light'],
        preparationTime: 5
      },
      {
        name: { en: 'Fruit Tart', ar: 'تارت الفواكه' },
        description: { en: 'Fresh seasonal fruit tart', ar: 'تارت الفواكه الموسمية الطازجة' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 7.99,
        image: 'https://images.unsplash.com/photo-1525151498231-bc059cfafa2b?w=400',
        pricing: { defaultPrice: 7.99, platforms: { dineIn: 7.99, takeaway: 7.99, delivery: 8.99 } },
        status: 1,
        tags: ['fruit', 'tart', 'fresh'],
        preparationTime: 5
      },
      {
        name: { en: 'Molten Lava Cake', ar: 'كعكة اللافا' },
        description: { en: 'Chocolate cake with molten center', ar: 'كعكة الشوكولاتة مع مركز ذائب' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 9.99,
        image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400',
        pricing: { defaultPrice: 9.99, platforms: { dineIn: 9.99, takeaway: 9.99, delivery: 10.99 } },
        status: 1,
        tags: ['chocolate', 'warm', 'decadent'],
        preparationTime: 15
      },
      {
        name: { en: 'Sorbet Trio', ar: 'ثلاثي السوربيه' },
        description: { en: 'Three flavors of fruit sorbet', ar: 'ثلاث نكهات من سوربيه الفواكه' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 6.99,
        image: 'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400',
        pricing: { defaultPrice: 6.99, platforms: { dineIn: 6.99, takeaway: 6.99, delivery: 7.99 } },
        status: 1,
        tags: ['sorbet', 'fruit', 'refreshing'],
        preparationTime: 5
      },
      {
        name: { en: 'Baklava', ar: 'بقلاوة' },
        description: { en: 'Sweet pastry with nuts and honey', ar: 'معجنات حلوة مع المكسرات والعسل' },
        categoryId: dessertCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 5.99,
        image: 'https://images.unsplash.com/photo-1598110750624-207050c4f28c?w=400',
        pricing: { defaultPrice: 5.99, platforms: { dineIn: 5.99, takeaway: 5.99, delivery: 6.99 } },
        status: 1,
        tags: ['middle-eastern', 'nuts', 'honey'],
        preparationTime: 5
      },

      // Beverages (5 items)
      {
        name: { en: 'Fresh Lemonade', ar: 'عصير الليمون الطازج' },
        description: { en: 'House-made fresh lemonade', ar: 'عصير الليمون الطازج المحضر في المنزل' },
        categoryId: beverageCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 4.49,
        image: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=400',
        pricing: { defaultPrice: 4.49, platforms: { dineIn: 4.49, takeaway: 4.49, delivery: 5.49 } },
        status: 1,
        tags: ['fresh', 'citrus', 'cold'],
        preparationTime: 5
      },
      {
        name: { en: 'Iced Coffee', ar: 'قهوة مثلجة' },
        description: { en: 'Cold brew coffee with ice', ar: 'قهوة باردة مع الثلج' },
        categoryId: beverageCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 4.99,
        image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
        pricing: { defaultPrice: 4.99, platforms: { dineIn: 4.99, takeaway: 4.99, delivery: 5.99 } },
        status: 1,
        tags: ['coffee', 'cold', 'caffeine'],
        preparationTime: 5
      },
      {
        name: { en: 'Smoothie Bowl', ar: 'وعاء السموذي' },
        description: { en: 'Mixed fruit smoothie with toppings', ar: 'سموذي الفواكه المختلطة مع الإضافات' },
        categoryId: beverageCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 7.99,
        image: 'https://images.unsplash.com/photo-1555375771-14b2a63968a9?w=400',
        pricing: { defaultPrice: 7.99, platforms: { dineIn: 7.99, takeaway: 7.99, delivery: 8.99 } },
        status: 1,
        tags: ['healthy', 'fruit', 'smoothie'],
        preparationTime: 8
      },
      {
        name: { en: 'Hot Chocolate', ar: 'شوكولاتة ساخنة' },
        description: { en: 'Rich hot chocolate with marshmallows', ar: 'شوكولاتة ساخنة غنية مع المارشميلو' },
        categoryId: beverageCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 4.49,
        image: 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=400',
        pricing: { defaultPrice: 4.49, platforms: { dineIn: 4.49, takeaway: 4.49, delivery: 5.49 } },
        status: 1,
        tags: ['chocolate', 'hot', 'sweet'],
        preparationTime: 5
      },
      {
        name: { en: 'Craft Beer', ar: 'بيرة حرفية' },
        description: { en: 'Selection of local craft beers', ar: 'مجموعة مختارة من البيرة الحرفية المحلية' },
        categoryId: beverageCategory.id,
        companyId: 'test-company-uuid-123456789',
        basePrice: 6.99,
        image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400',
        pricing: { defaultPrice: 6.99, platforms: { dineIn: 6.99, takeaway: 6.99, delivery: 7.99 } },
        status: 1,
        tags: ['alcohol', 'beer', 'craft'],
        preparationTime: 2
      }
    ];

    // Add all products to database
    let successCount = 0;
    let failCount = 0;

    for (const product of products) {
      try {
        const created = await prisma.menuProduct.create({
          data: product
        });
        successCount++;
        console.log(`✅ [${successCount}/${products.length}] Created: ${created.name.en}`);
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to create ${product.name.en}:`, error.message);
      }
    }

    console.log(`\n🎉 Product seeding completed!`);
    console.log(`✅ Successfully created: ${successCount} products`);
    if (failCount > 0) {
      console.log(`❌ Failed: ${failCount} products`);
    }

    // Display summary
    const totalProducts = await prisma.menuProduct.count({
      where: { companyId: 'test-company-uuid-123456789' }
    });
    console.log(`\n📊 Total products in database: ${totalProducts}`);

  } catch (error) {
    console.error('❌ Error seeding products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed50Products();