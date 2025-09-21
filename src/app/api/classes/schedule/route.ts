import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  try {
    const user = (req as any).user

    if (req.method === 'POST') {
      const { courseId, date, time, duration } = await req.json()

      // Verify the course belongs to the teacher (unless admin)
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

      // Create or update class schedule
      const classSchedule = await prisma.classSchedule.upsert({
        where: {
          courseId_date: {
            courseId,
            date: new Date(date)
          }
        },
        update: {
          time,
          duration,
          isActive: true
        },
        create: {
          courseId,
          date: new Date(date),
          time,
          duration,
          isActive: true
        }
      })

      return NextResponse.json({
        success: true,
        classSchedule
      })
    }

    if (req.method === 'GET') {
      const { searchParams } = new URL(req.url)
      const month = searchParams.get('month')
      const year = searchParams.get('year')

      let whereClause: any = {}
      
      if (user.role !== 'ADMIN') {
        whereClause.course = {
          teacher: {
            userId: user.id
          }
        }
      }

      if (month && year) {
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
        const endDate = new Date(parseInt(year), parseInt(month), 0)
        
        whereClause.date = {
          gte: startDate,
          lte: endDate
        }
      }

      const schedules = await prisma.classSchedule.findMany({
        where: whereClause,
        include: {
          course: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        orderBy: {
          date: 'asc'
        }
      })

      return NextResponse.json({
        success: true,
        schedules
      })
    }

    if (req.method === 'DELETE') {
      const { searchParams } = new URL(req.url)
      const scheduleId = searchParams.get('id')

      if (!scheduleId) {
        return NextResponse.json(
          { error: 'Schedule ID is required' },
          { status: 400 }
        )
      }

      const schedule = await prisma.classSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          course: {
            select: {
              teacherId: true
            }
          }
        }
      })

      if (!schedule) {
        return NextResponse.json(
          { error: 'Schedule not found' },
          { status: 404 }
        )
      }

      // Verify ownership (unless admin)
      if (user.role !== 'ADMIN') {
        const teacher = await prisma.teacher.findUnique({
          where: { userId: user.id }
        })

        if (schedule.course.teacherId !== teacher?.id) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          )
        }
      }

      await prisma.classSchedule.delete({
        where: { id: scheduleId }
      })

      return NextResponse.json({
        success: true,
        message: 'Schedule deleted successfully'
      })
    }

    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    )
  } catch (error) {
    console.error('Error handling class schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handler)
export const POST = withAuth(handler)
export const DELETE = withAuth(handler)
