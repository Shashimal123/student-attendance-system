import { NextRequest, NextResponse } from 'next/server'
import { Attendance, AttendanceStatus } from '@prisma/client'
import { withTeacherAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { createAttendanceMarkedNotification } from '@/lib/notificationUtils'
import { sendAttendanceEmail } from '@/lib/emailUtils'
import type { AuthUser } from '@/lib/auth'

class MarkAttendanceError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

interface MarkAttendanceInput {
  studentId: string
  courseId: string
  status: AttendanceStatus
  remarks?: string
  latePayment?: boolean
  user: AuthUser
}

interface MarkAttendanceResult {
  success: true
  attendance: Attendance
  paymentWarning: {
    status: string
    message: string
    amount?: number
    dueDate?: string
  } | null
  alreadyMarked: boolean
  courseName: string
}

// FIX: unified save function
export async function markAttendance({
  studentId,
  courseId,
  status,
  remarks,
  latePayment,
  user
}: MarkAttendanceInput): Promise<MarkAttendanceResult> {
  if (!studentId || !courseId || !status) {
    throw new MarkAttendanceError('Missing required fields')
  }

  const course = await prisma.course.findFirst({
    where: user.role === 'ADMIN'
      ? { id: courseId }
      : {
        id: courseId,
        teacher: {
          userId: user.id
        }
      }
  })

  if (!course) {
    throw new MarkAttendanceError('Course not found or access denied', 403)
  }

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      studentId,
      courseId,
      isActive: true
    }
  })

  if (!enrollment) {
    throw new MarkAttendanceError('Student is not enrolled in this course')
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true }
  })

  if (!student) {
    throw new MarkAttendanceError('Student not found', 404)
  }

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  const payment = await prisma.payment.findFirst({
    where: {
      studentId,
      courseId,
      month: currentMonth,
      year: currentYear
    }
  })

  let paymentStatus = payment ? payment.status : 'PENDING'
  let paymentWarning: MarkAttendanceResult['paymentWarning'] = null

  if (payment && payment.status === 'PENDING' && payment.dueDate < currentDate) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'OVERDUE' }
    })
    paymentStatus = 'OVERDUE'
  }

  if (paymentStatus !== 'PAID') {
    paymentWarning = {
      status: paymentStatus,
      message: paymentStatus === 'OVERDUE'
        ? 'Payment is overdue. Please contact the administration.'
        : 'Payment is pending for this month.',
      amount: payment?.amount || course.fee,
      dueDate: payment?.dueDate?.toISOString() || new Date(currentYear, currentMonth - 1, 15).toISOString()
    }
  }

  const attendanceDate = new Date()
  attendanceDate.setHours(0, 0, 0, 0)

  const { attendanceRecord, alreadyMarked } = await prisma.$transaction(async (tx) => {
    const existingAttendance = await tx.attendance.findUnique({
      where: {
        studentId_courseId_date: {
          studentId,
          courseId,
          date: attendanceDate
        }
      }
    })

    let alreadyMarked = false
    let record

    const latePaymentFlag = latePayment ?? existingAttendance?.latePayment ?? false

    if (existingAttendance) {
      const shouldUpdate = existingAttendance.status !== status ||
        (existingAttendance.remarks || '') !== (remarks || '') ||
        existingAttendance.latePayment !== latePaymentFlag

      if (shouldUpdate) {
        record = await tx.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            status,
            remarks,
            latePayment: latePaymentFlag,
            scannedAt: new Date()
          }
        })
      } else {
        alreadyMarked = true
        record = existingAttendance
      }
    } else {
      record = await tx.attendance.create({
        data: {
          studentId,
          courseId,
          date: attendanceDate,
          status,
          remarks,
          latePayment: latePaymentFlag,
          scannedAt: new Date()
        }
      })
    }

    const aggregates = await tx.attendance.groupBy({
      by: ['status'],
      where: {
        courseId,
        date: attendanceDate
      },
      _count: {
        _all: true
      }
    })

    const summary = {
      presentCount: aggregates.find((group) => group.status === 'PRESENT')?._count._all ?? 0,
      lateCount: aggregates.find((group) => group.status === 'LATE')?._count._all ?? 0,
      absentCount: aggregates.find((group) => group.status === 'ABSENT')?._count._all ?? 0
    }

    await tx.attendanceReport.upsert({
      where: {
        courseId_date: {
          courseId,
          date: attendanceDate
        }
      },
      update: summary,
      create: {
        courseId,
        date: attendanceDate,
        ...summary
      }
    })

    return { attendanceRecord: record, alreadyMarked }
  })

  if (!alreadyMarked) {
    await createAttendanceMarkedNotification(student.id, course.name, status)

    try {
      if (student.user?.email) {
        await sendAttendanceEmail(
          student.user.email,
          `${student.firstName} ${student.lastName}`,
          course.name,
          status
        )
      }
    } catch (error) {
      console.error('Error sending attendance email:', error)
    }
  }

  return {
    success: true as const,
    attendance: attendanceRecord,
    paymentWarning,
    alreadyMarked,
    courseName: course.name
  }
}

async function handler(req: NextRequest) {
  const user = (req as any).user as AuthUser

  try {
    const body = await req.json()
    const result = await markAttendance({
      studentId: body.studentId,
      courseId: body.courseId,
      status: body.status,
      remarks: body.remarks,
      user
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof MarkAttendanceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Error marking attendance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withTeacherAuth(handler)
