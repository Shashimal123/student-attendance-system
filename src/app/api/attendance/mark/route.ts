import { NextRequest, NextResponse } from 'next/server'
import { withTeacherAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { createAttendanceMarkedNotification } from '@/lib/notificationUtils'
import { sendAttendanceEmail } from '@/lib/emailUtils'

async function handler(req: NextRequest) {
  const user = (req as any).user

  try {
    const { studentId, courseId, status, remarks } = await req.json()

    console.log('Attendance marking request:', { studentId, courseId, status, remarks })

    if (!studentId || !courseId || !status) {
      console.log('Missing required fields:', { studentId, courseId, status })
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the course belongs to the teacher (unless admin)
    let course
    if (user.role !== 'ADMIN') {
      course = await prisma.course.findFirst({
        where: {
          id: courseId,
          teacher: {
            userId: user.id
          }
        }
      })

      if (!course) {
        console.log('Course not found for teacher:', { courseId, teacherId: user.id })
        return NextResponse.json(
          { error: 'Course not found or access denied' },
          { status: 403 }
        )
      }
    } else {
      course = await prisma.course.findUnique({
        where: { id: courseId }
      })

      if (!course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        )
      }
    }

    // Check if student is enrolled in the course
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        studentId,
        courseId,
        isActive: true
      }
    })

    if (!enrollment) {
      console.log('Student not enrolled in course:', { studentId, courseId })
      return NextResponse.json(
        { error: 'Student is not enrolled in this course' },
        { status: 400 }
      )
    }

    // Check payment status for current month
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
    let paymentWarning = null

    // If payment is pending and due date has passed, mark as overdue
    if (payment && payment.status === 'PENDING' && payment.dueDate < currentDate) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'OVERDUE' }
      })
      paymentStatus = 'OVERDUE'
    }

    // Create payment warning if not paid
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

    // Check if attendance already marked for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        courseId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    if (existingAttendance) {
      // Update existing attendance
      const updatedAttendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status,
          remarks,
          scannedAt: new Date()
        }
      })

      // Create notification for student
      await createAttendanceMarkedNotification(studentId, course.name, status)

      // Send attendance email to student (optional)
      try {
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          include: { user: true }
        })
        
        if (student && student.user.email) {
          await sendAttendanceEmail(
            student.user.email,
            `${student.firstName} ${student.lastName}`,
            course.name,
            status
          )
        }
      } catch (error) {
        console.error('Error sending attendance email:', error)
        // Don't fail attendance marking if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Attendance updated successfully',
        attendance: updatedAttendance,
        paymentWarning
      })
    } else {
      // Create new attendance record
      const newAttendance = await prisma.attendance.create({
        data: {
          studentId,
          courseId,
          date: today,
          status,
          remarks,
          scannedAt: new Date()
        }
      })

      // Create notification for student
      await createAttendanceMarkedNotification(studentId, course.name, status)

      // Send attendance email to student (optional)
      try {
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          include: { user: true }
        })
        
        if (student && student.user.email) {
          await sendAttendanceEmail(
            student.user.email,
            `${student.firstName} ${student.lastName}`,
            course.name,
            status
          )
        }
      } catch (error) {
        console.error('Error sending attendance email:', error)
        // Don't fail attendance marking if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Attendance marked successfully',
        attendance: newAttendance,
        paymentWarning
      })
    }
  } catch (error) {
    console.error('Error marking attendance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withTeacherAuth(handler)
