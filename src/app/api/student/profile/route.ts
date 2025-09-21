import { NextRequest, NextResponse } from 'next/server'
import { withStudentAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  const user = (req as any).user

  if (req.method === 'PUT') {
    try {
      const { firstName, lastName, phone, address, parentName, parentPhone, parentEmail } = await req.json()

      if (!firstName || !lastName) {
        return NextResponse.json(
          { error: 'First name and last name are required' },
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

      // Update student profile
      const updatedStudent = await prisma.student.update({
        where: { id: student.id },
        data: {
          firstName,
          lastName,
          phone: phone || null,
          address: address || null,
          parentName: parentName || null,
          parentPhone: parentPhone || null,
          parentEmail: parentEmail || null
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
        student: updatedStudent
      })
    } catch (error) {
      console.error('Error updating student profile:', error)
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

export const PUT = withStudentAuth(handler)
