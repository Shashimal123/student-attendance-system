const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testPasswordVerification() {
  try {
    console.log('🔐 Testing password verification...\n')
    
    // Test with admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@test.com' }
    })
    
    if (!adminUser) {
      console.log('❌ Admin user not found')
      return
    }
    
    console.log('Testing admin@test.com:')
    console.log('Stored password hash:', adminUser.password.substring(0, 20) + '...')
    
    // Test different passwords
    const testPasswords = ['password123', 'admin123', 'test123', 'password']
    
    for (const password of testPasswords) {
      const isValid = await bcrypt.compare(password, adminUser.password)
      console.log(`Password "${password}": ${isValid ? '✅ VALID' : '❌ INVALID'}`)
    }
    
    console.log('\n🔍 Testing authentication function...')
    
    // Test the authenticateUser function logic
    const email = 'admin@test.com'
    const password = 'password123'
    
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
        teacher: true,
        admin: true,
      },
    })
    
    console.log('User found:', user ? 'YES' : 'NO')
    console.log('User active:', user?.isActive)
    
    if (user && user.isActive) {
      const isValidPassword = await bcrypt.compare(password, user.password)
      console.log('Password valid:', isValidPassword)
      
      if (isValidPassword) {
        console.log('✅ Authentication would succeed')
      } else {
        console.log('❌ Authentication would fail - invalid password')
      }
    } else {
      console.log('❌ Authentication would fail - user not found or inactive')
    }
    
  } catch (error) {
    console.error('❌ Error testing password verification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPasswordVerification()

