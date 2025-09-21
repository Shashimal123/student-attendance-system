const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('🔍 Checking all users in the system...\n')
    
    const users = await prisma.user.findMany({
      include: {
        student: true,
        teacher: true,
        admin: true
      }
    })
    
    console.log(`📊 Found ${users.length} users:\n`)
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Active: ${user.isActive}`)
      console.log(`   Created: ${user.createdAt.toISOString()}`)
      
      if (user.student) {
        console.log(`   Student: ${user.student.firstName} ${user.student.lastName} (${user.student.studentId})`)
      }
      if (user.teacher) {
        console.log(`   Teacher: ${user.teacher.firstName} ${user.teacher.lastName}`)
      }
      if (user.admin) {
        console.log(`   Admin: ${user.admin.firstName} ${user.admin.lastName}`)
      }
      console.log('')
    })
    
    console.log('🔑 Test credentials (password: password123):')
    console.log('   • Admin: admin@test.com')
    console.log('   • Teacher: teacher@test.com')
    console.log('   • Students: student1@test.com, student2@test.com, etc.')
    
  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()

