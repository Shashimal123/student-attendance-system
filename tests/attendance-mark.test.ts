'use strict'

import test from 'node:test'
import assert from 'node:assert/strict'
import { PrismaClient, AttendanceStatus } from '@prisma/client'
import { markAttendance } from '../src/app/api/attendance/mark/route'
import type { AuthUser } from '../src/lib/auth'

const prisma = new PrismaClient()

interface TestContext {
  teacherUserId: string
  teacherId: string
  teacherAuth: AuthUser
  studentId: string
  studentUserId: string
  courseId: string
}

const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const createTestContext = async (): Promise<TestContext> => {
  const suffix = Math.random().toString(36).slice(2, 8)
  const teacherUser = await prisma.user.create({
    data: {
      email: `teacher-${suffix}@example.com`,
      password: 'hashed-password',
      role: 'TEACHER'
    }
  })

  const teacher = await prisma.teacher.create({
    data: {
      userId: teacherUser.id,
      firstName: 'QR',
      lastName: 'Teacher'
    }
  })

  const course = await prisma.course.create({
    data: {
      name: 'QR Course',
      code: `COURSE-${suffix}`,
      fee: 100,
      duration: 3,
      teacherId: teacher.id
    }
  })

  const studentUser = await prisma.user.create({
    data: {
      email: `student-${suffix}@example.com`,
      password: 'hashed-password',
      role: 'STUDENT'
    }
  })

  const student = await prisma.student.create({
    data: {
      userId: studentUser.id,
      studentId: `STU-${suffix}`,
      firstName: 'QR',
      lastName: 'Student',
      dateOfBirth: new Date('2000-01-01'),
      phone: '0000000000',
      address: 'Test Address',
      parentName: 'Parent',
      parentPhone: '0000000000',
      qrCode: `qr-${suffix}`,
      isActive: true
    }
  })

  await prisma.courseEnrollment.create({
    data: {
      studentId: student.id,
      courseId: course.id
    }
  })

  const now = new Date()
  await prisma.payment.create({
    data: {
      studentId: student.id,
      courseId: course.id,
      amount: 100,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      status: 'PAID',
      dueDate: now
    }
  })

  const teacherAuth: AuthUser = {
    id: teacherUser.id,
    email: teacherUser.email,
    role: 'TEACHER',
    teacherId: teacher.id
  }

  return {
    teacherUserId: teacherUser.id,
    teacherId: teacher.id,
    teacherAuth,
    studentId: student.id,
    studentUserId: studentUser.id,
    courseId: course.id
  }
}

const cleanupTestContext = async (context: TestContext) => {
  await prisma.attendanceReport.deleteMany({
    where: { courseId: context.courseId }
  })
  await prisma.attendance.deleteMany({
    where: { courseId: context.courseId }
  })
  await prisma.payment.deleteMany({
    where: {
      courseId: context.courseId,
      studentId: context.studentId
    }
  })
  await prisma.courseEnrollment.deleteMany({
    where: { courseId: context.courseId }
  })
  await prisma.course.delete({
    where: { id: context.courseId }
  })
  await prisma.teacher.delete({
    where: { id: context.teacherId }
  })
  await prisma.student.delete({
    where: { id: context.studentId }
  })
  await prisma.user.deleteMany({
    where: { id: { in: [context.teacherUserId, context.studentUserId] } }
  })
}

const mark = (status: AttendanceStatus, context: TestContext, remarks?: string) =>
  markAttendance({
    studentId: context.studentId,
    courseId: context.courseId,
    status,
    remarks,
    user: context.teacherAuth
  })

test('QR scan auto mark inserts attendance and is idempotent', async () => {
  const context = await createTestContext()

  try {
    const qrRemarks = 'QR auto-mark'
    const first = await mark('PRESENT', context, qrRemarks)
    assert.equal(first.success, true)
    assert.equal(first.alreadyMarked, false)

    const duplicate = await mark('PRESENT', context, qrRemarks)
    assert.equal(duplicate.success, true)
    assert.equal(duplicate.alreadyMarked, true)

    const rows = await prisma.attendance.findMany({
      where: {
        studentId: context.studentId,
        courseId: context.courseId
      }
    })
    assert.equal(rows.length, 1)

    const report = await prisma.attendanceReport.findUnique({
      where: {
        courseId_date: {
          courseId: context.courseId,
          date: startOfToday()
        }
      }
    })

    assert.ok(report)
    assert.equal(report?.presentCount, 1)
    assert.equal(report?.lateCount, 0)
    assert.equal(report?.absentCount, 0)
  } finally {
    await cleanupTestContext(context)
  }
})

test('Manual attendance update overwrites the existing record', async () => {
  const context = await createTestContext()

  try {
    await mark('PRESENT', context, 'Initial QR auto-mark')

    const manualUpdate = await mark('LATE', context, 'Manual adjustment')
    assert.equal(manualUpdate.success, true)
    assert.equal(manualUpdate.alreadyMarked, false)
    assert.equal(manualUpdate.attendance.status, 'LATE')

    const report = await prisma.attendanceReport.findUnique({
      where: {
        courseId_date: {
          courseId: context.courseId,
          date: startOfToday()
        }
      }
    })

    assert.ok(report)
    assert.equal(report?.presentCount, 0)
    assert.equal(report?.lateCount, 1)
  } finally {
    await cleanupTestContext(context)
  }
})

test.after(async () => {
  await prisma.$disconnect()
})

