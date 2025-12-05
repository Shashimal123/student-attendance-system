import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { markAttendance } from '@/app/api/attendance/mark/route'
import { AttendanceStatus } from '@prisma/client'

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const user = (req as any).user
    const { studentId, courseId, status, remarks, latePayment } = await req.json()

    if (!studentId || !courseId || !status) {
      return NextResponse.json(
        { error: 'Student ID, Course ID, and Status are required' },
        { status: 400 }
      )
    }

    // Find the student by either internal id or public studentId
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { studentId }
        ]
      },
      include: {
        enrollments: {
          where: { courseId, isActive: true }
        }
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    if (student.enrollments.length === 0) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this course' },
        { status: 400 }
      )
    }

    // FIX: QR attendance not writing to DB
    const result = await markAttendance({
      studentId: student.id,
      courseId,
      status: status as AttendanceStatus,
      remarks,
      latePayment,
      user
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error marking attendance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAdminAuth(handler)
