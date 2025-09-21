import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    try {
      const students = await prisma.student.findMany({
        include: {
          user: {
            select: {
              email: true,
              isActive: true
            }
          },
          enrollments: {
            include: {
              course: {
                select: {
                  name: true,
                  code: true
                }
              }
            }
          },
          payments: {
            select: {
              month: true,
              year: true,
              status: true
            }
          }
        },
        orderBy: { firstName: 'asc' }
      })

      return NextResponse.json({
        success: true,
        students: students.map(student => ({
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.user.email,
          phone: student.phone,
          isActive: student.isActive,
          createdAt: student.createdAt.toISOString(),
          enrollments: student.enrollments.map(enrollment => ({
            courseName: enrollment.course.name,
            courseCode: enrollment.course.code
          })),
          payments: student.payments
        }))
      })
    } catch (error) {
      console.error('Error fetching students:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } else if (req.method === 'POST') {
    try {
      const formData = await req.formData()
      
      const firstName = formData.get('firstName') as string
      const lastName = formData.get('lastName') as string
      const email = formData.get('email') as string
      const password = formData.get('password') as string
      const phone = formData.get('phone') as string
      const dateOfBirth = formData.get('dateOfBirth') as string
      const address = formData.get('address') as string
      const parentName = formData.get('parentName') as string
      const parentPhone = formData.get('parentPhone') as string
      const parentEmail = formData.get('parentEmail') as string
      const selectedCourses = formData.get('selectedCourses') as string
      const photo = formData.get('photo') as File | null

      console.log('Received student data:', {
        firstName,
        lastName,
        email,
        password: password ? '***' : 'MISSING',
        dateOfBirth,
        selectedCourses
      })

      // Validate required fields
      console.log('Validating fields:', {
        firstName: !!firstName,
        lastName: !!lastName,
        email: !!email,
        password: !!password,
        dateOfBirth: !!dateOfBirth
      })
      
      if (!firstName || !lastName || !email || !password || !dateOfBirth) {
        console.log('Missing required fields:', { 
          firstName: !!firstName, 
          lastName: !!lastName, 
          email: !!email, 
          password: !!password, 
          dateOfBirth: !!dateOfBirth 
        })
        return NextResponse.json(
          { error: 'Missing required fields: First Name, Last Name, Email, Password, and Date of Birth are required.' },
          { status: 400 }
        )
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists. Please use a different email address.' },
          { status: 400 }
        )
      }

      // Create user account
      const hashedPassword = await hashPassword(password)
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: 'STUDENT'
        }
      })

      // Generate unique student ID and QR code
      const studentId = `STU${Date.now().toString().slice(-6)}`
      const qrCode = `${studentId}-${uuidv4().slice(0, 8)}`

      // Handle photo upload (for now, we'll store the file path)
      let photoUrl = null
      if (photo) {
        // In a real application, you would upload to cloud storage
        // For now, we'll store a placeholder
        photoUrl = `/uploads/students/${studentId}-${Date.now()}.jpg`
      }

      // Create student profile
      const student = await prisma.student.create({
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
          photo: photoUrl,
          qrCode,
          isActive: true
        }
      })

      // Enroll in selected courses
      if (selectedCourses) {
        const courseIds = selectedCourses.split(',').filter(id => id.trim())
        for (const courseId of courseIds) {
          await prisma.courseEnrollment.create({
            data: {
              studentId: student.id,
              courseId: courseId.trim(),
              isActive: true
            }
          })
        }
      }

      return NextResponse.json({
        success: true,
        student: {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: user.email,
          qrCode: student.qrCode
        }
      })
    } catch (error) {
      console.error('Error creating student:', error)
      
      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Email already exists. Please use a different email address.' },
          { status: 400 }
        )
      }
      
      // Handle validation errors
      if (error.name === 'PrismaClientValidationError') {
        return NextResponse.json(
          { error: 'Invalid data provided. Please check all required fields.' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create student. Please try again.' },
        { status: 500 }
      )
    }
  } else {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
}

export const GET = withAdminAuth(handler)
export const POST = withAdminAuth(handler)
