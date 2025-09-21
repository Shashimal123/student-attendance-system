import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      const courses = await prisma.course.findMany({
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          enrollments: {
            where: { isActive: true },
            include: {
              student: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      })

      return NextResponse.json({
        success: true,
        courses: courses.map(course => ({
          id: course.id,
          name: course.name,
          description: course.description,
          code: course.code,
          fee: course.fee,
          duration: course.duration,
          isActive: course.isActive,
          teacher: {
            id: course.teacher.id,
            name: `${course.teacher.firstName} ${course.teacher.lastName}`
          },
          enrollments: course.enrollments
        }))
      })
    } catch (error) {
      console.error('Error fetching courses:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else if (req.method === 'POST') {
    try {
      const { name, code, description, fee, duration, teacherId } = await req.json()

      if (!name || !code || !fee || !duration || !teacherId) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Check if course code already exists
      const existingCourse = await prisma.course.findUnique({
        where: { code }
      })

      if (existingCourse) {
        return NextResponse.json(
          { error: 'Course code already exists' },
          { status: 400 }
        )
      }

      const course = await prisma.course.create({
        data: {
          name,
          code,
          description,
          fee: parseFloat(fee),
          duration: parseInt(duration),
          teacherId,
          isActive: true
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Course created successfully',
        course
      })
    } catch (error) {
      console.error('Error creating course:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

export const GET = withAdminAuth(handler)
export const POST = withAdminAuth(handler)
