import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createUser, generateToken } from '@/lib/auth'
import { generateStudentId } from '@/lib/studentUtils'
import { sendWelcomeEmail } from '@/lib/emailUtils'

export async function POST(req: NextRequest) {
  try {
    const { 
      email, 
      password, 
      role, 
      firstName, 
      lastName, 
      dateOfBirth, 
      phone, 
      address,
      parentName,
      parentPhone,
      parentEmail 
    } = await req.json()

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Required fields are missing' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    const user = await createUser(email, password, role || 'STUDENT')
    
    let studentId = null

    if (role === 'STUDENT' || !role) {
      studentId = await generateStudentId()

      await prisma.student.create({
        data: {
          userId: user.id,
          studentId,
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          phone,
          address,
          parentName,
          parentPhone,
          parentEmail,
          qrCode: studentId,
        }
      })
    }

    if (role === 'TEACHER') {
      await prisma.teacher.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          phone,
        }
      })
    }

    if (role === 'ADMIN') {
      await prisma.admin.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
        }
      })
    }

    const token = generateToken(user)

    if (role === 'STUDENT' || !role) {
      try {
        await sendWelcomeEmail(email, `${firstName} ${lastName}`, studentId || '')
      } catch (error) {
        console.error('Error sending welcome email:', error)
      }
    }

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        studentId,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
