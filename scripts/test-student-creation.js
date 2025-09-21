const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testStudentCreation() {
  try {
    console.log('🧪 Testing Student Creation...\n')
    
    // Test 1: Check if we can create a user
    console.log('1. Testing user creation...')
    const hashedPassword = await bcrypt.hash('test123', 10)
    
    const user = await prisma.user.create({
      data: {
        email: 'teststudent@example.com',
        password: hashedPassword,
        role: 'STUDENT'
      }
    })
    
    console.log('✅ User created:', user.email)
    
    // Test 2: Check if we can create a student
    console.log('2. Testing student creation...')
    
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        studentId: `STU${Date.now().toString().slice(-6)}`,
        firstName: 'Test',
        lastName: 'Student',
        dateOfBirth: new Date('2000-01-01'),
        phone: '1234567890',
        address: 'Test Address',
        parentName: 'Test Parent',
        parentPhone: '0987654321',
        parentEmail: 'parent@example.com',
        qrCode: `STU${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
        isActive: true
      }
    })
    
    console.log('✅ Student created:', student.studentId)
    
    // Test 3: Check if we can create a course
    console.log('3. Testing course creation...')
    
    // Get the first available teacher
    const teacher = await prisma.teacher.findFirst()
    if (!teacher) {
      throw new Error('No teacher found. Please create a teacher first.')
    }
    
    const course = await prisma.course.create({
      data: {
        name: 'Test Course',
        description: 'A test course',
        code: 'TEST101',
        fee: 100.00,
        duration: 6,
        teacherId: teacher.id
      }
    })
    
    console.log('✅ Course created:', course.code)
    
    // Test 4: Check if we can enroll student in course
    console.log('4. Testing course enrollment...')
    
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id,
        isActive: true
      }
    })
    
    console.log('✅ Enrollment created')
    
    console.log('\n🎉 All tests passed! Student creation is working.')
    
    // Clean up - delete test data
    console.log('\n🧹 Cleaning up test data...')
    await prisma.courseEnrollment.delete({ where: { id: enrollment.id } })
    await prisma.course.delete({ where: { id: course.id } })
    await prisma.student.delete({ where: { id: student.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log('✅ Test data cleaned up')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.log('\n🔧 Error details:')
    console.log('   • Error name:', error.name)
    console.log('   • Error message:', error.message)
    console.log('   • Error code:', error.code)
  } finally {
    await prisma.$disconnect()
  }
}

testStudentCreation()
