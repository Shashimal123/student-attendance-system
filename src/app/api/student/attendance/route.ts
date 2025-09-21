import { NextRequest, NextResponse } from 'next/server'
import { withStudentAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  const user = (req as any).user
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const month = parseInt(searchParams.get('month') || '1')
  const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

  try {
    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

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

    // Verify student is enrolled in the course
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        studentId: student.id,
        courseId,
        isActive: true
      }
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled in this course' },
        { status: 403 }
      )
    }

    // Get attendance records for the specified period
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59)

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: student.id,
        courseId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        course: {
          select: {
            name: true
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json({
      success: true,
      attendance: attendanceRecords.map(record => ({
        id: record.id,
        courseName: record.course.name,
        date: record.date.toISOString(),
        status: record.status,
        remarks: record.remarks
      }))
    })
  } catch (error) {
    console.error('Error fetching student attendance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withStudentAuth(handler)
