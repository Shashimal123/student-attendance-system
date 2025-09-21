import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      const { searchParams } = new URL(req.url)
      const month = searchParams.get('month')
      const year = searchParams.get('year')
      const teacherId = searchParams.get('teacherId')

      let whereClause: any = {}
      
      if (month) {
        whereClause.month = parseInt(month)
      }
      
      if (year) {
        whereClause.year = parseInt(year)
      }

      if (teacherId) {
        whereClause.teacherId = teacherId
      }

      const payouts = await prisma.teacherPayout.findMany({
        where: whereClause,
        include: {
          teacher: {
            select: {
              firstName: true,
              lastName: true,
              phone: true
            }
          },
          course: {
            select: {
              name: true,
              code: true,
              fee: true
            }
          }
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
          { teacher: { firstName: 'asc' } }
        ]
      })

      // Calculate total statistics
      const totalCollected = payouts.reduce((sum, p) => sum + p.totalCollected, 0)
      const totalTeacherShare = payouts.reduce((sum, p) => sum + p.teacherShare, 0)
      const totalInstituteShare = payouts.reduce((sum, p) => sum + p.instituteShare, 0)

      return NextResponse.json({
        success: true,
        payouts: payouts.map(payout => ({
          id: payout.id,
          teacher: payout.teacher,
          course: payout.course,
          month: payout.month,
          year: payout.year,
          totalCollected: payout.totalCollected,
          teacherShare: payout.teacherShare,
          instituteShare: payout.instituteShare,
          payoutDate: payout.payoutDate?.toISOString(),
          status: payout.status,
          createdAt: payout.createdAt.toISOString()
        })),
        statistics: {
          totalCollected,
          totalTeacherShare,
          totalInstituteShare,
          totalPayouts: payouts.length
        }
      })
    } catch (error) {
      console.error('Error fetching teacher payouts:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else if (req.method === 'POST') {
    try {
      const { month, year } = await req.json()

      if (!month || !year) {
        return NextResponse.json(
          { error: 'Month and year are required' },
          { status: 400 }
        )
      }

      // Get all paid payments for the specified month and year
      const paidPayments = await prisma.payment.findMany({
        where: {
          month: parseInt(month),
          year: parseInt(year),
          status: 'PAID'
        },
        include: {
          course: {
            select: {
              teacherId: true
            }
          }
        }
      })

      // Group payments by course and calculate totals
      const courseTotals = new Map()
      
      paidPayments.forEach(payment => {
        const courseId = payment.courseId
        if (!courseTotals.has(courseId)) {
          courseTotals.set(courseId, {
            courseId,
            teacherId: payment.course.teacherId,
            totalCollected: 0
          })
        }
        courseTotals.get(courseId).totalCollected += payment.amount
      })

      // Create or update teacher payouts
      const payouts = []
      
      for (const [courseId, data] of courseTotals) {
        const teacherShare = data.totalCollected * 0.7 // 70%
        const instituteShare = data.totalCollected * 0.3 // 30%

        // Check if payout already exists
        const existingPayout = await prisma.teacherPayout.findFirst({
          where: {
            teacherId: data.teacherId,
            courseId: courseId,
            month: parseInt(month),
            year: parseInt(year)
          }
        })

        let payout
        if (existingPayout) {
          // Update existing payout
          payout = await prisma.teacherPayout.update({
            where: { id: existingPayout.id },
            data: {
              totalCollected: data.totalCollected,
              teacherShare,
              instituteShare
            }
          })
        } else {
          // Create new payout
          payout = await prisma.teacherPayout.create({
            data: {
              teacherId: data.teacherId,
              courseId: courseId,
              month: parseInt(month),
              year: parseInt(year),
              totalCollected: data.totalCollected,
              teacherShare,
              instituteShare
            }
          })
        }

        payouts.push(payout)
      }

      return NextResponse.json({
        success: true,
        message: `Teacher payouts calculated for ${month}/${year}`,
        payouts: payouts.length,
        totalCollected: Array.from(courseTotals.values()).reduce((sum, data) => sum + data.totalCollected, 0)
      })
    } catch (error) {
      console.error('Error calculating teacher payouts:', error)
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
