#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import seedGlobalLocations from '../src/modules/delivery/seeds/global-locations.seed';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Starting massive global locations import...');
    console.log('📂 Source: 27,858 lines from Picolinate locations file');
    console.log('🎯 Target: Global locations table (available to all companies)\n');
    
    const startTime = Date.now();
    await seedGlobalLocations(prisma as any);
    const endTime = Date.now();
    
    const duration = Math.round((endTime - startTime) / 1000);
    console.log(`\n⏱️  Import completed in ${duration} seconds`);
    console.log('\n✅ Global locations import successful!');
    console.log('\n🌍 Benefits:');
    console.log('   📍 27k+ searchable locations available globally');
    console.log('   🏢 All companies can access these locations');
    console.log('   🔍 Fast search with optimized indexes');
    console.log('   🗺️  Hierarchical structure: Country > Governorate > City > Area > SubArea');
    console.log('   💰 Smart delivery fee calculation');
    console.log('   📊 Delivery difficulty assessment');
    
  } catch (error) {
    console.error('❌ Failed to import global locations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();