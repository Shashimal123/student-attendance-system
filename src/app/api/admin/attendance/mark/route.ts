import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { studentId, courseId, status } = await req.json()

    if (!studentId || !courseId || !status) {
      return NextResponse.json(
        { error: 'Student ID, Course ID, and Status are required' },
        { status: 400 }
      )
    }

    // Find the student by student ID
    const student = await prisma.student.findFirst({
      where: { studentId },
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

    // Check if attendance already exists for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: student.id,
        courseId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Attendance already marked for today' },
        { status: 400 }
      )
    }

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        studentId: student.id,
        courseId,
        date: new Date(),
        status: status as 'PRESENT' | 'ABSENT' | 'LATE',
        scannedAt: new Date()
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true
          }
        },
        course: {
          select: {
            name: true,
            code: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: {
        id: attendance.id,
        student: attendance.student,
        course: attendance.course,
        date: attendance.date.toISOString(),
        status: attendance.status,
        scannedAt: attendance.scannedAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Error marking attendance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withAdminAuth(handler)
