import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

// Helper function to calculate grace period dates
function calculateGracePeriod(dueDate: Date) {
  const gracePeriodStart = new Date(dueDate)
  const gracePeriodEnd = new Date(dueDate)
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 14) // 2 weeks grace period
  return { gracePeriodStart, gracePeriodEnd }
}

// Helper function to determine payment status based on dates
function determinePaymentStatus(dueDate: Date, gracePeriodEnd: Date, paidDate?: Date): 'PAID' | 'PENDING' | 'GRACE_PERIOD' | 'OVERDUE' {
  if (paidDate) return 'PAID'
  
  const now = new Date()
  if (now <= dueDate) return 'PENDING'
  if (now <= gracePeriodEnd) return 'GRACE_PERIOD'
  return 'OVERDUE'
}

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      const { searchParams } = new URL(req.url)
      const month = searchParams.get('month')
      const year = searchParams.get('year')
      const status = searchParams.get('status')
      const studentId = searchParams.get('studentId')

      let whereClause: any = {}
      
      if (month) {
        whereClause.month = parseInt(month)
      }
      
      if (year) {
        whereClause.year = parseInt(year)
      }

      if (status) {
        whereClause.status = status
      }

      if (studentId) {
        whereClause.student = {
          studentId: studentId
        }
      }

      const payments = await prisma.payment.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
              phone: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          },
          course: {
            select: {
              name: true,
              code: true,
              fee: true,
              teacher: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
          { student: { firstName: 'asc' } }
        ]
      })

      // Calculate payment statistics
      const totalCollected = payments
        .filter(p => p.status === 'PAID')
        .reduce((sum, p) => sum + p.amount, 0)

      const pendingAmount = payments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, p) => sum + p.amount, 0)

      const overdueAmount = payments
        .filter(p => p.status === 'OVERDUE')
        .reduce((sum, p) => sum + p.amount, 0)

      const gracePeriodAmount = payments
        .filter(p => p.status === 'GRACE_PERIOD')
        .reduce((sum, p) => sum + p.amount, 0)

      return NextResponse.json({
        success: true,
        payments: payments.map(payment => ({
          id: payment.id,
          student: payment.student,
          course: payment.course,
          month: payment.month,
          year: payment.year,
          amount: payment.amount,
          status: payment.status,
          dueDate: payment.dueDate.toISOString(),
          paidDate: payment.paidDate?.toISOString(),
          paymentMethod: payment.paymentMethod,
          reference: payment.reference,
          gracePeriodStart: payment.gracePeriodStart?.toISOString(),
          gracePeriodEnd: payment.gracePeriodEnd?.toISOString()
        })),
        statistics: {
          totalCollected,
          pendingAmount,
          overdueAmount,
          gracePeriodAmount,
          totalPayments: payments.length
        }
      })
    } catch (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else if (req.method === 'POST') {
    try {
      const { 
        studentId, 
        courseId, 
        month, 
        year, 
        amount, 
        status, 
        paymentMethod, 
        reference,
        isManualRegistration = false 
      } = await req.json()

      if (!studentId || !courseId || !month || !year || !amount) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Find student by student ID
      const student = await prisma.student.findFirst({
        where: { studentId }
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

      // Check if payment already exists for this student, course, month, and year
      const existingPayment = await prisma.payment.findFirst({
        where: {
          studentId: student.id,
          courseId: course.id,
          month: parseInt(month),
          year: parseInt(year)
        }
      })

      if (existingPayment && !isManualRegistration) {
        return NextResponse.json(
          { error: 'Payment record already exists for this period' },
          { status: 400 }
        )
      }

      // Calculate due date (15th of the month)
      const dueDate = new Date(parseInt(year), parseInt(month) - 1, 15)
      const { gracePeriodStart, gracePeriodEnd } = calculateGracePeriod(dueDate)

      // Determine status if not provided
      let finalStatus = status
      if (!finalStatus) {
        finalStatus = determinePaymentStatus(dueDate, gracePeriodEnd)
      }

      const paymentData = {
        studentId: student.id,
        courseId: course.id,
        month: parseInt(month),
        year: parseInt(year),
        amount: parseFloat(amount),
        status: finalStatus as 'PAID' | 'PENDING' | 'OVERDUE' | 'GRACE_PERIOD',
        dueDate,
        gracePeriodStart,
        gracePeriodEnd,
        paidDate: finalStatus === 'PAID' ? new Date() : null,
        paymentMethod: paymentMethod || null,
        reference: reference || null
      }

      let payment
      if (existingPayment && isManualRegistration) {
        // Update existing payment
        payment = await prisma.payment.update({
          where: { id: existingPayment.id },
          data: paymentData
        })
      } else {
        // Create new payment
        payment = await prisma.payment.create({
          data: paymentData
        })
      }

      // Create notification for student if payment is pending or overdue
      if (finalStatus === 'PENDING' || finalStatus === 'OVERDUE' || finalStatus === 'GRACE_PERIOD') {
        await prisma.notification.create({
          data: {
            studentId: student.id,
            title: 'Payment Reminder',
            message: `Your payment of $${amount} for ${course.name} (${course.code}) is ${finalStatus.toLowerCase().replace('_', ' ')}. Due date: ${dueDate.toLocaleDateString()}`,
            type: 'payment'
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: isManualRegistration ? 'Payment updated successfully' : 'Payment created successfully',
        payment
      })
    } catch (error) {
      console.error('Error creating/updating payment:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        data: { studentId, courseId, month, year, amount, status, paymentMethod, reference, isManualRegistration }
      })
      return NextResponse.json(
        { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  } else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

export const GET = withAdminAuth(handler)
export const POST = withAdminAuth(handler)
