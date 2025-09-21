const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkQRSystem() {
  try {
    console.log('🔍 Checking QR Code System...\n')
    
    // Check if students have QR codes
    const students = await prisma.student.findMany({
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        qrCode: true,
        isActive: true
      }
    })
    
    console.log(`📊 Found ${students.length} students:`)
    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.firstName} ${student.lastName}`)
      console.log(`   Student ID: ${student.studentId}`)
      console.log(`   QR Code: ${student.qrCode}`)
      console.log(`   Active: ${student.isActive}`)
      console.log('')
    })
    
    // Check if there are any courses
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true
      }
    })
    
    console.log(`📚 Found ${courses.length} courses:`)
    courses.forEach((course, index) => {
      console.log(`${index + 1}. ${course.name} (${course.code})`)
      console.log(`   Course ID: ${course.id}`)
      console.log(`   Active: ${course.isActive}`)
      console.log('')
    })
    
    console.log('🔧 QR Scanner Troubleshooting Guide:')
    console.log('1. Make sure you are using HTTPS (required for camera access)')
    console.log('2. Check browser camera permissions')
    console.log('3. Try different browsers (Chrome, Firefox, Edge)')
    console.log('4. Ensure camera is not being used by another application')
    console.log('5. Test on mobile device for better camera access')
    
    console.log('\n📱 Test URLs:')
    console.log('• Admin Scanner: http://localhost:3002/admin/attendance/scanner')
    console.log('• Teacher Scanner: http://localhost:3002/teacher/attendance')
    console.log('• Test QR Page: http://localhost:3002/test-qr')
    
  } catch (error) {
    console.error('❌ Error checking QR system:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkQRSystem()

