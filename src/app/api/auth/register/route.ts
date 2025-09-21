import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createUser, generateToken, hashPassword } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import QRCode from 'qrcode'
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Create user
    const user = await createUser(email, password, role || 'STUDENT')
    
    let studentId = null
    let qrCode = null

    // If student, create student record with QR code
    if (role === 'STUDENT' || !role) {
      studentId = `STU${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      qrCode = await QRCode.toDataURL(studentId)

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
          qrCode,
        }
      })
    }

    // If teacher, create teacher record
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

    // If admin, create admin record
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

    // Send welcome email to student (optional)
    if (role === 'STUDENT' || !role) {
      try {
        await sendWelcomeEmail(email, `${firstName} ${lastName}`, studentId)
      } catch (error) {
        console.error('Error sending welcome email:', error)
        // Don't fail registration if email fails
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
