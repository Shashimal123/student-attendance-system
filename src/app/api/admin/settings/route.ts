import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    let settings = await prisma.systemSettings.findMany({
      orderBy: { key: 'asc' }
    })

    // If no settings exist, create default ones
    if (settings.length === 0) {
      const defaultSettings = [
        {
          key: 'payment_due_day',
          value: '15',
          description: 'Day of month when payments are due'
        },
        {
          key: 'late_fee_percentage',
          value: '5',
          description: 'Late fee percentage for overdue payments'
        },
        {
          key: 'attendance_grace_period',
          value: '15',
          description: 'Grace period in minutes for late attendance'
        },
        {
          key: 'max_absences',
          value: '3',
          description: 'Maximum absences allowed per month'
        }
      ]

      for (const setting of defaultSettings) {
        await prisma.systemSettings.create({
          data: setting
        })
      }

      settings = await prisma.systemSettings.findMany({
        orderBy: { key: 'asc' }
      })
    }

    return NextResponse.json({
      success: true,
      settings: settings.map(setting => ({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        description: setting.description
      }))
    })
  } catch (error) {
    console.error('Error fetching system settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handler)
