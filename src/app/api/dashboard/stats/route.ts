import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  try {
    const user = (req as any).user

    // Get counts based on user role
    let stats = {
      totalStudents: 0,
      totalTeachers: 0,
      totalCourses: 0,
      attendanceRate: 0
    }

    let recentActivity = []

    if (user.role === 'ADMIN') {
      // Admin can see all stats
      const [students, teachers, courses, attendanceRecords] = await Promise.all([
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.course.count(),
        prisma.attendance.findMany({
          take: 10,
          orderBy: { scannedAt: 'desc' },
          include: {
            student: {
              select: { firstName: true, lastName: true, studentId: true }
            },
            course: {
              select: { name: true, code: true }
            }
          }
        })
      ])

      stats = {
        totalStudents: students,
        totalTeachers: teachers,
        totalCourses: courses,
        attendanceRate: 85 // Mock attendance rate
      }

              recentActivity = attendanceRecords.map(record => ({
          id: record.id,
          description: `${record.student.firstName} ${record.student.lastName} marked ${record.status} in ${record.course.name}`,
          time: record.scannedAt.toLocaleDateString(),
          type: 'attendance'
        }))
    } else if (user.role === 'TEACHER') {
      // Teacher can see their courses and students
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.id }
      })

      if (teacher) {
        const [courses, students, attendanceRecords] = await Promise.all([
          prisma.course.count({
            where: { teacherId: teacher.id }
          }),
          prisma.student.count({
            where: {
              enrollments: {
                some: {
                  course: {
                    teacherId: teacher.id
                  }
                }
              }
            }
          }),
          prisma.attendance.findMany({
            where: {
              course: {
                teacherId: teacher.id
              }
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              student: {
                select: { firstName: true, lastName: true, studentId: true }
              },
              course: {
                select: { name: true, code: true }
              }
            }
          })
        ])

        stats = {
          totalStudents: students,
          totalTeachers: 1, // Just themselves
          totalCourses: courses,
          attendanceRate: 88 // Mock attendance rate
        }

        recentActivity = attendanceRecords.map(record => ({
          id: record.id,
          description: `${record.student.firstName} ${record.student.lastName} marked ${record.status} in ${record.course.name}`,
          time: record.scannedAt.toLocaleDateString(),
          type: 'attendance'
        }))
      }
    } else if (user.role === 'STUDENT') {
      // Student can see their own data
      const student = await prisma.student.findUnique({
        where: { userId: user.id }
      })

      if (student) {
        const [enrollments, attendanceRecords] = await Promise.all([
          prisma.courseEnrollment.count({
            where: { studentId: student.id }
          }),
          prisma.attendance.findMany({
            where: { studentId: student.id },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              course: {
                select: { name: true, code: true }
              }
            }
          })
        ])

        stats = {
          totalStudents: 1, // Just themselves
          totalTeachers: 0, // Students don't see teacher count
          totalCourses: enrollments,
          attendanceRate: 92 // Mock attendance rate
        }

        recentActivity = attendanceRecords.map(record => ({
          id: record.id,
          description: `You were marked ${record.status} in ${record.course.name}`,
          time: record.scannedAt.toLocaleDateString(),
          type: 'attendance'
        }))
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      recentActivity
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handler)
