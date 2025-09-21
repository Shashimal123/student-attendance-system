import { NextRequest, NextResponse } from 'next/server'
import { withStudentAuth } from '@/lib/middleware'
import { getStudentNotifications } from '@/lib/notificationUtils'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  const user = (req as any).user

  try {
    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId: user.id }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student record not found' },
        { status: 404 }
      )
    }

    const notifications = await getStudentNotifications(student.id, 50)

    return NextResponse.json({
      success: true,
      notifications: notifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withStudentAuth(handler)
