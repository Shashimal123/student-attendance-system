import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  if (req.method !== 'PUT') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { paymentMethod, reference } = await req.json()
    const paymentId = params.id

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        student: true,
        course: true
      }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidDate: new Date(),
        paymentMethod: paymentMethod || null,
        reference: reference || null
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true,
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
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Payment marked as paid successfully',
      payment: {
        id: updatedPayment.id,
        student: updatedPayment.student,
        course: updatedPayment.course,
        month: updatedPayment.month,
        year: updatedPayment.year,
        amount: updatedPayment.amount,
        status: updatedPayment.status,
        dueDate: updatedPayment.dueDate.toISOString(),
        paidDate: updatedPayment.paidDate?.toISOString(),
        paymentMethod: updatedPayment.paymentMethod,
        reference: updatedPayment.reference
      }
    })
  } catch (error) {
    console.error('Error marking payment as paid:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const PUT = withAdminAuth(handler)
