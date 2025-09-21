const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createPaymentTestData() {
  try {
    console.log('🔧 Creating payment test data...')

    // Create test admin
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'ADMIN'
      }
    })

    const admin = await prisma.admin.create({
      data: {
        userId: adminUser.id,
        firstName: 'Test',
        lastName: 'Admin'
      }
    })

    // Create test teacher
    const teacherUser = await prisma.user.create({
      data: {
        email: 'teacher@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'TEACHER'
      }
    })

    const teacher = await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      }
    })

    // Create test courses
    const course1 = await prisma.course.create({
      data: {
        name: 'Mathematics 101',
        code: 'MATH101',
        description: 'Introduction to Mathematics',
        fee: 150.00,
        duration: 3,
        teacherId: teacher.id
      }
    })

    const course2 = await prisma.course.create({
      data: {
        name: 'Physics 101',
        code: 'PHYS101',
        description: 'Introduction to Physics',
        fee: 200.00,
        duration: 4,
        teacherId: teacher.id
      }
    })

    // Create test students
    const students = []
    for (let i = 1; i <= 5; i++) {
      const studentUser = await prisma.user.create({
        data: {
          email: `student${i}@test.com`,
          password: await bcrypt.hash('password123', 10),
          role: 'STUDENT'
        }
      })

      const student = await prisma.student.create({
        data: {
          userId: studentUser.id,
          studentId: `STU${String(i).padStart(3, '0')}`,
          firstName: `Student${i}`,
          lastName: 'Test',
          dateOfBirth: new Date(2000, 0, 1),
          phone: `+123456789${i}`,
          qrCode: `STU${String(i).padStart(3, '0')}`
        }
      })

      students.push(student)
    }

    // Enroll students in courses
    for (const student of students) {
      await prisma.courseEnrollment.create({
        data: {
          studentId: student.id,
          courseId: course1.id
        }
      })

      if (student.studentId === 'STU001' || student.studentId === 'STU002') {
        await prisma.courseEnrollment.create({
          data: {
            studentId: student.id,
            courseId: course2.id
          }
        })
      }
    }

    // Create payment records for current month
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    const dueDate = new Date(currentYear, currentMonth - 1, 15)
    const gracePeriodStart = new Date(dueDate)
    const gracePeriodEnd = new Date(dueDate)
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 14)

    // Student 1: Paid
    await prisma.payment.create({
      data: {
        studentId: students[0].id,
        courseId: course1.id,
        month: currentMonth,
        year: currentYear,
        amount: course1.fee,
        status: 'PAID',
        dueDate,
        paidDate: new Date(),
        paymentMethod: 'CASH',
        reference: 'REC001',
        gracePeriodStart,
        gracePeriodEnd
      }
    })

    // Student 2: Pending
    await prisma.payment.create({
      data: {
        studentId: students[1].id,
        courseId: course1.id,
        month: currentMonth,
        year: currentYear,
        amount: course1.fee,
        status: 'PENDING',
        dueDate,
        gracePeriodStart,
        gracePeriodEnd
      }
    })

    // Student 3: Grace Period
    await prisma.payment.create({
      data: {
        studentId: students[2].id,
        courseId: course1.id,
        month: currentMonth,
        year: currentYear,
        amount: course1.fee,
        status: 'GRACE_PERIOD',
        dueDate,
        gracePeriodStart,
        gracePeriodEnd
      }
    })

    // Student 4: Overdue
    await prisma.payment.create({
      data: {
        studentId: students[3].id,
        courseId: course1.id,
        month: currentMonth,
        year: currentYear,
        amount: course1.fee,
        status: 'OVERDUE',
        dueDate,
        gracePeriodStart,
        gracePeriodEnd
      }
    })

    // Student 5: No payment record (will be created automatically)

    // Create some past payments for teacher payout testing
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear

    // Last month payments
    await prisma.payment.create({
      data: {
        studentId: students[0].id,
        courseId: course1.id,
        month: lastMonth,
        year: lastMonthYear,
        amount: course1.fee,
        status: 'PAID',
        dueDate: new Date(lastMonthYear, lastMonth - 1, 15),
        paidDate: new Date(lastMonthYear, lastMonth - 1, 20),
        paymentMethod: 'CARD',
        reference: 'REC002'
      }
    })

    await prisma.payment.create({
      data: {
        studentId: students[1].id,
        courseId: course1.id,
        month: lastMonth,
        year: lastMonthYear,
        amount: course1.fee,
        status: 'PAID',
        dueDate: new Date(lastMonthYear, lastMonth - 1, 15),
        paidDate: new Date(lastMonthYear, lastMonth - 1, 18),
        paymentMethod: 'BANK_TRANSFER',
        reference: 'REC003'
      }
    })

    await prisma.payment.create({
      data: {
        studentId: students[0].id,
        courseId: course2.id,
        month: lastMonth,
        year: lastMonthYear,
        amount: course2.fee,
        status: 'PAID',
        dueDate: new Date(lastMonthYear, lastMonth - 1, 15),
        paidDate: new Date(lastMonthYear, lastMonth - 1, 22),
        paymentMethod: 'MOBILE_PAYMENT',
        reference: 'REC004'
      }
    })

    console.log('✅ Payment test data created successfully!')
    console.log('\n📊 Test Data Summary:')
    console.log(`- Admin: ${admin.firstName} ${admin.lastName} (${adminUser.email})`)
    console.log(`- Teacher: ${teacher.firstName} ${teacher.lastName} (${teacherUser.email})`)
    console.log(`- Courses: ${course1.name} ($${course1.fee}), ${course2.name} ($${course2.fee})`)
    console.log(`- Students: ${students.length} students enrolled`)
    console.log(`- Current Month Payments:`)
    console.log(`  - Student 1: PAID`)
    console.log(`  - Student 2: PENDING`)
    console.log(`  - Student 3: GRACE_PERIOD`)
    console.log(`  - Student 4: OVERDUE`)
    console.log(`  - Student 5: No record (will be auto-created)`)
    console.log(`- Last Month Payments: 3 paid payments for teacher payout testing`)

  } catch (error) {
    console.error('❌ Error creating payment test data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createPaymentTestData()
