import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'

async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const resolvedParams = await params
    const studentId = resolvedParams.id

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

    // Generate QR code for student
    console.log('Generating QR code for student:', student.studentId, 'QR data:', student.qrCode)
    const qrCodeDataUrl = await QRCode.toDataURL(student.qrCode, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    // Prepare student data for ID card
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
