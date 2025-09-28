const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUserAndCompany() {
  try {
    console.log('Creating test company and user...');
    
    // Check if test company already exists
    let company = await prisma.company.findUnique({
      where: { slug: 'restaurant-platform-demo' }
    });
    
    if (!company) {
      console.log('Creating test company...');
      company = await prisma.company.create({
        data: {
          name: 'Restaurant Platform Demo',
          slug: 'restaurant-platform-demo',
          businessType: 'restaurant',
          timezone: 'Asia/Amman',
          defaultCurrency: 'JOD',
          status: 'active',
        }
      });
      console.log('Test company created:', company.name);
    } else {
      console.log('Test company already exists:', company.name);
    }
    
    // Check if test user already exists
    let user = await prisma.user.findUnique({
      where: { email: 'admin@restaurantplatform.com' }
    });
    
    if (!user) {
      console.log('Creating test user...');
      const hashedPassword = await bcrypt.hash('test123', 12);
      
      user = await prisma.user.create({
        data: {
          name: 'Admin User',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@restaurantplatform.com',
          username: 'admin',
          passwordHash: hashedPassword,
          role: 'super_admin',
          status: 'active',
          companyId: company.id,
          language: 'en',
          timezone: 'Asia/Amman'
        }
      });
      console.log('Test user created:', user.email);
    } else {
      console.log('Test user already exists:', user.email);
      // Update password if user exists
      const hashedPassword = await bcrypt.hash('test123', 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword }
      });
      console.log('Test user password updated');
    }
    
    console.log('\n✅ Test setup complete!');
    console.log(`Company: ${company.name} (${company.slug})`);
    console.log(`User: ${user.email}`);
    console.log(`Password: test123`);
    console.log(`Role: ${user.role}`);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUserAndCompany();