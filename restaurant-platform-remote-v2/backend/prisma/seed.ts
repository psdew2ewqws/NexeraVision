import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test company
  const company = await prisma.company.create({
    data: {
      id: 'test-company-uuid-123456789',
      name: 'Test Restaurant Company',
      slug: 'test-restaurant',
      businessType: 'RESTAURANT',
      timezone: 'Asia/Amman',
      defaultCurrency: 'JOD',
      status: 'active',
    },
  });

  console.log('✅ Created company:', company.name);

  // Create test branch
  const branch = await prisma.branch.create({
    data: {
      id: 'test-branch-uuid-123456789',
      name: 'Main Branch',
      nameAr: 'الفرع الرئيسي',
      company: {
        connect: { id: company.id }
      },
      phone: '+962788888888',
      address: '456 Branch Street, Amman, Jordan',
      timezone: 'Asia/Amman',
    },
  });

  console.log('✅ Created branch:', branch.name);

  // Create admin password hash
  const passwordHash = await bcrypt.hash('test123', 10);

  // Create super admin user
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      username: 'admin',
      name: 'Test Admin',
      passwordHash,
      role: 'super_admin',
      status: 'active',
      phone: '+962799999999',
      company: {
        connect: { id: company.id }
      }
    },
  });

  console.log('✅ Created super admin user:', superAdmin.email);

  // Create branch manager
  const branchManager = await prisma.user.create({
    data: {
      email: 'manager@test.com',
      username: 'manager',
      name: 'Branch Manager',
      passwordHash,
      role: 'branch_manager',
      status: 'active',
      phone: '+962777777777',
      company: {
        connect: { id: company.id }
      },
      branch: {
        connect: { id: branch.id }
      }
    },
  });

  console.log('✅ Created branch manager:', branchManager.email);

  // Create menu categories
  const categories = [
    { name: 'Appetizers', displayNumber: 1 },
    { name: 'Main Courses', displayNumber: 2 },
    { name: 'Desserts', displayNumber: 3 },
    { name: 'Beverages', displayNumber: 4 },
  ];

  for (const cat of categories) {
    const category = await prisma.menuCategory.create({
      data: {
        company: {
          connect: { id: company.id }
        },
        name: { en: cat.name, ar: cat.name },
        displayNumber: cat.displayNumber,
        isActive: true,
      },
    });
    console.log(`✅ Created category: ${cat.name}`);
  }

  // Create license for the company
  const license = await prisma.license.create({
    data: {
      company: {
        connect: { id: company.id }
      },
      status: 'active',
      startDate: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      features: {
        hasDelivery: true,
        hasTemplateBuilder: true,
        hasAdvancedPrinting: true,
        hasMultiLanguage: true,
        hasInventory: true,
      },
    },
  });

  console.log('✅ Created license for company');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('Email: admin@test.com');
  console.log('Password: test123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });