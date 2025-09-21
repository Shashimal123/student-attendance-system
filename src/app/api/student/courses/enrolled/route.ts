import { NextRequest, NextResponse } from 'next/server'
import { withStudentAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  const user = (req as any).user

  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: {
        student: {
          userId: user.id
        },
        isActive: true
      },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      courses: enrollments.map(enrollment => ({
        id: enrollment.id,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        isActive: enrollment.isActive,
        course: {
          id: enrollment.course.id,
          name: enrollment.course.name,
          code: enrollment.course.code,
          description: enrollment.course.description,
          fee: enrollment.course.fee,
          duration: enrollment.course.duration,
          teacher: {
            name: `${enrollment.course.teacher.firstName} ${enrollment.course.teacher.lastName}`
          }
        }
      }))
    })
  } catch (error) {
    console.error('Error fetching enrolled courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withStudentAuth(handler)
