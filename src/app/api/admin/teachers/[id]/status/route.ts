import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.method !== 'PATCH') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { isActive } = await req.json()
    const resolvedParams = await params
    const teacherId = resolvedParams.id

    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: { isActive }
    })

    return NextResponse.json({
      success: true,
      teacher: updatedTeacher
    })
  } catch (error) {
    console.error('Error updating teacher status:', error)
    return NextResponse.json(
      { error: 'Failed to update teacher status. Please try again.' },
      { status: 500 }
    )
  }
}

export const PATCH = withAdminAuth(handler)
