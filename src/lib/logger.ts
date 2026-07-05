/**
 * Centralized Logging Service
 * Replace all console.log/warn/error calls with this service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: number
  stack?: string
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 500
  private isDevelopment = import.meta.env.DEV
  private isProduction = import.meta.env.PROD
  private apiErrors: any[] = []

  constructor() {
    this.setupGlobalErrorHandlers()
    this.loadPersistedLogs()
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers() {
    // Unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      })

      if (this.isProduction) {
        this.sendToBackend('unhandled_error', event.error)
      }
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', event.reason)

      if (this.isProduction) {
        this.sendToBackend('unhandled_rejection', event.reason)
      }
    })
  }

  /**
   * Load persisted logs from localStorage
   */
  private loadPersistedLogs() {
    try {
      const saved = localStorage.getItem('app_logs')
      if (saved) {
        this.logs = JSON.parse(saved)
      }
    } catch (err) {
      // Silently fail
    }
  }

  /**
   * Persist logs to localStorage
   */
  private persistLogs() {
    try {
      localStorage.setItem('app_logs', JSON.stringify(this.logs.slice(-100)))
    } catch (err) {
      // Silently fail
    }
  }

  /**
   * Send error to backend
   */
  private async sendToBackend(type: string, error: any) {
    try {
      const errorData = {
        type,
        message: error?.message || String(error),
        stack: error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }

      this.apiErrors.push(errorData)

      await fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      })
    } catch (err) {
      // Silently fail
    }
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`🔍 ${message}`, data || '')
    }
    this.recordLog('debug', message, data)
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`ℹ️ ${message}`, data || '')
    }
    this.recordLog('info', message, data)
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: any) {
    if (this.isDevelopment) {
      console.warn(`⚠️ ${message}`, data || '')
    }
    this.recordLog('warn', message, data)
  }

  /**
   * Log errors
   */
  error(message: string, error?: any) {
    if (this.isDevelopment) {
      console.error(`❌ ${message}`, error || '')
    }
    this.recordLog('error', message, error, error?.stack)

    if (this.isProduction && error) {
      this.sendToBackend('application_error', error)
    }
  }

  /**
   * Track API call performance
   */
  trackAPI(method: string, url: string, duration: number, status: number) {
    const data = { method, url, duration: `${duration}ms`, status }

    if (status >= 400) {
      this.error(`API Error: ${method} ${url}`, data)
    } else if (duration > 1000) {
      this.warn(`Slow API: ${method} ${url}`, data)
    } else {
      this.debug(`API: ${method} ${url}`, data)
    }
  }

  /**
   * Track user actions
   */
  trackAction(action: string, data?: any) {
    this.info(`User Action: ${action}`, data)
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, duration: number) {
    const data = { duration: `${duration}ms` }

    if (duration > 3000) {
      this.warn(`Slow Performance: ${metric}`, data)
    } else {
      this.debug(`Performance: ${metric}`, data)
    }
  }

  /**
   * Record log entry with memory management
   */
  private recordLog(level: LogLevel, message: string, data?: any, stack?: string) {
    this.logs.push({
      level,
      message,
      data,
      timestamp: Date.now(),
      stack
    })

    // Prevent memory leaks
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Persist in production
    if (this.isProduction) {
      this.persistLogs()
    }
  }

  /**
   * Get recent logs for debugging
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count)
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * Get API errors
   */
  getAPIErrors() {
    return this.apiErrors
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      total: this.logs.length,
      errors: this.logs.filter(l => l.level === 'error').length,
      warnings: this.logs.filter(l => l.level === 'warn').length,
      info: this.logs.filter(l => l.level === 'info').length,
      debug: this.logs.filter(l => l.level === 'debug').length,
      apiErrors: this.apiErrors.length
    }
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = []
    this.apiErrors = []
    localStorage.removeItem('app_logs')
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Send error logs to backend
   */
  async sendErrorLogsToServer() {
    const errors = this.getLogsByLevel('error')
    if (errors.length === 0) return

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errors)
      })
    } catch (err) {
      // Silently fail - don't create infinite loop
    }
  }
}

export const logger = new Logger()

// Development helpers
if (import.meta.env.DEV) {
  // Expose logger globally for debugging
  ;(window as any).logger = logger
}

// Export performance and action tracking
export const trackAPI = logger.trackAPI.bind(logger)
export const trackAction = logger.trackAction.bind(logger)
export const trackPerformance = logger.trackPerformance.bind(logger)
