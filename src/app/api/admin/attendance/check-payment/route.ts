import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('studentId')
    const courseId = searchParams.get('courseId')

    if (!studentId || !courseId) {
      return NextResponse.json(
        { error: 'Student ID and Course ID are required' },
        { status: 400 }
      )
    }

    // Find student by student ID
    const student = await prisma.student.findFirst({
      where: { studentId },
      include: {
        enrollments: {
          where: { isActive: true },
          include: {
            course: true
          }
        }
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Find course by code
    const course = await prisma.course.findFirst({
      where: { code: courseId }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check if student is enrolled in the course
    const enrollment = student.enrollments.find(e => e.courseId === course.id)
    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this course' },
        { status: 400 }
      )
    }

    // Get current month and year
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()

    // Check payment status for current month
    const payment = await prisma.payment.findFirst({
      where: {
        studentId: student.id,
        courseId: course.id,
        month: currentMonth,
        year: currentYear
      }
    })

    let paymentStatus = payment ? payment.status : 'PENDING'
    let isOverdue = paymentStatus === 'OVERDUE'

    // If payment is pending and due date has passed, mark as overdue
    if (payment && payment.status === 'PENDING' && payment.dueDate < currentDate) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'OVERDUE' }
      })
      paymentStatus = 'OVERDUE'
      isOverdue = true
    }

    return NextResponse.json({
      success: true,
      paymentStatus,
      hasPaid: paymentStatus === 'PAID',
      isOverdue,
      student: {
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        photo: student.photo
      },
      course: {
        id: course.id,
        code: course.code,
        name: course.name,
        fee: course.fee
      },
      payment: payment ? {
        id: payment.id,
        amount: payment.amount,
        dueDate: payment.dueDate.toISOString(),
        paidDate: payment.paidDate?.toISOString(),
        paymentMethod: payment.paymentMethod,
        reference: payment.reference
      } : null
    })
  } catch (error) {
    console.error('Error checking payment status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
