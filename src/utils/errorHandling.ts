/**
 * Error handling utilities for comprehensive error management
 */

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: Date;
}

export class ValidationError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string = 'VALIDATION_ERROR', details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.details = details;
  }
}

export class DatabaseError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string = 'DATABASE_ERROR', details?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
  }
}

export class PermissionError extends Error {
  code: string;
  
  constructor(message: string = 'Insufficient permissions', code: string = 'PERMISSION_DENIED') {
    super(message);
    this.name = 'PermissionError';
    this.code = code;
  }
}

/**
 * Safely execute async operations with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  errorHandler?: (error: Error) => void
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error instanceof Error ? error : new Error(String(error)));
    } else {
      console.error('Safe async operation failed:', error);
    }
    return fallback;
  }
}

/**
 * Validate admin permissions for sprint operations
 */
export function validateAdminPermission(userName?: string): void {
  if (userName !== 'Harel Mazan') {
    throw new PermissionError('Only Harel Mazan can modify sprint settings');
  }
}

/**
 * Validate date ranges for sprint operations
 */
export function validateDateRange(startDate: string, endDate?: string): void {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  
  if (isNaN(start.getTime())) {
    throw new ValidationError('Invalid start date format', 'INVALID_START_DATE');
  }
  
  if (end && isNaN(end.getTime())) {
    throw new ValidationError('Invalid end date format', 'INVALID_END_DATE');
  }
  
  if (end && start >= end) {
    throw new ValidationError('Start date must be before end date', 'INVALID_DATE_RANGE');
  }
  
  // Check for reasonable date bounds (not more than 10 years ago or in the future)
  const now = new Date();
  const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
  const tenYearsFromNow = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
  
  if (start < tenYearsAgo || start > tenYearsFromNow) {
    throw new ValidationError('Start date must be within reasonable bounds (±10 years)', 'DATE_OUT_OF_BOUNDS');
  }
  
  if (end && (end < tenYearsAgo || end > tenYearsFromNow)) {
    throw new ValidationError('End date must be within reasonable bounds (±10 years)', 'DATE_OUT_OF_BOUNDS');
  }
}

/**
 * Validate sprint length
 */
export function validateSprintLength(lengthWeeks: number): void {
  if (!Number.isInteger(lengthWeeks) || lengthWeeks < 1 || lengthWeeks > 4) {
    throw new ValidationError('Sprint length must be between 1 and 4 weeks', 'INVALID_SPRINT_LENGTH');
  }
}

/**
 * Validate team member data
 */
export function validateTeamMember(member: unknown): void {
  if (!member || typeof member !== 'object') {
    throw new ValidationError('Invalid team member data', 'INVALID_MEMBER_DATA');
  }
  
  const m = member as Record<string, unknown>;
  
  if (!m.id || typeof m.id !== 'number') {
    throw new ValidationError('Team member must have a valid ID', 'INVALID_MEMBER_ID');
  }
  
  if (!m.name || typeof m.name !== 'string' || m.name.trim().length === 0) {
    throw new ValidationError('Team member must have a valid name', 'INVALID_MEMBER_NAME');
  }
  
  if (!m.team_id || typeof m.team_id !== 'number') {
    throw new ValidationError('Team member must belong to a valid team', 'INVALID_TEAM_ID');
  }
}

/**
 * Validate export date range
 */
export function validateExportDateRange(startDate: string, endDate: string): void {
  validateDateRange(startDate, endDate);
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 365) {
    throw new ValidationError('Export date range cannot exceed 1 year', 'EXPORT_RANGE_TOO_LARGE');
  }
  
  if (diffDays < 1) {
    throw new ValidationError('Export date range must be at least 1 day', 'EXPORT_RANGE_TOO_SMALL');
  }
}

/**
 * Retry mechanism for database operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw new DatabaseError(
          `Operation failed after ${maxRetries} attempts: ${lastError.message}`,
          'MAX_RETRIES_EXCEEDED',
          { attempts: maxRetries, lastError }
        );
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: Error): string {
  if (error instanceof ValidationError) {
    return error.message;
  }
  
  if (error instanceof PermissionError) {
    return error.message;
  }
  
  if (error instanceof DatabaseError) {
    return 'A database error occurred. Please try again later.';
  }
  
  // Generic error message for unknown errors
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log error with context
 */
export function logError(error: Error, context: string, additionalData?: unknown): void {
  const errorInfo = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context,
    timestamp: new Date().toISOString(),
    additionalData
  };
  
  console.error('Application Error:', errorInfo);
  
  // In production, you might want to send this to an error monitoring service
  // Example: Sentry.captureException(error, { contexts: { errorInfo } });
}