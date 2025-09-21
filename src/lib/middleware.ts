import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'

export function withAuth(handler: Function, allowedRoles: string[] = []) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      const token = req.headers.get('authorization')?.replace('Bearer ', '')
      console.log('Middleware - Token:', token ? 'Token exists' : 'No token')
      
      if (!token) {
        console.log('Middleware - No token provided')
        return NextResponse.json({ error: 'No token provided' }, { status: 401 })
      }

      const user = verifyToken(token)
      console.log('Middleware - Verified user:', user)
      
      if (!user) {
        console.log('Middleware - Invalid token')
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        console.log('Middleware - Insufficient permissions, user role:', user.role, 'allowed roles:', allowedRoles)
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      console.log('Middleware - Authentication successful, user role:', user.role)
      
      // Add user to request object
      ;(req as any).user = user
      
      return handler(req, ...args)
    } catch (error) {
      console.error('Middleware - Authentication failed:', error)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
  }
}

export function withAdminAuth(handler: Function) {
  return withAuth(handler, ['ADMIN'])
}

export function withTeacherAuth(handler: Function) {
  return withAuth(handler, ['ADMIN', 'TEACHER'])
}

export function withStudentAuth(handler: Function) {
  return withAuth(handler, ['ADMIN', 'TEACHER', 'STUDENT'])
}
