import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  try {
    const user = (req as any).user

    // Get today's date
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let whereClause: any = {
      date: {
        gte: today,
        lt: tomorrow
      },
      isActive: true
    }

    // Filter by teacher if not admin
    if (user.role !== 'ADMIN') {
      whereClause.course = {
        teacher: {
          userId: user.id
        }
      }
    }

    const todayClasses = await prisma.classSchedule.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            teacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        time: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      classes: todayClasses
    })
  } catch (error) {
    console.error('Error fetching today\'s classes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handler)
