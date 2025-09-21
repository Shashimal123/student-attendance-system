import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  const user = (req as any).user

  try {
    // Get full user data based on role
    let userData = null

    if (user.role === 'STUDENT') {
      userData = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          student: {
            include: {
              enrollments: {
                include: {
                  course: true
                }
              }
            }
          }
        }
      })
    } else if (user.role === 'TEACHER') {
      userData = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          teacher: {
            include: {
              courses: true
            }
          }
        }
      })
    } else if (user.role === 'ADMIN') {
      userData = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          admin: true
        }
      })
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        studentId: userData.student?.id,
        teacherId: userData.teacher?.id,
        adminId: userData.admin?.id,
        profile: userData.student || userData.teacher || userData.admin,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handler)
