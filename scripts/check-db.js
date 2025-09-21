const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkAndFixDatabase() {
  try {
    console.log('Checking database...')
    
    // Check if admin exists
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      include: { admin: true }
    })
    
    if (!adminUser) {
      console.log('No admin user found. Creating default admin...')
      
      const hashedPassword = await bcrypt.hash('admin123', 10)
      
      const user = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'ADMIN',
          admin: {
            create: {
              firstName: 'System',
              lastName: 'Administrator',
              isActive: true
            }
          }
        }
      })
      
      console.log('Default admin created:', user.email)
    } else {
      console.log('Admin user exists:', adminUser.email)
    }
    
    // Check if any teachers exist
    const teacherCount = await prisma.teacher.count()
    console.log(`Found ${teacherCount} teachers`)
    
    // Check if any students exist
    const studentCount = await prisma.student.count()
    console.log(`Found ${studentCount} students`)
    
    // Check if any courses exist
    const courseCount = await prisma.course.count()
    console.log(`Found ${courseCount} courses`)
    
    console.log('Database check completed successfully!')
    
  } catch (error) {
    console.error('Database check failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAndFixDatabase()
