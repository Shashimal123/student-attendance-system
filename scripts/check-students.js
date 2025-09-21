const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkStudentsAndEnrollments() {
  try {
    console.log('🔍 Checking students and enrollments...')
    
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            email: true,
            isActive: true
          }
        },
        enrollments: {
          include: {
            course: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      }
    })
    
    console.log(`\n📊 Found ${students.length} students:`)
    
    students.forEach((student, index) => {
      console.log(`\n${index + 1}. ${student.firstName} ${student.lastName} (${student.studentId})`)
      console.log(`   Email: ${student.user.email}`)
      console.log(`   Enrollments: ${student.enrollments.length}`)
      
      if (student.enrollments.length > 0) {
        student.enrollments.forEach(enrollment => {
          console.log(`     - ${enrollment.course.name} (${enrollment.course.code})`)
        })
      } else {
        console.log(`     No enrollments`)
      }
    })
    
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        code: true
      }
    })
    
    console.log(`\n📚 Available courses (${courses.length}):`)
    courses.forEach(course => {
      console.log(`   - ${course.name} (${course.code})`)
    })
    
  } catch (error) {
    console.error('❌ Error checking data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkStudentsAndEnrollments()
