/**
 * Logger utility for the application
 * Provides structured logging with different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogOptions {
  level?: LogLevel
  context?: string
  data?: Record<string, unknown>
}

class Logger {
  private isDevelopment: boolean
  private isProduction: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  private formatMessage(level: LogLevel, message: string, context?: string, data?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? `[${context}]` : ''
    const dataStr = data ? ` ${JSON.stringify(data)}` : ''
    return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}${dataStr}`
  }

  private log(level: LogLevel, message: string, options?: LogOptions) {
    const { context, data } = options || {}
    
    // In production, only log errors and warnings
    if (this.isProduction && (level === 'debug' || level === 'info')) {
      return
    }

    const formattedMessage = this.formatMessage(level, message, context, data)

    switch (level) {
      case 'debug':
        console.debug(formattedMessage)
        break
      case 'info':
        console.log(formattedMessage)
        break
      case 'warn':
        console.warn(formattedMessage)
        break
      case 'error':
        console.error(formattedMessage)
        break
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, options?: LogOptions): void {
    this.log('debug', message, options)
  }

  /**
   * Log informational messages
   */
  info(message: string, options?: LogOptions): void {
    this.log('info', message, options)
  }

  /**
   * Log warning messages
   */
  warn(message: string, options?: LogOptions): void {
    this.log('warn', message, options)
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error | unknown, options?: LogOptions): void {
    const errorData = error instanceof Error 
      ? { 
          message: error.message, 
          stack: error.stack,
          name: error.name 
        }
      : error
    
    this.log('error', message, {
      ...options,
      data: { ...options?.data, error: errorData }
    })
  }

  /**
   * Create a logger instance with a specific context
   */
  withContext(context: string): Logger {
    const contextualLogger = new Logger()
    const originalLog = contextualLogger.log.bind(contextualLogger)
    
    contextualLogger.log = (level: LogLevel, message: string, options?: LogOptions) => {
      originalLog(level, message, { ...options, context })
    }
    
    return contextualLogger
  }
}

// Export a singleton instance
export const logger = new Logger()

// Export the Logger class for custom instances
export { Logger }

