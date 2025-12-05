import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method === 'POST') {
    try {
      const { studentId, courseId } = await req.json()

      if (!studentId || !courseId) {
        return NextResponse.json(
          { error: 'Student ID and Course ID are required' },
          { status: 400 }
        )
      }

      // Find student
      const student = await prisma.student.findFirst({
        where: { studentId }
      })

      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        )
      }

      // FIX: payment check null handling
      // Find course by either internal id or public code
      const course = await prisma.course.findFirst({
        where: {
          OR: [
            { id: courseId },
            { code: courseId }
          ]
        }
      })

      if (!course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        )
      }

      // Get current month and year
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      // Find payment for current month
      const payment = await prisma.payment.findFirst({
        where: {
          studentId: student.id,
          courseId: course.id,
          month: currentMonth,
          year: currentYear
        }
      })

      let paymentStatus = 'NO_PAYMENT_RECORD'
      let canAttend = true
      let message = ''
      let allowLatePayment = false
      let requiresLatePayment = false

      if (payment) {
        paymentStatus = payment.status

        switch (payment.status) {
          case 'PAID':
            canAttend = true
            message = 'Payment completed. Attendance allowed.'
            break
          
          case 'PENDING':
            allowLatePayment = true
            message = 'Payment pending for this month.'
            break
          
          case 'GRACE_PERIOD':
            allowLatePayment = true
            message = 'Payment pending for this month. Grace period active.'
            break
          
          case 'OVERDUE':
            canAttend = false
            allowLatePayment = true
            requiresLatePayment = true
            message = 'Payment overdue for this month.'
            break
          
          default:
            canAttend = true
            message = 'Payment status unclear. Attendance allowed.'
        }
      } else {
        // No payment record exists - create one automatically
        const dueDate = new Date(currentYear, currentMonth - 1, 15)
        const gracePeriodStart = new Date(dueDate)
        const gracePeriodEnd = new Date(dueDate)
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 14)

        let status: 'PENDING' | 'GRACE_PERIOD' | 'OVERDUE' = 'PENDING'
        if (now > gracePeriodEnd) {
          status = 'OVERDUE'
          canAttend = false
          allowLatePayment = true
          requiresLatePayment = true
          message = 'Payment overdue for this month.'
        } else if (now > dueDate) {
          status = 'GRACE_PERIOD'
          canAttend = true
          allowLatePayment = true
          message = 'Payment pending for this month. Grace period active.'
        } else {
          canAttend = true
          allowLatePayment = true
          message = 'Payment pending for this month.'
        }

        // Create payment record
        await prisma.payment.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            month: currentMonth,
            year: currentYear,
            amount: course.fee,
            status,
            dueDate,
            gracePeriodStart,
            gracePeriodEnd
          }
        })

        paymentStatus = status
      }

      return NextResponse.json({
        success: true,
        canAttend,
        allowLatePayment,
        requiresLatePayment,
        paymentStatus,
        message,
        student: {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName
        },
        course: {
          id: course.id,
          code: course.code,
          name: course.name,
          fee: course.fee
        },
        currentMonth,
        currentYear
      })
    } catch (error) {
      console.error('Error checking payment status:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

export const POST = withAuth(handler)
