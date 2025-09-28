import { PrismaService } from '../../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export async function seedGlobalLocations(prisma: PrismaService, locationsFilePath?: string) {
  console.log('🌍 Seeding massive global locations dataset...');
  
  // Default path to the 27k+ locations file
  const defaultPath = '/home/admin/Downloads/Picolinate/services/app/wwwroot/arupdated17_5_2022.json';
  const filePath = locationsFilePath || defaultPath;

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Locations file not found at: ${filePath}`);
    return;
  }

  try {
    console.log('📂 Reading locations file...');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const locationsData = JSON.parse(fileContent);
    
    // Combine both Sheet1 and Sheet2 for complete dataset
    const sheet1Locations = locationsData.Sheet1 || [];
    const sheet2Locations = locationsData.Sheet2 || [];
    const allLocations = [...sheet1Locations, ...sheet2Locations];
    
    console.log(`📊 Found ${sheet1Locations.length} locations in Sheet1`);
    console.log(`📊 Found ${sheet2Locations.length} locations in Sheet2`);
    console.log(`📊 Total ${allLocations.length} locations to import`);

    // Count existing locations
    const existingCount = await prisma.globalLocation.count();
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing global locations`);
      console.log('   This will update existing records and add new ones...');
    }

    // Process locations in batches for better performance
    const BATCH_SIZE = 1000;
    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < allLocations.length; i += BATCH_SIZE) {
      const batch = allLocations.slice(i, i + BATCH_SIZE);
      console.log(`   📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allLocations.length / BATCH_SIZE)} (${batch.length} records)`);

      const locationBatch = batch.map(location => {
        // Handle inconsistent field names (subareaname vs SubAreaName)
        const subAreaName = location.subareaname || location.SubAreaName || '';
        const areaName = location.areaname || location.AreaName || '';
        const cityName = location.cityname || location.CityName || '';
        const countryName = location.countryname || location.CountryName || 'الأردن';

        // Generate search text for efficient searching
        const searchText = `${subAreaName} ${areaName} ${cityName}`.toLowerCase();

        // Map governorates from city names
        const governorate = mapCityToGovernorate(cityName);

        return {
          countryName: 'Jordan', // English name
          countryNameAr: countryName, // Arabic name from data
          governorate: governorate,
          city: translateToEnglish(cityName), // Translate for English
          cityNameAr: cityName, // Keep Arabic original
          area: translateToEnglish(areaName) || 'Area', // Translate for English
          areaNameAr: areaName, // Keep Arabic original
          subArea: translateToEnglish(subAreaName), // Translate for English
          subAreaNameAr: subAreaName || null, // Keep Arabic original
          searchText: searchText,
          isActive: true,
          deliveryDifficulty: determineDifficulty(subAreaName, areaName),
          averageDeliveryFee: calculateDeliveryFee(areaName, cityName)
          // Completely removed originalId - using only our own UUIDs
        };
      });

      try {
        // Create all locations with fresh UUIDs (no deduplication based on their IDs)
        const createResult = await prisma.globalLocation.createMany({
          data: locationBatch,
          skipDuplicates: true // Skip any potential duplicates based on unique constraints
        });
        
        created += createResult.count;
        processed += locationBatch.length;

        // Progress indicator
        if (processed % 5000 === 0) {
          console.log(`      ✅ Progress: ${processed}/${allLocations.length} (${((processed/allLocations.length)*100).toFixed(1)}%)`);
        }

      } catch (error) {
        console.error(`   ❌ Batch error:`, error.message);
        errors += batch.length;
      }
    }

    const finalCount = await prisma.globalLocation.count();
    
    console.log('\n🎉 Global locations import completed!');
    console.log(`📊 Statistics:`);
    console.log(`   📝 Total processed: ${processed}`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📍 Total in database: ${finalCount}`);
    console.log(`\n🔍 Search capabilities enabled for ${finalCount} locations`);
    console.log(`🌍 Global locations are now available to ALL companies`);
    
    // Create some sample statistics
    const stats = await prisma.globalLocation.groupBy({
      by: ['city'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    console.log('\n🏙️  Top cities by location count:');
    for (const stat of stats) {
      console.log(`   📍 ${stat.city}: ${stat._count.id} locations`);
    }

  } catch (error) {
    console.error('❌ Failed to import global locations:', error);
    throw error;
  }
}

// Helper functions
function mapCityToGovernorate(cityArabic: string): string {
  const cityMap: { [key: string]: string } = {
    'عمان': 'Amman',
    'اربد': 'Irbid',
    'الزرقاء': 'Zarqa',
    'العقبة': 'Aqaba',
    'السلط': 'Balqa',
    'مادبا': 'Madaba',
    'جرش': 'Jerash',
    'عجلون': 'Ajloun',
    'الكرك': 'Karak',
    'معان': 'Ma\'an',
    'الطفيلة': 'Tafilah',
    'المفرق': 'Mafraq'
  };
  
  return cityMap[cityArabic] || 'Amman'; // Default to Amman
}

function translateToEnglish(arabicText: string): string {
  // Basic translation map for common area names
  const translationMap: { [key: string]: string } = {
    'طبربور': 'Tabarbour',
    'العبدلي': 'Abdali',
    'الشميساني': 'Shmeisani',
    'جبل الحسين': 'Jabal Hussein',
    'جبل عمان': 'Jabal Amman',
    'وسط البلد': 'Downtown',
    'الهاشمي': 'Hashemi',
    'النصر': 'Nasr',
    'الجامعة': 'University',
    'الرابية': 'Rabiyeh',
    'الصويفية': 'Sweifieh'
  };
  
  return translationMap[arabicText] || arabicText || 'Area';
}

function determineDifficulty(subArea: string, area: string): number {
  // Determine delivery difficulty based on area characteristics
  const difficultAreas = ['مخيم', 'منطقة صناعية', 'المطار']; // Camp, Industrial, Airport
  const easyAreas = ['مول', 'مركز تجاري', 'شارع رئيسي']; // Mall, Commercial center, Main street
  
  for (const difficult of difficultAreas) {
    if (subArea?.includes(difficult) || area?.includes(difficult)) {
      return 4; // Hard
    }
  }
  
  for (const easy of easyAreas) {
    if (subArea?.includes(easy) || area?.includes(easy)) {
      return 1; // Easy
    }
  }
  
  return 2; // Normal
}

function calculateDeliveryFee(area: string, city: string): number {
  // Base delivery fees in JOD
  const cityBaseFees: { [key: string]: number } = {
    'عمان': 2.50, // Amman
    'اربد': 3.00, // Irbid
    'الزرقاء': 3.50, // Zarqa
    'العقبة': 4.00, // Aqaba
  };
  
  const baseFee = cityBaseFees[city] || 3.00;
  
  // Adjust based on area characteristics
  if (area?.includes('مول') || area?.includes('مركز')) {
    return baseFee - 0.50; // Discount for malls/centers
  }
  
  if (area?.includes('مخيم') || area?.includes('بعيد')) {
    return baseFee + 1.00; // Premium for difficult areas
  }
  
  return baseFee;
}

export default seedGlobalLocations;