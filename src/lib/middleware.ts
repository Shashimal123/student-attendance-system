import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'
import { logger } from './logger'

const middlewareLogger = logger.withContext('AuthMiddleware')

export function withAuth(handler: Function, allowedRoles: string[] = []) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      const token = req.headers.get('authorization')?.replace('Bearer ', '')
      
      if (!token) {
        middlewareLogger.warn('No token provided', { path: req.url })
        return NextResponse.json({ error: 'No token provided' }, { status: 401 })
      }

      const user = verifyToken(token)
      
      if (!user) {
        middlewareLogger.warn('Invalid token', { path: req.url })
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        middlewareLogger.warn('Insufficient permissions', { 
          path: req.url,
          userRole: user.role, 
          allowedRoles 
        })
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      middlewareLogger.debug('Authentication successful', { 
        userRole: user.role,
        path: req.url 
      })

      // Add user to request object
      ;(req as any).user = user
      
      return handler(req, ...args)
    } catch (error) {
      middlewareLogger.error('Authentication failed', error, { path: req.url })
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
