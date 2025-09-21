import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

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
        { student: { firstName: 'asc' } },
        { date: 'asc' }
      ]
    })

    // Prepare data for Excel
    const excelData = records.map(record => ({
      'Student ID': record.student.studentId,
      'First Name': record.student.firstName,
      'Last Name': record.student.lastName,
      'Course Code': record.course.code,
      'Course Name': record.course.name,
      'Date': new Date(record.date).toLocaleDateString(),
      'Status': record.status,
      'Scanned At': new Date(record.scannedAt).toLocaleString()
    }))

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records')

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="attendance-${date || 'all'}.xlsx"`
      }
    })
  } catch (error) {
    console.error('Error exporting attendance records:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
