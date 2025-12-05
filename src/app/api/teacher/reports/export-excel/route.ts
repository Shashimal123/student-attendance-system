import { NextRequest, NextResponse } from 'next/server'
import { withTeacherAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

async function handler(req: NextRequest) {
  const user = (req as any).user

  if (req.method === 'POST') {
    try {
      const { courseId, month, year } = await req.json()

      if (!courseId || !month || !year) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Verify course access (unless admin)
      if (user.role !== 'ADMIN') {
        const course = await prisma.course.findFirst({
          where: {
            id: courseId,
            teacher: {
              userId: user.id
            }
          }
        })

        if (!course) {
          return NextResponse.json(
            { error: 'Course not found or access denied' },
            { status: 403 }
          )
        }
      }

      // Get attendance records for the specified period
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59)

      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          courseId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          student: {
            select: {
              studentId: true,
              firstName: true,
              lastName: true
            }
          },
          course: {
            select: {
              name: true
            }
          }
        },
        orderBy: [
          { student: { firstName: 'asc' } },
          { date: 'asc' }
        ]
      })

      // Prepare data for Excel
      const excelData = attendanceRecords.map(record => ({
        'Student ID': record.student.studentId,
        'Student Name': `${record.student.firstName} ${record.student.lastName}`,
        'Course': record.course.name,
        'Date': record.date.toLocaleDateString(),
        'Status': record.status,
        'Late Payment': record.latePayment ? 'YES' : 'NO',
        'Remarks': record.remarks || ''
      }))

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Student ID
        { wch: 25 }, // Student Name
        { wch: 20 }, // Course
        { wch: 12 }, // Date
        { wch: 10 }, // Status
        { wch: 14 }, // Late Payment
        { wch: 30 }  // Remarks
      ]
      worksheet['!cols'] = columnWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report')

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      // Return Excel file
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="attendance_report_${month}_${year}.xlsx"`
        }
      })
    } catch (error) {
      console.error('Error generating Excel report:', error)
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

export const POST = withTeacherAuth(handler)
