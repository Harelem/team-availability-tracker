/**
 * Debug Logger Utility
 * 
 * Provides controlled logging based on environment and debug flags
 * to reduce console noise in production while maintaining debugging capability.
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1, 
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

class DebugLogger {
  private currentLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    if (process.env.NODE_ENV === 'production') {
      this.currentLevel = LogLevel.ERROR;
    } else if (process.env.NEXT_PUBLIC_DEBUG_VERBOSE === 'true') {
      this.currentLevel = LogLevel.VERBOSE;
    } else if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
      this.currentLevel = LogLevel.DEBUG;
    } else {
      this.currentLevel = LogLevel.WARN;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLevel;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`🚨 ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`ℹ️ ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`🔍 ${message}`, ...args);
    }
  }

  verbose(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      console.log(`📝 ${message}`, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`✅ ${message}`, ...args);
    }
  }

  // Special method for operation success - only shows in debug mode
  operation(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`✅ ${message}`, ...args);
    }
  }

  // Performance logging - only in verbose mode
  perf(message: string, duration?: number, ...args: any[]): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      const perfMessage = duration !== undefined 
        ? `⚡ ${message} (${duration}ms)`
        : `⚡ ${message}`;
      console.log(perfMessage, ...args);
    }
  }

  // Data flow logging - for understanding application state
  data(context: string, data: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`📊 [${context}]`, data);
    }
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger();

// Convenience exports for cleaner imports
export const { error, warn, info, debug, verbose, success, operation, perf, data } = debugLogger;