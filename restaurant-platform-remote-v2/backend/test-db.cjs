const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Testing database connection...');

    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check if companies table has data
    console.log('\n📊 Checking companies table...');
    const companiesCount = await prisma.company.count();
    console.log(`Companies count: ${companiesCount}`);

    if (companiesCount > 0) {
      const companies = await prisma.company.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true
        }
      });
      console.log('Sample companies:', JSON.stringify(companies, null, 2));
    } else {
      console.log('⚠️  No companies found in database');

      // Create a test company
      console.log('\n🏗️  Creating test company...');
      const testCompany = await prisma.company.create({
        data: {
          name: 'Test Restaurant Chain',
          slug: 'test-restaurant',
          status: 'active',
          businessType: 'restaurant',
          timezone: 'UTC',
        }
      });
      console.log('✅ Test company created:', testCompany);
    }

    // Test the companies API endpoint logic
    console.log('\n🧪 Testing companies query logic...');
    const result = await prisma.company.findMany({
      skip: 0,
      take: 10,
      where: {
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`Query result count: ${result.length}`);

  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase().catch(console.error);