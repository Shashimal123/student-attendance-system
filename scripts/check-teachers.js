const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkTeachers() {
  try {
    console.log('Checking teachers...')
    
    const teachers = await prisma.teacher.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    })
    
    console.log('Found teachers:')
    teachers.forEach(teacher => {
      console.log(`  • ${teacher.firstName} ${teacher.lastName} (${teacher.user.email}) - ID: ${teacher.id}`)
    })
    
    if (teachers.length === 0) {
      console.log('No teachers found!')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTeachers()
