import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, withTeacherAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function adminHandler() {
  try {
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(courses.map(course => ({
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
    })))
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function teacherHandler(req: NextRequest) {
  const user = (req as unknown as { user: { id: string } }).user

  try {
    const courses = await prisma.course.findMany({
      where: { 
        isActive: true,
        teacher: {
          userId: user.id
        }
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(courses.map(course => ({
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
    })))
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  // Try admin auth first
  try {
    return await withAdminAuth(adminHandler)(req)
  } catch {
    // If admin auth fails, try teacher auth
    try {
      return await withTeacherAuth(teacherHandler)(req)
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }
}
