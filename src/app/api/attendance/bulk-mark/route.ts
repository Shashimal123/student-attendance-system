import { NextRequest, NextResponse } from 'next/server'
import { withTeacherAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { createAttendanceMarkedNotification } from '@/lib/notificationUtils'
import { sendAttendanceEmail } from '@/lib/emailUtils'
import { markAttendance } from '@/app/api/attendance/mark/route'
import { AttendanceStatus } from '@prisma/client'

async function handler(req: NextRequest) {
  const user = (req as any).user

  try {
    const { attendanceRecords } = await req.json()

    if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return NextResponse.json(
        { error: 'No attendance records provided' },
        { status: 400 }
      )
    }

    const results = []
    for (const record of attendanceRecords) {
      const { studentId, courseId, status, remarks, latePayment } = record

      if (!studentId || !courseId || !status) {
        results.push({
          studentId,
          success: false,
          error: 'Missing required fields'
        })
        continue
      }

      try {
        const result = await markAttendance({
          studentId,
          courseId,
          status: status as AttendanceStatus,
          remarks,
          latePayment,
          user
        })
        const attendanceRecord = result.attendance

        // Create notification for student
        try {
          await createAttendanceMarkedNotification(studentId, result.courseName, status as AttendanceStatus)
        } catch (error) {
          console.error('Error creating notification:', error)
        }

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
              result.courseName,
              status
            )
          }
        } catch (error) {
          console.error('Error sending attendance email:', error)
        }

        results.push({
          studentId,
          success: true,
          attendanceId: attendanceRecord.id
        })
      } catch (error) {
        console.error(`Error marking attendance for student ${studentId}:`, error)
        results.push({
          studentId,
          success: false,
          error: 'Internal server error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Attendance marked for ${successCount} students${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results,
      summary: {
        total: attendanceRecords.length,
        successful: successCount,
        failed: failureCount
      }
    })
  } catch (error) {
    console.error('Error in bulk attendance marking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withTeacherAuth(handler)
