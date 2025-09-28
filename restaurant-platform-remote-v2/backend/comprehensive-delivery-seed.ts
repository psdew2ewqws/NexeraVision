import { PrismaClient } from '@prisma/client';
import { seedDeliveryData } from './src/modules/delivery/delivery.seed';
import { seedDeliveryZones } from './src/modules/delivery/delivery-zones.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting comprehensive delivery system seeding...');
  
  try {
    // First, seed the basic delivery data (locations and providers)
    console.log('\n📍 Step 1: Seeding Jordan locations and delivery providers...');
    await seedDeliveryData(prisma as any);

    // Then, seed delivery zones (requires branches to exist)
    console.log('\n🚛 Step 2: Seeding delivery zones...');
    await seedDeliveryZones(prisma as any);

    console.log('\n✅ Comprehensive delivery system seeding completed successfully!');
    console.log('\n📊 Summary:');
    
    // Get counts
    const [locationCount, providerCount, zoneCount] = await Promise.all([
      prisma.jordanLocation.count(),
      prisma.deliveryProvider.count(),
      prisma.deliveryZone.count()
    ]);
    
    console.log(`   📍 Jordan Locations: ${locationCount}`);
    console.log(`   🚚 Delivery Providers: ${providerCount}`);
    console.log(`   🗺️  Delivery Zones: ${zoneCount}`);
    
    console.log('\n🎯 Available Features:');
    console.log('   ✓ Jordan location hierarchy (Governorate → City → District)');
    console.log('   ✓ Multi-provider support (DHUB, Careem, Talabat)');
    console.log('   ✓ Comprehensive delivery zones covering Amman metro area');
    console.log('   ✓ Easy API integration system with standardized interfaces');
    console.log('   ✓ Real-time order tracking and webhook processing');
    console.log('   ✓ Automatic provider selection based on fees and priority');
    
    console.log('\n🔧 Next Steps:');
    console.log('   1. Configure API keys for providers in the database');
    console.log('   2. Test provider connections using the integration service');
    console.log('   3. Customize delivery zones through the admin interface');
    console.log('   4. Set up webhook endpoints for real-time updates');
    
  } catch (error) {
    console.error('❌ Comprehensive delivery seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();