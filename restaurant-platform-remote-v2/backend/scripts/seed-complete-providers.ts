#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import seedCompleteDeliveryProviders from '../src/modules/delivery/seeds/complete-providers.seed';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Starting complete delivery providers ecosystem setup...\n');
    await seedCompleteDeliveryProviders(prisma as any);
    console.log('\n✅ Complete delivery providers seeded successfully!');
    console.log('\nThe restaurant platform now supports:');
    console.log('📍 11 Major delivery providers across the Middle East');
    console.log('📍 4 Special delivery types (Talabat variants, pay methods)');
    console.log('📍 Multi-tenant configuration support');
    console.log('📍 Regional currency and payment method support');
    console.log('📍 Webhook integration endpoints');
    console.log('📍 Complete order type mapping from Picolinate analysis');
  } catch (error) {
    console.error('❌ Failed to seed complete delivery providers:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();