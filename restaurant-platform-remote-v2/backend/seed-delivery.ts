import { PrismaClient } from '@prisma/client';
import { seedDeliveryData } from './src/modules/delivery/delivery.seed';

const prisma = new PrismaClient();

async function main() {
  try {
    await seedDeliveryData(prisma as any);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();