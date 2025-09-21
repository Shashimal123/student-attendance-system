import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function handler(req: NextRequest) {
  try {
    const user = (req as any).user

    // Only admins can access this endpoint
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    if (req.method === 'GET') {
      const admins = await prisma.admin.findMany({
        select: {
          id: true,
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          user: {
            createdAt: 'desc'
          }
        }
      })

      // Transform the data to match the expected format
      const transformedAdmins = admins.map(admin => ({
        id: admin.id,
        email: admin.user.email,
        firstName: admin.user.firstName,
        lastName: admin.user.lastName,
        isActive: admin.user.isActive,
        createdAt: admin.user.createdAt
      }))

      return NextResponse.json({
        success: true,
        admins: transformedAdmins
      })
    }

    if (req.method === 'POST') {
      const { email, firstName, lastName, password } = await req.json()

      // Validate input
      if (!email || !firstName || !lastName || !password) {
        return NextResponse.json(
          { error: 'All fields are required' },
          { status: 400 }
        )
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user and admin in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            firstName,
            lastName,
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true
          }
        })

        const newAdmin = await tx.admin.create({
          data: {
            userId: newUser.id
          }
        })

        return { user: newUser, admin: newAdmin }
      })

      return NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        admin: {
          id: result.admin.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          isActive: result.user.isActive,
          createdAt: result.user.createdAt
        }
      })
    }

    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    )
  } catch (error) {
    console.error('Error handling admin users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handler)
export const POST = withAuth(handler)
