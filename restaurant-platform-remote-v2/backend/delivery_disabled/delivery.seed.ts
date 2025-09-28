import { PrismaService } from '../database/prisma.service';

export async function seedDeliveryData(prisma: PrismaService) {
  console.log('🌱 Seeding delivery data...');

  // Seed Jordan Locations
  const jordanLocations = [
    {
      governorate: 'Amman',
      city: 'Amman',
      district: 'Downtown',
      areaNameEn: 'Downtown Amman',
      areaNameAr: 'وسط عمان',
      postalCode: '11181',
      deliveryDifficulty: 2,
      averageDeliveryFee: 3.50,
      lat: 31.9539,
      lng: 35.9106,
      isActive: true
    },
    {
      governorate: 'Amman',
      city: 'Amman',
      district: 'Abdali',
      areaNameEn: 'Abdali',
      areaNameAr: 'العبدلي',
      postalCode: '11190',
      deliveryDifficulty: 1,
      averageDeliveryFee: 4.00,
      lat: 31.9628,
      lng: 35.9094,
      isActive: true
    },
    {
      governorate: 'Amman',
      city: 'Amman',
      district: 'Sweifieh',
      areaNameEn: 'Sweifieh',
      areaNameAr: 'الصويفية',
      postalCode: '11190',
      deliveryDifficulty: 2,
      averageDeliveryFee: 4.50,
      lat: 31.9342,
      lng: 35.8756,
      isActive: true
    },
    {
      governorate: 'Amman',
      city: 'Amman',
      district: 'Jabal Amman',
      areaNameEn: 'Jabal Amman',
      areaNameAr: 'جبل عمان',
      postalCode: '11118',
      deliveryDifficulty: 3,
      averageDeliveryFee: 5.00,
      lat: 31.9515,
      lng: 35.9239,
      isActive: true
    },
    {
      governorate: 'Zarqa',
      city: 'Zarqa',
      district: 'Center',
      areaNameEn: 'Zarqa Center',
      areaNameAr: 'وسط الزرقاء',
      postalCode: '13110',
      deliveryDifficulty: 3,
      averageDeliveryFee: 6.00,
      lat: 32.0728,
      lng: 36.0880,
      isActive: true
    }
  ];

  // Seed Delivery Providers
  const deliveryProviders = [
    {
      name: 'dhub',
      displayName: { en: 'DHUB Delivery', ar: 'دهب للتوصيل' },
      apiBaseUrl: 'https://jordon.dhub.pro/',
      isActive: true,
      priority: 1,
      supportedAreas: [],
      avgDeliveryTime: 25,
      baseFee: 2.00,
      feePerKm: 0.50,
      maxDistance: 15.00,
      configuration: {
        webhookUrl: 'https://api.example.com/webhook/dhub',
        timeout: 30000,
        retryAttempts: 3
      }
    },
    {
      name: 'careem',
      displayName: { en: 'Careem Express', ar: 'كريم اكسبريس' },
      apiBaseUrl: 'https://api.careem.com/',
      isActive: true,
      priority: 2,
      supportedAreas: [],
      avgDeliveryTime: 30,
      baseFee: 2.50,
      feePerKm: 0.60,
      maxDistance: 12.00,
      configuration: {
        webhookUrl: 'https://api.example.com/webhook/careem',
        timeout: 25000,
        retryAttempts: 2
      }
    },
    {
      name: 'talabat',
      displayName: { en: 'Talabat Delivery', ar: 'طلبات للتوصيل' },
      apiBaseUrl: 'https://api.talabat.com/',
      isActive: false,
      priority: 3,
      supportedAreas: [],
      avgDeliveryTime: 35,
      baseFee: 3.00,
      feePerKm: 0.40,
      maxDistance: 10.00,
      configuration: {
        webhookUrl: 'https://api.example.com/webhook/talabat',
        timeout: 35000,
        retryAttempts: 3
      }
    }
  ];

  try {
    // Create Jordan locations
    console.log('Creating Jordan locations...');
    for (const location of jordanLocations) {
      const existing = await prisma.jordanLocation.findFirst({
        where: { areaNameEn: location.areaNameEn }
      });
      
      if (!existing) {
        await prisma.jordanLocation.create({
          data: location
        });
        console.log(`✓ Created location: ${location.areaNameEn}`);
      }
    }

    // Create delivery providers
    console.log('Creating delivery providers...');
    for (const provider of deliveryProviders) {
      const existing = await prisma.deliveryProvider.findFirst({
        where: { name: provider.name }
      });
      
      if (!existing) {
        await prisma.deliveryProvider.create({
          data: provider
        });
        console.log(`✓ Created provider: ${provider.name}`);
      }
    }

    console.log('✅ Delivery seed data created successfully!');
  } catch (error) {
    console.error('❌ Error seeding delivery data:', error);
    throw error;
  }
}