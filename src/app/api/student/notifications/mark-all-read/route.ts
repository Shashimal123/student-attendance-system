import { NextRequest, NextResponse } from 'next/server'
import { withStudentAuth } from '@/lib/middleware'
import { markAllNotificationsAsRead } from '@/lib/notificationUtils'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  const user = (req as any).user

  if (req.method === 'PATCH') {
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

      await markAllNotificationsAsRead(student.id)

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
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

export const PATCH = withStudentAuth(handler)
