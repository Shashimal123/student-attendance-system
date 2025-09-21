import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const courseId = params.id

  if (req.method === 'PUT') {
    try {
      const { name, code, description, fee, duration, teacherId } = await req.json()

      if (!name || !code || !fee || !duration || !teacherId) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Check if course code already exists (excluding current course)
      const existingCourse = await prisma.course.findFirst({
        where: {
          code,
          id: { not: courseId }
        }
      })

      if (existingCourse) {
        return NextResponse.json(
          { error: 'Course code already exists' },
          { status: 400 }
        )
      }

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          name,
          code,
          description,
          fee: parseFloat(fee),
          duration: parseInt(duration),
          teacherId
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Course updated successfully',
        course: updatedCourse
      })
    } catch (error) {
      console.error('Error updating course:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else if (req.method === 'DELETE') {
    try {
      // Check if course has enrollments
      const enrollments = await prisma.courseEnrollment.count({
        where: { courseId }
      })

      if (enrollments > 0) {
        return NextResponse.json(
          { error: 'Cannot delete course with enrolled students. Deactivate instead.' },
          { status: 400 }
        )
      }

      await prisma.course.delete({
        where: { id: courseId }
      })

      return NextResponse.json({
        success: true,
        message: 'Course deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting course:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

export const PUT = withAdminAuth(handler)
export const DELETE = withAdminAuth(handler)
