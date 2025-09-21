import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'TEACHER' | 'STUDENT'
  studentId?: string
  teacherId?: string
  adminId?: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser
  } catch {
    return null
  }
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      student: true,
      teacher: true,
      admin: true,
    },
  })

  if (!user || !user.isActive) {
    return null
  }

  const isValidPassword = await verifyPassword(password, user.password)
  if (!isValidPassword) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    studentId: user.student?.id,
    teacherId: user.teacher?.id,
    adminId: user.admin?.id,
  }
}

export async function createUser(
  email: string,
  password: string,
  role: 'ADMIN' | 'TEACHER' | 'STUDENT'
): Promise<AuthUser> {
  const hashedPassword = await hashPassword(password)
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role,
    },
  })

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  }
}
