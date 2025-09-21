import { NextRequest, NextResponse } from 'next/server'
import { withTeacherAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  const user = (req as any).user

  try {
    let courses

    if (user.role === 'ADMIN') {
      // Admin can see all courses
      courses = await prisma.course.findMany({
        where: { isActive: true },
        include: {
          teacher: {
            include: {
              user: true
            }
          }
        },
        orderBy: { name: 'asc' }
      })
    } else {
      // Teacher can only see their own courses
      courses = await prisma.course.findMany({
        where: { 
          isActive: true,
          teacher: {
            userId: user.id
          }
        },
        include: {
          teacher: {
            include: {
              user: true
            }
          }
        },
        orderBy: { name: 'asc' }
      })
    }

    return NextResponse.json({
      success: true,
      courses: courses.map(course => ({
        id: course.id,
        name: course.name,
        code: course.code,
        description: course.description,
        fee: course.fee,
        duration: course.duration,
        teacher: {
          id: course.teacher.id,
          name: `${course.teacher.firstName} ${course.teacher.lastName}`
        }
      }))
    })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withTeacherAuth(handler)
