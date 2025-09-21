const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestData() {
  try {
    console.log('🧪 Creating Test Data...\n')
    
    // Create a teacher
    console.log('1. Creating teacher...')
    const teacherPassword = await bcrypt.hash('teacher123', 10)
    
    const teacherUser = await prisma.user.create({
      data: {
        email: 'teacher@example.com',
        password: teacherPassword,
        role: 'TEACHER'
      }
    })
    
    const teacher = await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        firstName: 'John',
        lastName: 'Doe',
        phone: '1234567890',
        isActive: true
      }
    })
    
    console.log('✅ Teacher created:', teacher.firstName, teacher.lastName)
    
    // Create a course
    console.log('2. Creating course...')
    const course = await prisma.course.create({
      data: {
        name: 'Mathematics',
        description: 'Basic mathematics course',
        code: 'MATH101',
        fee: 150.00,
        duration: 6,
        teacherId: teacher.id
      }
    })
    
    console.log('✅ Course created:', course.name, `(${course.code})`)
    
    // Create a student
    console.log('3. Creating student...')
    const studentPassword = await bcrypt.hash('student123', 10)
    
    const studentUser = await prisma.user.create({
      data: {
        email: 'student@example.com',
        password: studentPassword,
        role: 'STUDENT'
      }
    })
    
    const student = await prisma.student.create({
      data: {
        userId: studentUser.id,
        studentId: `STU${Date.now().toString().slice(-6)}`,
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: new Date('2000-01-01'),
        phone: '0987654321',
        address: '123 Student St',
        parentName: 'Parent Smith',
        parentPhone: '1122334455',
        parentEmail: 'parent@example.com',
        qrCode: `STU${Date.now()}-${Math.random().toString(36).substr(2, 8)}`,
        isActive: true
      }
    })
    
    console.log('✅ Student created:', student.firstName, student.lastName, `(${student.studentId})`)
    
    // Enroll student in course
    console.log('4. Enrolling student in course...')
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        studentId: student.id,
        courseId: course.id,
        isActive: true
      }
    })
    
    console.log('✅ Enrollment created')
    
    console.log('\n🎉 Test data created successfully!')
    console.log('\n📋 Test Credentials:')
    console.log('   • Admin: admin@example.com / admin123')
    console.log('   • Teacher: teacher@example.com / teacher123')
    console.log('   • Student: student@example.com / student123')
    console.log('\n📚 Course: MATH101 - Mathematics')
    console.log('👨‍🎓 Student ID:', student.studentId)
    
  } catch (error) {
    console.error('❌ Error creating test data:', error)
    console.log('\n🔧 Error details:')
    console.log('   • Error name:', error.name)
    console.log('   • Error message:', error.message)
    console.log('   • Error code:', error.code)
  } finally {
    await prisma.$disconnect()
  }
}

createTestData()
