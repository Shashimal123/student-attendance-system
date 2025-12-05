import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const courseId = searchParams.get('courseId')

    let whereClause: any = {}
    
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    if (courseId && courseId !== 'all') {
      whereClause.courseId = courseId
    }

    const records = await prisma.attendance.findMany({
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
      orderBy: [
        { date: 'desc' },
        { student: { firstName: 'asc' } }
      ]
    })

    return NextResponse.json({
      success: true,
      records: records.map(record => ({
        id: record.id,
        student: record.student,
        course: record.course,
        date: record.date.toISOString(),
        status: record.status,
        latePayment: record.latePayment,
        scannedAt: record.scannedAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
