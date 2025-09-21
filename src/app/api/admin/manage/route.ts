import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: {
          admin: {
            select: {
              firstName: true,
              lastName: true,
              isActive: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      return NextResponse.json({
        success: true,
        admins: admins.map(admin => ({
          id: admin.id,
          firstName: admin.admin?.firstName || '',
          lastName: admin.admin?.lastName || '',
          email: admin.email,
          isActive: admin.admin?.isActive || false,
          createdAt: admin.admin?.createdAt?.toISOString() || admin.createdAt.toISOString()
        }))
      })
    } catch (error) {
      console.error('Error fetching admins:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else if (req.method === 'POST') {
    try {
      const { firstName, lastName, email, password } = await req.json()

      if (!firstName || !lastName || !email || !password) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        )
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create user account
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'ADMIN'
        }
      })

      // Create admin profile
      const admin = await prisma.admin.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          isActive: true
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Admin created successfully',
        admin: {
          id: admin.id,
          firstName: admin.firstName,
          lastName: admin.lastName,
          email: user.email
        }
      })
    } catch (error) {
      console.error('Error creating admin:', error)
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
