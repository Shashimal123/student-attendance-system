import { NextRequest, NextResponse } from 'next/server'
import { withStudentAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  const user = (req as any).user

  try {
    // Get student's enrolled course IDs
    const enrolledCourses = await prisma.courseEnrollment.findMany({
      where: {
        student: {
          userId: user.id
        },
        isActive: true
      },
      select: {
        courseId: true
      }
    })

    const enrolledCourseIds = enrolledCourses.map(e => e.courseId)

    // Get all active courses
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      courses: courses.map(course => ({
        id: course.id,
        name: course.name,
        code: course.code,
        description: course.description,
        fee: course.fee,
        duration: course.duration,
        teacher: {
          name: `${course.teacher.firstName} ${course.teacher.lastName}`
        },
        isEnrolled: enrolledCourseIds.includes(course.id)
      }))
    })
  } catch (error) {
    console.error('Error fetching available courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withStudentAuth(handler)
