const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testQRScanning() {
  try {
    console.log('🧪 Testing QR Code Scanning...\n')
    
    // Get all students
    const students = await prisma.student.findMany({
      include: {
        user: true,
        enrollments: {
          include: {
            course: true
          }
        }
      }
    })
    
    console.log('Found students:')
    students.forEach(student => {
      console.log(`  • ${student.firstName} ${student.lastName}`)
      console.log(`    - Student ID: ${student.studentId}`)
      console.log(`    - QR Code: ${student.qrCode}`)
      console.log(`    - Enrollments: ${student.enrollments.length}`)
      student.enrollments.forEach(enrollment => {
        console.log(`      * ${enrollment.course.code} - ${enrollment.course.name}`)
      })
      console.log('')
    })
    
    // Get all courses
    const courses = await prisma.course.findMany({
      include: {
        teacher: {
          include: {
            user: true
          }
        }
      }
    })
    
    console.log('Found courses:')
    courses.forEach(course => {
      console.log(`  • ${course.code} - ${course.name}`)
      console.log(`    - Teacher: ${course.teacher.firstName} ${course.teacher.lastName}`)
      console.log(`    - Teacher Email: ${course.teacher.user.email}`)
      console.log('')
    })
    
    // Test student lookup by studentId
    if (students.length > 0) {
      const testStudent = students[0]
      console.log('Testing student lookup by studentId:')
      console.log(`  Looking for: ${testStudent.studentId}`)
      
      const foundByStudentId = await prisma.student.findUnique({
        where: { studentId: testStudent.studentId }
      })
      console.log(`  Found by studentId: ${foundByStudentId ? 'Yes' : 'No'}`)
      
      // Test student lookup by qrCode
      console.log('Testing student lookup by qrCode:')
      console.log(`  Looking for: ${testStudent.qrCode}`)
      
      const foundByQRCode = await prisma.student.findUnique({
        where: { qrCode: testStudent.qrCode }
      })
      console.log(`  Found by qrCode: ${foundByQRCode ? 'Yes' : 'No'}`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testQRScanning()
