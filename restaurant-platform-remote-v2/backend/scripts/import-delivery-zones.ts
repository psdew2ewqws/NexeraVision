#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { seedDeliveryZones } from '../src/modules/delivery/delivery-zones.seed';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚛 Starting delivery zones import...');
    console.log('📂 Target: DeliveryZone table\n');
    
    const startTime = Date.now();
    await seedDeliveryZones(prisma as any);
    const endTime = Date.now();
    
    const duration = Math.round((endTime - startTime) / 1000);
    console.log(`\n⏱️  Import completed in ${duration} seconds`);
    console.log('\n✅ Delivery zones import successful!');
    console.log('\n🗺️  Benefits:');
    console.log('   📍 Comprehensive Jordan delivery coverage');
    console.log('   🏢 Company-specific zone assignments');
    console.log('   💰 Smart delivery fee structure');
    console.log('   📊 Priority-based zone management');
    console.log('   ⏰ Optimized delivery time estimates');
    
  } catch (error) {
    console.error('❌ Failed to import delivery zones:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();