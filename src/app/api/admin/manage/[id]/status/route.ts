import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.method !== 'PATCH') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { isActive } = await req.json()
    const adminId = params.id

    // Find the admin by user ID
    const admin = await prisma.admin.findFirst({
      where: { userId: adminId }
    })

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    // Update admin status
    const updatedAdmin = await prisma.admin.update({
      where: { id: admin.id },
      data: { isActive }
    })

    return NextResponse.json({
      success: true,
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      admin: {
        id: updatedAdmin.id,
        isActive: updatedAdmin.isActive
      }
    })
  } catch (error) {
    console.error('Error updating admin status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PATCH = withAdminAuth(handler)
