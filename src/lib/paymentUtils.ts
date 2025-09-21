import { prisma } from './prisma'

export interface PaymentStatus {
  status: 'PAID' | 'PENDING' | 'OVERDUE'
  message: string
  daysPastDue?: number
}

export async function checkPaymentStatus(studentId: string, month: number, year: number): Promise<PaymentStatus> {
  const payment = await prisma.payment.findUnique({
    where: {
      studentId_month_year: {
        studentId,
        month,
        year
      }
    }
  })

  if (!payment) {
    return {
      status: 'PENDING',
      message: 'No payment record for this month'
    }
  }

  if (payment.status === 'PAID') {
    return {
      status: 'PAID',
      message: 'Payment up to date'
    }
  }

  // Check if payment is overdue (more than 2 weeks past due date)
  const currentDate = new Date()
  const dueDate = new Date(payment.dueDate)
  const daysPastDue = Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysPastDue > 14) {
    // Update payment status to overdue if not already
    if (payment.status !== 'OVERDUE') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'OVERDUE' }
      })
    }

    return {
      status: 'OVERDUE',
      message: `Payment overdue - ${daysPastDue} days past due`,
      daysPastDue
    }
  }

  return {
    status: 'PENDING',
    message: 'Payment pending'
  }
}

export async function createMonthlyPayments(studentId: string, courseIds: string[], month: number, year: number) {
  const dueDate = new Date(year, month - 1, 1) // First day of the month
  
  // Get course fees
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } }
  })

  const totalAmount = courses.reduce((sum, course) => sum + Number(course.fee), 0)

  if (totalAmount > 0) {
    await prisma.payment.create({
      data: {
        studentId,
        amount: totalAmount,
        month,
        year,
        dueDate,
        status: 'PENDING'
      }
    })
  }
}

export async function markPaymentAsPaid(studentId: string, month: number, year: number) {
  const payment = await prisma.payment.findUnique({
    where: {
      studentId_month_year: {
        studentId,
        month,
        year
      }
    }
  })

  if (payment && payment.status !== 'PAID') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidDate: new Date()
      }
    })
  }
}

export async function getStudentPaymentHistory(studentId: string) {
  return await prisma.payment.findMany({
    where: { studentId },
    orderBy: [
      { year: 'desc' },
      { month: 'desc' }
    ]
  })
}

export async function getOverdueStudents() {
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  return await prisma.student.findMany({
    where: {
      isActive: true,
      payments: {
        some: {
          status: 'OVERDUE',
          year: currentYear
        }
      }
    },
    include: {
      user: {
        select: {
          email: true
        }
      },
      payments: {
        where: {
          year: currentYear,
          status: 'OVERDUE'
        }
      }
    }
  })
}
