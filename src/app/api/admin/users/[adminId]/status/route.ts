import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) {
  try {
    const user = (req as any).user
    const { adminId } = await params

    // Only admins can access this endpoint
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    if (req.method === 'PUT') {
      const { isActive } = await req.json()

      // Validate input
      if (typeof isActive !== 'boolean') {
        return NextResponse.json(
          { error: 'isActive must be a boolean' },
          { status: 400 }
        )
      }

      // Find the admin and update their status
      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        include: {
          user: true
        }
      })

      if (!admin) {
        return NextResponse.json(
          { error: 'Admin not found' },
          { status: 404 }
        )
      }

      // Prevent deactivating the current user
      if (admin.userId === user.id && !isActive) {
        return NextResponse.json(
          { error: 'Cannot deactivate your own account' },
          { status: 400 }
        )
      }

      // Update the user's active status
      const updatedUser = await prisma.user.update({
        where: { id: admin.userId },
        data: { isActive }
      })

      return NextResponse.json({
        success: true,
        message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
        admin: {
          id: admin.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt
        }
      })
    }

    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    )
  } catch (error) {
    console.error('Error updating admin status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAuth(handler)
