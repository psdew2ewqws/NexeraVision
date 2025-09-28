const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'company_owner',
        status: 'active',
        companyId: '1' // assuming company with ID 1 exists
      }
    });
    
    console.log('Test user created:', user);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
