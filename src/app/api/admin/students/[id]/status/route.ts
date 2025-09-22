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
    const studentId = resolvedParams.id

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { isActive }
    })

    return NextResponse.json({
      success: true,
      student: updatedStudent
    })
  } catch (error) {
    console.error('Error updating student status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PATCH = withAdminAuth(handler)
