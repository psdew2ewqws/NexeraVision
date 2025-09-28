#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import seedAdditionalDeliveryProviders from '../src/modules/delivery/seeds/additional-providers.seed';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    await seedAdditionalDeliveryProviders(prisma as any);
    console.log('✅ Additional delivery providers seeded successfully!');
  } catch (error) {
    console.error('❌ Failed to seed additional delivery providers:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();