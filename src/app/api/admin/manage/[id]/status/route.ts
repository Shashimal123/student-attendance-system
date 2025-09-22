// src/app/api/attendance/mark/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma' // <- adjust to your prisma import

type ReqBody = {
  studentId?: string   // scanned string or extracted ID
  courseId?: string    // can be course code or DB id (we try both)
  markedBy?: string    // teacher/admin id (from session ideally)
  scanned?: string     // optional full scanned payload
}

export async function POST(req: Request) {
  try {
    const body: ReqBody = await req.json().catch(() => ({} as ReqBody))

    // Normalize input
    let { studentId, courseId, markedBy, scanned } = body

    // If scanner sent whole scanned string (e.g. "STU001-test123"), allow 'scanned' as input
    if (!studentId && scanned) studentId = scanned

    if (!studentId || !courseId) {
      return NextResponse.json(
        { success: false, code: 'INVALID_PAYLOAD', message: 'studentId and courseId are required' },
        { status: 400 }
      )
    }

    // Normalise studentId: if QR contains suffix, extract prefix before first '-'
    const normalizedStudentId =
      typeof studentId === 'string' && studentId.includes('-') ? studentId.split('-')[0] : studentId

    // 1) Find student by studentId (unique code)
    const student = await prisma.student.findUnique({
      where: { studentId: normalizedStudentId }
    })

    if (!student) {
      return NextResponse.json(
        { success: false, code: 'NOT_FOUND', message: 'Student not found' },
        { status: 404 }
      )
    }

    // 2) Resolve course: accept either database id or course code
    let course = null
    if (/^\d+$/.test(String(courseId))) {
      // numeric id
      course = await prisma.course.findUnique({ where: { id: Number(courseId) } })
    } else {
      // assume course code (e.g. "MATH101")
      course = await prisma.course.findUnique({ where: { code: String(courseId) } })
    }

    if (!course) {
      return NextResponse.json(
        { success: false, code: 'COURSE_NOT_FOUND', message: 'Course not found' },
        { status: 404 }
      )
    }

    // 3) Verify enrollment
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { studentId: student.id, courseId: course.id }
    })
    if (!enrollment) {
      return NextResponse.json(
        { success: false, code: 'NOT_ENROLLED', message: 'Student not enrolled in this course' },
        { status: 403 }
      )
    }

    // 4) Payment check (current month/year)
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const payment = await prisma.payment.findFirst({
      where: {
        studentId: student.id,
        courseId: course.id,
        month,
        year,
        status: 'PAID'
      }
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, code: 'PAYMENT_REQUIRED', message: 'Payment required for current month' },
        { status: 402 }
      )
    }

    // 5) Duplicate prevention (date-only)
    // assuming attendance.date is stored as ISO date string yyyy-mm-dd or use DateTime — adjust as needed
    const todayStr = new Date().toISOString().slice(0, 10)
    const already = await prisma.attendance.findFirst({
      where: {
        studentId: student.id,
        courseId: course.id,
        date: todayStr
      }
    })
    if (already) {
      return NextResponse.json(
        { success: false, code: 'ALREADY_MARKED', message: 'Attendance already marked for today' },
        { status: 409 }
      )
    }

    // 6) Create attendance
    const rec = await prisma.attendance.create({
      data: {
        studentId: student.id,
        courseId: course.id,
        markedBy: markedBy ?? null,
        date: todayStr,
        status: 'PRESENT'
      }
    })

    // Return success with student name so front-end can display
    return NextResponse.json(
      { success: true, message: 'Attendance marked', attendanceId: rec.id, studentName: student.name ?? null },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('attendance.mark error', err)
    return NextResponse.json(
      { success: false, code: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
