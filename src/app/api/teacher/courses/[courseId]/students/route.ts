import { NextRequest, NextResponse } from 'next/server'
import { withTeacherAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await params
    const user = (req as any).user

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

    // Get students enrolled in this course
    const students = await prisma.student.findMany({
      where: {
        enrollments: {
          some: {
            courseId: courseId,
            isActive: true
          }
        }
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        isActive: true,
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      students: students.map(student => ({
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.user.email,
        isActive: student.isActive
      }))
    })
  } catch (error) {
    console.error('Error fetching students for course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withTeacherAuth(handler)
