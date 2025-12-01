# Logging Guide

This guide explains how to use the logger utility in the Student Attendance System.

## Quick Start

```typescript
import { logger } from '@/lib/logger'

// Basic logging
logger.info('User logged in')
logger.warn('Payment overdue')
logger.error('Database connection failed', error)
logger.debug('Processing request') // Only in development
```

## Log Levels

### `logger.debug(message, options?)`
- **When to use**: Detailed debugging information
- **Visibility**: Only in development mode
- **Example**: `logger.debug('Processing request', { userId: '123' })`

### `logger.info(message, options?)`
- **When to use**: General informational messages
- **Visibility**: Development and production
- **Example**: `logger.info('User created', { userId: '123', email: 'user@example.com' })`

### `logger.warn(message, options?)`
- **When to use**: Warning messages that don't break functionality
- **Visibility**: Always visible
- **Example**: `logger.warn('Payment due soon', { studentId: '123', daysLeft: 3 })`

### `logger.error(message, error?, options?)`
- **When to use**: Error messages that need attention
- **Visibility**: Always visible
- **Example**: `logger.error('Failed to send email', error, { userId: '123' })`

## Using Context

Create a logger with a specific context for better organization:

```typescript
import { logger } from '@/lib/logger'

// In API routes
const apiLogger = logger.withContext('API')
apiLogger.info('Request received') // Logs: [API] Request received

// In middleware
const middlewareLogger = logger.withContext('Middleware')
middlewareLogger.info('Authentication check') // Logs: [Middleware] Authentication check
```

## Examples

### In API Routes

```typescript
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiLogger = logger.withContext('API:POST:/api/students')
  
  try {
    apiLogger.info('Creating student', { body: await req.json() })
    
    // Your logic here
    
    apiLogger.info('Student created successfully', { studentId: '123' })
    return NextResponse.json({ success: true })
  } catch (error) {
    apiLogger.error('Failed to create student', error, { 
      endpoint: '/api/students' 
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### In Middleware

```typescript
import { logger } from '@/lib/logger'

const middlewareLogger = logger.withContext('AuthMiddleware')

export function withAuth(handler: Function) {
  return async (req: NextRequest) => {
    try {
      const token = req.headers.get('authorization')
      
      if (!token) {
        middlewareLogger.warn('No token provided', { path: req.url })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      // Your auth logic
      
    } catch (error) {
      middlewareLogger.error('Authentication failed', error, { path: req.url })
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }
  }
}
```

### In React Components (Client-side)

```typescript
'use client'
import { logger } from '@/lib/logger'

export default function MyComponent() {
  const handleClick = () => {
    logger.info('Button clicked', { component: 'MyComponent' })
    // Your logic
  }
  
  return <button onClick={handleClick}>Click me</button>
}
```

### With Additional Data

```typescript
logger.info('Payment processed', {
  context: 'Payment',
  data: {
    studentId: '123',
    amount: 500,
    paymentId: 'pay_456'
  }
})
```

## Best Practices

1. **Use appropriate log levels**
   - `debug`: Only for detailed debugging
   - `info`: For important events (user actions, successful operations)
   - `warn`: For potential issues that don't break functionality
   - `error`: For actual errors that need attention

2. **Include context**
   - Use `withContext()` to organize logs by module/feature
   - Include relevant IDs (userId, studentId, etc.) in the data

3. **Don't log sensitive information**
   - Never log passwords, tokens, or personal data
   - Be careful with user data in logs

4. **Use structured data**
   - Pass objects as the `data` option for better searchability
   - Include relevant IDs and context

5. **Error logging**
   - Always pass the error object to `logger.error()`
   - Include additional context about what operation failed

## Output Format

Logs are formatted as:
```
TIMESTAMP LEVEL [CONTEXT] MESSAGE {JSON_DATA}
```

Example:
```
2025-11-30T12:34:56.789Z INFO [API:POST:/api/students] Student created successfully {"studentId":"123","email":"student@example.com"}
```

## Production Behavior

- `debug` and `info` logs are **disabled** in production
- `warn` and `error` logs are **always visible**
- This helps reduce log noise in production while keeping important information

