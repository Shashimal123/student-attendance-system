import { NextRequest, NextResponse } from 'next/server'
import { withStudentAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const user = (req as any).user

  if (req.method === 'DELETE') {
    try {
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

      // Check if enrollment exists and belongs to the student
      const enrollment = await prisma.courseEnrollment.findFirst({
        where: {
          id,
          studentId: student.id,
          isActive: true
        }
      })

      if (!enrollment) {
        return NextResponse.json(
          { error: 'Enrollment not found' },
          { status: 404 }
        )
      }

      // Deactivate enrollment instead of deleting
      await prisma.courseEnrollment.update({
        where: { id },
        data: { isActive: false }
      })

      return NextResponse.json({
        success: true,
        message: 'Successfully unenrolled from course'
      })
    } catch (error) {
      console.error('Error unenrolling from course:', error)
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

export const DELETE = withStudentAuth(handler)
