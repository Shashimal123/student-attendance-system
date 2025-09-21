import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { getOverdueStudents } from '@/lib/paymentUtils'

async function handler(req: NextRequest) {
  try {
    const overdueStudents = await getOverdueStudents()

    // Filter students with 3+ months overdue
    const studentsWithThreeMonthsOverdue = overdueStudents.filter(student => {
      return student.payments.length >= 3
    })

    return NextResponse.json({
      success: true,
      students: studentsWithThreeMonthsOverdue.map(student => ({
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        user: student.user,
        payments: student.payments.map(payment => ({
          month: payment.month,
          year: payment.year,
          amount: payment.amount,
          dueDate: payment.dueDate.toISOString()
        }))
      }))
    })
  } catch (error) {
    console.error('Error fetching overdue students:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
