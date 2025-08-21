/**
 * Debug Logger Utility - Functional Implementation
 * 
 * Provides controlled logging based on environment and debug flags
 * to reduce console noise in production while maintaining debugging capability.
 * 
 * FIXED: Eliminates "this is undefined" errors by using functional approach
 * instead of class-based destructuring which loses context.
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1, 
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

// Determine current log level based on environment
function getCurrentLogLevel(): LogLevel {
  if (process.env.NODE_ENV === 'production') {
    return LogLevel.ERROR;
  } else if (process.env.NEXT_PUBLIC_DEBUG_VERBOSE === 'true') {
    return LogLevel.VERBOSE;
  } else if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
    return LogLevel.DEBUG;
  } else {
    return LogLevel.WARN;
  }
}

// Cache the current level to avoid repeated environment checks
const currentLevel: LogLevel = getCurrentLogLevel();

// Helper function to determine if we should log at a given level
function shouldLog(level: LogLevel): boolean {
  return level <= currentLevel;
}

// Functional logging methods - no 'this' context issues
export function error(message: string, ...args: any[]): void {
  if (shouldLog(LogLevel.ERROR)) {
    console.error(`🚨 ${message}`, ...args);
  }
}

export function warn(message: string, ...args: any[]): void {
  if (shouldLog(LogLevel.WARN)) {
    console.warn(`⚠️ ${message}`, ...args);
  }
}

export function info(message: string, ...args: any[]): void {
  if (shouldLog(LogLevel.INFO)) {
    console.info(`ℹ️ ${message}`, ...args);
  }
}

export function debug(message: string, ...args: any[]): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.log(`🔍 ${message}`, ...args);
  }
}

export function verbose(message: string, ...args: any[]): void {
  if (shouldLog(LogLevel.VERBOSE)) {
    console.log(`📝 ${message}`, ...args);
  }
}

export function success(message: string, ...args: any[]): void {
  if (shouldLog(LogLevel.INFO)) {
    console.log(`✅ ${message}`, ...args);
  }
}

// Special method for operation success - only shows in debug mode
export function operation(message: string, ...args: any[]): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.log(`✅ ${message}`, ...args);
  }
}

// Performance logging - only in verbose mode
export function perf(message: string, duration?: number, ...args: any[]): void {
  if (shouldLog(LogLevel.VERBOSE)) {
    const perfMessage = duration !== undefined 
      ? `⚡ ${message} (${duration}ms)`
      : `⚡ ${message}`;
    console.log(perfMessage, ...args);
  }
}

// Data flow logging - for understanding application state
export function data(context: string, data: any): void {
  if (shouldLog(LogLevel.DEBUG)) {
    console.log(`📊 [${context}]`, data);
  }
}

// Backward compatibility - provide class-like interface as default export
class DebugLogger {
  error = error;
  warn = warn;
  info = info;
  debug = debug;
  verbose = verbose;
  success = success;
  operation = operation;
  perf = perf;
  data = data;

  // Expose the shouldLog functionality for any advanced usage
  shouldLog = shouldLog;
  currentLevel = currentLevel;
}

// Export singleton instance for backward compatibility
export const debugLogger = new DebugLogger();

// Default export for any remaining class-style imports
export default debugLogger;