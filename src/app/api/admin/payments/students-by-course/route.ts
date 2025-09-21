import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      const { searchParams } = new URL(req.url)
      const courseId = searchParams.get('courseId')

      if (!courseId) {
        return NextResponse.json(
          { error: 'Course ID is required' },
          { status: 400 }
        )
      }

      // Find course by code
      const course = await prisma.course.findFirst({
        where: { code: courseId }
      })

      if (!course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        )
      }

      // Get students enrolled in this course
      const enrollments = await prisma.courseEnrollment.findMany({
        where: {
          courseId: course.id,
          isActive: true
        },
        include: {
          student: {
            select: {
              id: true,
              studentId: true,
              firstName: true,
              lastName: true,
              phone: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          }
        }
      })

      const students = enrollments.map(enrollment => ({
        id: enrollment.student.id,
        studentId: enrollment.student.studentId,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        phone: enrollment.student.phone,
        email: enrollment.student.user.email
      }))

      return NextResponse.json({
        success: true,
        students,
        course: {
          id: course.id,
          name: course.name,
          code: course.code,
          fee: course.fee
        }
      })
    } catch (error) {
      console.error('Error fetching students by course:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

export const GET = withAdminAuth(handler)
