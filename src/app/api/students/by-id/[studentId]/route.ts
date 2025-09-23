import { NextRequest, NextResponse } from 'next/server'
import { withTeacherAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const resolvedParams = await params
    const { studentId } = resolvedParams

    console.log('Looking for student with ID:', studentId)

    // First try to find by studentId
    let student = await prisma.student.findUnique({
      where: { studentId },
      include: {
        user: true,
        payments: {
          where: {
            year: new Date().getFullYear()
          },
          orderBy: { month: 'desc' }
        }
      }
    })

    // If not found by studentId, try to find by qrCode
    if (!student) {
      console.log('Student not found by studentId, trying qrCode...')
      student = await prisma.student.findUnique({
        where: { qrCode: studentId },
        include: {
          user: true,
          payments: {
            where: {
              year: new Date().getFullYear()
            },
            orderBy: { month: 'desc' }
          }
        }
      })
    }

    console.log('Student found:', student ? 'Yes' : 'No')

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    if (!student.isActive) {
      return NextResponse.json(
        { error: 'Student account is inactive' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        isActive: student.isActive,
        payments: student.payments.map(payment => ({
          month: payment.month,
          year: payment.year,
          status: payment.status
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withTeacherAuth(handler)
