import { NextRequest, NextResponse } from 'next/server'
import { withTeacherAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { createAttendanceMarkedNotification } from '@/lib/notificationUtils'
import { sendAttendanceEmail } from '@/lib/emailUtils'

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
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    for (const record of attendanceRecords) {
      const { studentId, courseId, status, remarks } = record

      if (!studentId || !courseId || !status) {
        results.push({
          studentId,
          success: false,
          error: 'Missing required fields'
        })
        continue
      }

      try {
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
            results.push({
              studentId,
              success: false,
              error: 'Course not found or access denied'
            })
            continue
          }
        } else {
          course = await prisma.course.findUnique({
            where: { id: courseId }
          })

          if (!course) {
            results.push({
              studentId,
              success: false,
              error: 'Course not found'
            })
            continue
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
          results.push({
            studentId,
            success: false,
            error: 'Student is not enrolled in this course'
          })
          continue
        }

        // Check if attendance already marked for today
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

        let attendanceRecord
        if (existingAttendance) {
          // Update existing attendance
          attendanceRecord = await prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
              status,
              remarks,
              scannedAt: new Date()
            }
          })
        } else {
          // Create new attendance record
          attendanceRecord = await prisma.attendance.create({
            data: {
              studentId,
              courseId,
              date: today,
              status,
              remarks,
              scannedAt: new Date()
            }
          })
        }

        // Create notification for student
        try {
          await createAttendanceMarkedNotification(studentId, course.name, status)
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
              course.name,
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
