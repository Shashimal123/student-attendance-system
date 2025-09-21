import { NextRequest, NextResponse } from 'next/server'
import { withStudentAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { createMonthlyPayments } from '@/lib/paymentUtils'

async function handler(req: NextRequest) {
  const user = (req as any).user

  if (req.method === 'POST') {
    try {
      const { courseId } = await req.json()

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

      // Check if course exists and is active
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      })

      if (!course || !course.isActive) {
        return NextResponse.json(
          { error: 'Course not found or inactive' },
          { status: 404 }
        )
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.courseEnrollment.findFirst({
        where: {
          studentId: student.id,
          courseId,
          isActive: true
        }
      })

      if (existingEnrollment) {
        return NextResponse.json(
          { error: 'Already enrolled in this course' },
          { status: 400 }
        )
      }

      // Create enrollment
      const enrollment = await prisma.courseEnrollment.create({
        data: {
          studentId: student.id,
          courseId
        }
      })

      // Create monthly payment records for the current year
      const currentYear = new Date().getFullYear()
      for (let month = 1; month <= 12; month++) {
        await createMonthlyPayments(student.id, [courseId], month, currentYear)
      }

      return NextResponse.json({
        success: true,
        message: 'Successfully enrolled in course',
        enrollment
      })
    } catch (error) {
      console.error('Error enrolling in course:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

export const POST = withStudentAuth(handler)
