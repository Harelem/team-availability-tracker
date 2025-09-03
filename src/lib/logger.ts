/**
 * Centralized Logger Utility
 * Controls console output based on environment and log levels
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

class Logger {
  private isDevelopment: boolean;
  private logLevel: LogLevel;
  private enabledModules: Set<string>;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.getLogLevelFromEnv();
    this.enabledModules = this.getEnabledModulesFromEnv();
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.NEXT_PUBLIC_LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      case 'VERBOSE': return LogLevel.VERBOSE;
      default: return this.isDevelopment ? LogLevel.INFO : LogLevel.ERROR;
    }
  }

  private getEnabledModulesFromEnv(): Set<string> {
    const modules = process.env.NEXT_PUBLIC_LOG_MODULES?.split(',') || [];
    return new Set(modules.map(m => m.trim().toLowerCase()));
  }

  private shouldLog(level: LogLevel, module?: string): boolean {
    // Always log errors
    if (level === LogLevel.ERROR) return true;
    
    // Check if level is enabled
    if (level > this.logLevel) return false;
    
    // If specific modules are enabled, check if this module is included
    if (module && this.enabledModules.size > 0) {
      return this.enabledModules.has(module.toLowerCase());
    }
    
    return true;
  }

  private formatMessage(level: LogLevel, module: string | undefined, message: string): string {
    const prefix = module ? `[${module}]` : '';
    return `${prefix} ${message}`.trim();
  }

  error(message: string, ...args: any[]): void;
  error(module: string, message: string, ...args: any[]): void;
  error(...args: any[]): void {
    const [first, second, ...rest] = args;
    const hasModule = typeof second === 'string';
    const module = hasModule ? first : undefined;
    const message = hasModule ? second : first;
    const logArgs = hasModule ? rest : [second, ...rest].filter(arg => arg !== undefined);
    
    if (this.shouldLog(LogLevel.ERROR, module)) {
      console.error(this.formatMessage(LogLevel.ERROR, module, message), ...logArgs);
    }
  }

  warn(message: string, ...args: any[]): void;
  warn(module: string, message: string, ...args: any[]): void;
  warn(...args: any[]): void {
    const [first, second, ...rest] = args;
    const hasModule = typeof second === 'string';
    const module = hasModule ? first : undefined;
    const message = hasModule ? second : first;
    const logArgs = hasModule ? rest : [second, ...rest].filter(arg => arg !== undefined);
    
    if (this.shouldLog(LogLevel.WARN, module)) {
      console.warn(this.formatMessage(LogLevel.WARN, module, message), ...logArgs);
    }
  }

  info(message: string, ...args: any[]): void;
  info(module: string, message: string, ...args: any[]): void;
  info(...args: any[]): void {
    const [first, second, ...rest] = args;
    const hasModule = typeof second === 'string';
    const module = hasModule ? first : undefined;
    const message = hasModule ? second : first;
    const logArgs = hasModule ? rest : [second, ...rest].filter(arg => arg !== undefined);
    
    if (this.shouldLog(LogLevel.INFO, module)) {
      console.log(this.formatMessage(LogLevel.INFO, module, message), ...logArgs);
    }
  }

  debug(message: string, ...args: any[]): void;
  debug(module: string, message: string, ...args: any[]): void;
  debug(...args: any[]): void {
    const [first, second, ...rest] = args;
    const hasModule = typeof second === 'string';
    const module = hasModule ? first : undefined;
    const message = hasModule ? second : first;
    const logArgs = hasModule ? rest : [second, ...rest].filter(arg => arg !== undefined);
    
    if (this.shouldLog(LogLevel.DEBUG, module)) {
      console.log(this.formatMessage(LogLevel.DEBUG, module, message), ...logArgs);
    }
  }

  verbose(message: string, ...args: any[]): void;
  verbose(module: string, message: string, ...args: any[]): void;
  verbose(...args: any[]): void {
    const [first, second, ...rest] = args;
    const hasModule = typeof second === 'string';
    const module = hasModule ? first : undefined;
    const message = hasModule ? second : first;
    const logArgs = hasModule ? rest : [second, ...rest].filter(arg => arg !== undefined);
    
    if (this.shouldLog(LogLevel.VERBOSE, module)) {
      console.log(this.formatMessage(LogLevel.VERBOSE, module, message), ...logArgs);
    }
  }

  // Group related logs
  group(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }

  // Performance logging
  time(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label);
    }
  }

  // Table logging for structured data
  table(data: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.table(data);
    }
  }
}

// Create singleton instance
export const logger = new Logger();

// Export convenience functions that match console API
export const log = logger.info.bind(logger);
export const error = logger.error.bind(logger);
export const warn = logger.warn.bind(logger);
export const debug = logger.debug.bind(logger);
export const verbose = logger.verbose.bind(logger);