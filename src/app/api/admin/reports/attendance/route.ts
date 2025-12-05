import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  try {
    const user = (req as any).user
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const courseId = searchParams.get('courseId')

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Build where clause
    const whereClause: any = {}
    
    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      
      whereClause.date = {
        gte: startDate,
        lt: endDate
      }
    }
    
    if (courseId) {
      whereClause.courseId = courseId
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true
          }
        },
        course: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        scannedAt: 'desc'
      }
    })

    const reports = attendanceRecords.map(record => ({
      id: record.id,
      date: record.date.toLocaleDateString(),
      studentName: `${record.student.firstName} ${record.student.lastName}`,
      courseName: record.course.name,
      status: record.status,
      remarks: record.remarks,
      latePayment: record.latePayment
    }))

    return NextResponse.json({
      success: true,
      reports
    })
  } catch (error) {
    console.error('Error fetching attendance reports:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handler)
