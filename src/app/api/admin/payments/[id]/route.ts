import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const paymentId = resolvedParams.id

  if (req.method === 'PUT') {
    try {
      const { studentId, courseId, month, year, amount, status, paymentMethod, reference } = await req.json()

      if (!studentId || !courseId || !month || !year || !amount || !status) {
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

      // Check if payment already exists for this student, course, month, and year (excluding current payment)
      const existingPayment = await prisma.payment.findFirst({
        where: {
          studentId: student.id,
          courseId: course.id,
          month: parseInt(month),
          year: parseInt(year),
          id: { not: paymentId }
        }
      })

      if (existingPayment) {
        return NextResponse.json(
          { error: 'Payment record already exists for this period' },
          { status: 400 }
        )
      }

      // Calculate due date (15th of the month)
      const dueDate = new Date(parseInt(year), parseInt(month) - 1, 15)

      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          studentId: student.id,
          courseId: course.id,
          month: parseInt(month),
          year: parseInt(year),
          amount: parseFloat(amount),
          status: status as 'PAID' | 'PENDING' | 'OVERDUE',
          dueDate,
          paidDate: status === 'PAID' ? new Date() : null,
          paymentMethod,
          reference
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Payment updated successfully',
        payment: updatedPayment
      })
    } catch (error) {
      console.error('Error updating payment:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.payment.delete({
        where: { id: paymentId }
      })

      return NextResponse.json({
        success: true,
        message: 'Payment deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting payment:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

export const PUT = withAdminAuth(handler)
export const DELETE = withAdminAuth(handler)
