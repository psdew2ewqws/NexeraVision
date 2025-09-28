const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting simple Jordan locations seeding...');

  try {
    // Sample Jordan locations data
    const jordanLocations = [
      {
        governorate: 'Amman',
        city: 'Amman',
        district: 'Downtown',
        area_name_en: 'Abdali',
        area_name_ar: 'العبدلي',
        postal_code: '11118',
        delivery_difficulty: 1,
        average_delivery_fee: 2.50,
        lat: 31.9515694,
        lng: 35.9239625,
        is_active: true,
      },
      {
        governorate: 'Amman',
        city: 'Amman',
        district: 'Shmeisani',
        area_name_en: 'Shmeisani',
        area_name_ar: 'الشميساني',
        postal_code: '11181',
        delivery_difficulty: 1,
        average_delivery_fee: 2.50,
        lat: 31.9615694,
        lng: 35.9339625,
        is_active: true,
      },
      {
        governorate: 'Amman',
        city: 'Amman',
        district: 'Jabal Amman',
        area_name_en: 'Jabal Amman',
        area_name_ar: 'جبل عمان',
        postal_code: '11118',
        delivery_difficulty: 2,
        average_delivery_fee: 2.50,
        lat: 31.9515694,
        lng: 35.9239625,
        is_active: true,
      },
      {
        governorate: 'Amman',
        city: 'Amman',
        district: 'Sweifieh',
        area_name_en: 'Sweifieh',
        area_name_ar: 'الصويفية',
        postal_code: '11910',
        delivery_difficulty: 1,
        average_delivery_fee: 2.50,
        lat: 31.9215694,
        lng: 35.9139625,
        is_active: true,
      },
      {
        governorate: 'Irbid',
        city: 'Irbid',
        district: 'University',
        area_name_en: 'Yarmouk University',
        area_name_ar: 'جامعة اليرموك',
        postal_code: '21110',
        delivery_difficulty: 2,
        average_delivery_fee: 3.00,
        lat: 32.5562,
        lng: 35.8781,
        is_active: true,
      },
      {
        governorate: 'Zarqa',
        city: 'Zarqa',
        district: 'City Center',
        area_name_en: 'Zarqa Center',
        area_name_ar: 'وسط الزرقاء',
        postal_code: '13110',
        delivery_difficulty: 2,
        average_delivery_fee: 3.50,
        lat: 32.0833,
        lng: 36.0833,
        is_active: true,
      },
      {
        governorate: 'Aqaba',
        city: 'Aqaba',
        district: 'Port Area',
        area_name_en: 'Aqaba Port',
        area_name_ar: 'ميناء العقبة',
        postal_code: '77110',
        delivery_difficulty: 3,
        average_delivery_fee: 4.00,
        lat: 29.5321,
        lng: 35.0062,
        is_active: true,
      }
    ];

    // Insert Jordan locations
    console.log('📍 Creating Jordan locations...');
    const result = await prisma.jordanLocation.createMany({
      data: jordanLocations,
      skipDuplicates: true,
    });

    console.log(`✅ Created ${result.count} Jordan locations`);

    // Get final count
    const totalCount = await prisma.jordanLocation.count();
    console.log(`📊 Total Jordan locations in database: ${totalCount}`);

    console.log('\n🎉 Simple seeding completed successfully!');
    console.log('🚀 You can now see locations in the Delivery Settings page');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();