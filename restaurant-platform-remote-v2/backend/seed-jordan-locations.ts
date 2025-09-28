import { PrismaClient } from '@prisma/client';
import { seedGlobalLocations } from './src/domains/delivery/seeds/global-locations.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Jordan locations seeding...');

  try {
    // Seed the global locations (Jordan locations)
    await seedGlobalLocations(prisma as any);

    console.log('\n✅ Jordan locations seeding completed successfully!');

    // Get counts
    const globalLocationCount = await prisma.globalLocation.count();
    const jordanLocationCount = await prisma.jordanLocation.count();

    console.log(`\n📊 Summary:`);
    console.log(`   📍 Global Locations: ${globalLocationCount}`);
    console.log(`   🇯🇴 Jordan Locations: ${jordanLocationCount}`);

  } catch (error) {
    console.error('❌ Jordan locations seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();