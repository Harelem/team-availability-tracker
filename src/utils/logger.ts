/**
 * Centralized logging utility with level control
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableEmoji: boolean
}

class Logger {
  private config: LoggerConfig = {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    enableConsole: true,
    enableEmoji: true
  }

  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }

  setLevel(level: LogLevel) {
    this.config.level = level
  }

  setEmoji(enabled: boolean) {
    this.config.enableEmoji = enabled
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.config.level]
  }

  private getEmoji(level: LogLevel, category?: string): string {
    if (!this.config.enableEmoji) return ''
    
    if (category) {
      const categoryEmojis: Record<string, string> = {
        database: '📊',
        auth: '🔐',
        mobile: '📱',
        performance: '⚡',
        navigation: '🧭',
        subscription: '🔔',
        cache: '💾',
        api: '🌐',
        validation: '✅',
        error: '❌',
        warning: '⚠️',
        success: '✅'
      }
      return categoryEmojis[category] || '🔹'
    }

    const levelEmojis: Record<LogLevel, string> = {
      debug: '🔍',
      info: '📝',
      warn: '⚠️',
      error: '❌'
    }
    
    return levelEmojis[level]
  }

  private formatMessage(level: LogLevel, message: string, category?: string): string {
    const emoji = this.getEmoji(level, category)
    const prefix = emoji ? `${emoji} ` : ''
    return `${prefix}${message}`
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug') && this.config.enableConsole) {
      console.debug(this.formatMessage('debug', message), ...args)
    }
  }

  info(message: string, category?: string, ...args: any[]) {
    if (this.shouldLog('info') && this.config.enableConsole) {
      console.log(this.formatMessage('info', message, category), ...args)
    }
  }

  warn(message: string, category?: string, ...args: any[]) {
    if (this.shouldLog('warn') && this.config.enableConsole) {
      console.warn(this.formatMessage('warn', message, category), ...args)
    }
  }

  error(message: string, category?: string, ...args: any[]) {
    if (this.shouldLog('error') && this.config.enableConsole) {
      console.error(this.formatMessage('error', message, category), ...args)
    }
  }

  // Specialized logging methods
  database(message: string, ...args: any[]) {
    this.info(message, 'database', ...args)
  }

  mobile(message: string, ...args: any[]) {
    this.info(message, 'mobile', ...args)
  }

  performance(message: string, ...args: any[]) {
    this.info(message, 'performance', ...args)
  }

  success(message: string, ...args: any[]) {
    this.info(message, 'success', ...args)
  }
}

// Create singleton instance
const logger = new Logger()

export default logger