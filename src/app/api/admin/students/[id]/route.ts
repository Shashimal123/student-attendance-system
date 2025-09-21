import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.method === 'GET') {
    try {
      const studentId = params.id

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              email: true,
              isActive: true
            }
          },
          enrollments: {
            where: { isActive: true },
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                  code: true
                }
              }
            }
          }
        }
      })

      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        student: {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.user.email,
          phone: student.phone,
          dateOfBirth: student.dateOfBirth.toISOString(),
          address: student.address,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          parentEmail: student.parentEmail,
          isActive: student.isActive,
          enrollments: student.enrollments
        }
      })
    } catch (error) {
      console.error('Error fetching student:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else if (req.method === 'PATCH') {
    try {
      const studentId = params.id
      const updateData = await req.json()

      // Update student profile
      const updatedStudent = await prisma.student.update({
        where: { id: studentId },
        data: {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          phone: updateData.phone,
          address: updateData.address,
          parentName: updateData.parentName,
          parentPhone: updateData.parentPhone,
          parentEmail: updateData.parentEmail
        }
      })

      // Update course enrollments if provided
      if (updateData.selectedCourses) {
        // Remove all current enrollments
        await prisma.courseEnrollment.deleteMany({
          where: { studentId }
        })

        // Add new enrollments
        for (const courseId of updateData.selectedCourses) {
          await prisma.courseEnrollment.create({
            data: {
              studentId,
              courseId,
              isActive: true
            }
          })
        }
      }

      return NextResponse.json({
        success: true,
        student: updatedStudent
      })
    } catch (error) {
      console.error('Error updating student:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else if (req.method === 'DELETE') {
    try {
      const studentId = params.id

      // Get student to find userId
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true }
      })

      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        )
      }

      // Delete student (this will cascade to enrollments, payments, etc.)
      await prisma.student.delete({
        where: { id: studentId }
      })

      // Delete user account
      await prisma.user.delete({
        where: { id: student.userId }
      })

      return NextResponse.json({
        success: true,
        message: 'Student deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting student:', error)
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
export const PATCH = withAdminAuth(handler)
export const DELETE = withAdminAuth(handler)
