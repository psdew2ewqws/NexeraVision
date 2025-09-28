const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create company if it doesn't exist
    const company = await prisma.company.upsert({
      where: { slug: 'test-restaurant' },
      update: {},
      create: {
        name: 'Test Restaurant Company',
        slug: 'test-restaurant',
        businessType: 'restaurant',
        timezone: 'America/New_York',
        defaultCurrency: 'USD',
        status: 'active'
      }
    });

    console.log('Company created/found:', company.name);

    // Create branch if it doesn't exist
    const branch = await prisma.branch.upsert({
      where: { id: 'f97ceb38-c797-4d1c-9ff4-89d9f8da5235' },
      update: {},
      create: {
        id: 'f97ceb38-c797-4d1c-9ff4-89d9f8da5235',
        name: 'Main Branch',
        nameAr: 'الفرع الرئيسي',
        companyId: company.id,
        phone: '+1-555-0123',
        email: 'main@testrestaurant.com',
        address: '123 Test Street',
        city: 'Test City',
        country: 'US',
        timezone: 'America/New_York',
        isActive: true,
        allowsOnlineOrders: true,
        allowsDelivery: true,
        allowsPickup: true,
        isDefault: true
      }
    });

    console.log('Branch created/found:', branch.name);

    // Create test user
    const user = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        passwordHash: hashedPassword,
        name: 'Admin User',
        role: 'super_admin',
        companyId: company.id,
        branchId: branch.id
      }
    });

    console.log('✅ Test user created successfully!');
    console.log('Email: admin@test.com');
    console.log('Password: password123');
    console.log('Role:', user.role);
    console.log('Company:', company.name);
    console.log('Branch:', branch.name);

    // Also create a company owner for testing
    const companyOwner = await prisma.user.upsert({
      where: { email: 'owner@test.com' },
      update: {},
      create: {
        email: 'owner@test.com',
        passwordHash: hashedPassword,
        name: 'Company Owner',
        role: 'company_owner',
        companyId: company.id,
        branchId: branch.id
      }
    });

    console.log('✅ Company owner created successfully!');
    console.log('Email: owner@test.com');
    console.log('Password: password123');
    console.log('Role:', companyOwner.role);

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();