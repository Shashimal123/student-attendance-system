import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.method !== 'PATCH') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { value } = await req.json()
    const settingId = params.id

    const updatedSetting = await prisma.systemSettings.update({
      where: { id: settingId },
      data: { value }
    })

    return NextResponse.json({
      success: true,
      setting: updatedSetting
    })
  } catch (error) {
    console.error('Error updating system setting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PATCH = withAdminAuth(handler)
