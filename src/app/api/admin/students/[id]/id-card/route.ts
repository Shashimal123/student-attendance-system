import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { generateQRCodeDataURL } from '@/lib/qrCodeUtils'

async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { id } = await params
    const studentId = id

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: { isActive: true },
          include: {
            course: {
              select: {
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

    const qrCodeDataUrl = await generateQRCodeDataURL(student.qrCode || student.studentId, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H'
    })

    const studentData = {
      id: student.id,
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      phone: student.phone,
      photo: student.photo,
      qrCode: qrCodeDataUrl,
      enrollments: student.enrollments.map(enrollment => ({
        courseName: enrollment.course.name,
        courseCode: enrollment.course.code
      }))
    }

    return NextResponse.json({
      success: true,
      student: studentData
    })
  } catch (error) {
    console.error('Error generating student ID card:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
