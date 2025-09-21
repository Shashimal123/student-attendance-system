import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      console.log('Teachers API called')
      
      const teachers = await prisma.teacher.findMany({
        include: {
          user: {
            select: {
              email: true,
              isActive: true
            }
          },
          courses: {
            select: {
              name: true,
              code: true
            }
          }
        },
        orderBy: { firstName: 'asc' }
      })

      console.log('Found teachers:', teachers.length)

      return NextResponse.json({
        success: true,
        teachers: teachers.map(teacher => ({
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: teacher.user.email,
          phone: teacher.phone,
          isActive: teacher.isActive,
          createdAt: teacher.createdAt.toISOString(),
          courses: teacher.courses
        }))
      })
    } catch (error) {
      console.error('Error fetching teachers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch teachers. Please try again.' },
        { status: 500 }
      )
    }
  } else if (req.method === 'POST') {
    try {
      const { firstName, lastName, email, password, phone } = await req.json()

      // Create user account
      const hashedPassword = await hashPassword(password)
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'TEACHER'
        }
      })

      // Create teacher profile
      const teacher = await prisma.teacher.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          phone,
          isActive: true
        }
      })

      return NextResponse.json({
        success: true,
        teacher: {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: user.email,
          phone: teacher.phone,
          isActive: teacher.isActive
        }
      })
    } catch (error) {
      console.error('Error creating teacher:', error)
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A teacher with this email already exists.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create teacher. Please try again.' },
        { status: 500 }
      )
    }
  } else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

export const GET = withAdminAuth(handler)
export const POST = withAdminAuth(handler)
