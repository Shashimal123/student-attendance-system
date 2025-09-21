import { NextRequest, NextResponse } from 'next/server'
import { withStudentAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  const user = (req as any).user

  try {
    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId: user.id }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student record not found' },
        { status: 404 }
      )
    }

    // Get payment records for the student
    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      payments: payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        month: payment.month,
        year: payment.year,
        status: payment.status,
        dueDate: payment.dueDate.toISOString(),
        paidDate: payment.paidDate?.toISOString()
      }))
    })
  } catch (error) {
    console.error('Error fetching student payments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withStudentAuth(handler)
