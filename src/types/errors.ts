/**
 * Centralized Error Handling Types
 * 
 * This file defines the comprehensive error classification system for the Team Availability Tracker.
 * It provides standardized error types, severity levels, and recovery strategies.
 */

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  UI = 'ui',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  CRITICAL = 'critical',     // App-breaking errors requiring immediate attention
  HIGH = 'high',            // Major functionality impacted, but app remains usable
  MEDIUM = 'medium',        // Minor functionality issues
  LOW = 'low',             // Warnings or minor issues
  INFO = 'info'            // Informational messages
}

export enum ErrorRecoveryStrategy {
  RETRY = 'retry',                    // Automatic retry with backoff
  REFRESH = 'refresh',                // Refresh current view/data
  FALLBACK = 'fallback',             // Use fallback/cached data
  REDIRECT = 'redirect',             // Navigate to different page
  RESET = 'reset',                   // Reset component/form state
  MANUAL = 'manual',                 // Requires manual user intervention
  IGNORE = 'ignore',                 // Log but don't show to user
  GRACEFUL_DEGRADATION = 'graceful'  // Reduce functionality but continue
}

// =============================================================================
// BASE ERROR INTERFACES
// =============================================================================

export interface ErrorContext {
  userId?: string;
  teamId?: number;
  component?: string;
  action?: string;
  timestamp: Date;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorRecoveryOptions {
  strategy: ErrorRecoveryStrategy;
  maxRetries?: number;
  retryDelay?: number;
  fallbackData?: any;
  redirectUrl?: string;
  customAction?: () => void;
}

export interface AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  originalError?: Error;
  context: ErrorContext;
  recoveryOptions?: ErrorRecoveryOptions;
  isRecoverable: boolean;
  isRetryable: boolean;
  stack?: string;
  timestamp: Date;
}

// =============================================================================
// SPECIFIC ERROR TYPES
// =============================================================================

export interface NetworkError extends AppError {
  category: ErrorCategory.NETWORK;
  statusCode?: number;
  endpoint?: string;
  method?: string;
  timeout?: boolean;
}

export interface DatabaseError extends AppError {
  category: ErrorCategory.DATABASE;
  operation?: 'read' | 'write' | 'delete' | 'update';
  table?: string;
  queryId?: string;
  connectionLost?: boolean;
}

export interface ValidationError extends AppError {
  category: ErrorCategory.VALIDATION;
  field?: string;
  value?: any;
  constraints?: string[];
  formId?: string;
}

export interface AuthenticationError extends AppError {
  category: ErrorCategory.AUTHENTICATION;
  authProvider?: string;
  tokenExpired?: boolean;
  sessionExpired?: boolean;
}

export interface BusinessLogicError extends AppError {
  category: ErrorCategory.BUSINESS_LOGIC;
  rule?: string;
  conflictingData?: any;
}

// =============================================================================
// ERROR HANDLING CONFIGURATION
// =============================================================================

export interface ErrorHandlerConfig {
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  enableLogging: boolean;
  logLevel: ErrorSeverity;
  enableUserNotifications: boolean;
  enableErrorReporting: boolean;
  reportingEndpoint?: string;
  fallbackStrategies: Record<ErrorCategory, ErrorRecoveryStrategy>;
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCategory[];
}

// =============================================================================
// ERROR HANDLER INTERFACES
// =============================================================================

export interface ErrorHandler {
  handle(error: Error, context?: Partial<ErrorContext>): Promise<AppError>;
  recover(appError: AppError): Promise<boolean>;
  retry<T>(operation: () => Promise<T>, config?: RetryConfig): Promise<T>;
  classify(error: Error): ErrorCategory;
  generateUserMessage(appError: AppError): string;
  shouldRetry(appError: AppError): boolean;
  log(appError: AppError): void;
  report(appError: AppError): void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
  errorId?: string;
  retryCount: number;
  isRecovering: boolean;
  fallbackData?: any;
}

export interface ErrorBoundaryActions {
  retry: () => void;
  reset: () => void;
  recover: () => void;
  dismiss: () => void;
  report: () => void;
}

// =============================================================================
// ERROR REPORTING
// =============================================================================

export interface ErrorReport {
  errorId: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  retryCount: number;
  userImpact: 'high' | 'medium' | 'low';
}

export interface ErrorAnalytics {
  errorCount: number;
  errorRate: number;
  topErrors: Array<{
    code: string;
    count: number;
    percentage: number;
  }>;
  categoryCounts: Record<ErrorCategory, number>;
  severityCounts: Record<ErrorSeverity, number>;
  recoverySuccessRate: number;
  averageRetryCount: number;
}

// =============================================================================
// PREDEFINED ERROR CODES
// =============================================================================

export const ERROR_CODES = {
  // Network Errors
  NETWORK_TIMEOUT: 'NET_001',
  CONNECTION_LOST: 'NET_002',
  API_UNAVAILABLE: 'NET_003',
  RATE_LIMITED: 'NET_004',
  
  // Database Errors
  DB_CONNECTION_FAILED: 'DB_001',
  DB_QUERY_FAILED: 'DB_002',
  DB_TIMEOUT: 'DB_003',
  DB_CONSTRAINT_VIOLATION: 'DB_004',
  
  // Validation Errors
  INVALID_INPUT: 'VAL_001',
  REQUIRED_FIELD_MISSING: 'VAL_002',
  FORMAT_INVALID: 'VAL_003',
  
  // Authentication Errors
  TOKEN_EXPIRED: 'AUTH_001',
  INVALID_CREDENTIALS: 'AUTH_002',
  SESSION_EXPIRED: 'AUTH_003',
  
  // Business Logic Errors
  INSUFFICIENT_PERMISSIONS: 'BIZ_001',
  RESOURCE_NOT_FOUND: 'BIZ_002',
  OPERATION_NOT_ALLOWED: 'BIZ_003',
  DATA_CONFLICT: 'BIZ_004',
  
  // System Errors
  UNKNOWN_ERROR: 'SYS_001',
  CONFIG_ERROR: 'SYS_002',
  MEMORY_ERROR: 'SYS_003'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// =============================================================================
// USER-FACING ERROR MESSAGES
// =============================================================================

export const USER_ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_TIMEOUT]: 'The request is taking longer than expected. Please try again.',
  [ERROR_CODES.CONNECTION_LOST]: 'Connection lost. Please check your internet connection and try again.',
  [ERROR_CODES.API_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again in a few minutes.',
  [ERROR_CODES.RATE_LIMITED]: 'Too many requests. Please wait a moment before trying again.',
  
  [ERROR_CODES.DB_CONNECTION_FAILED]: 'Unable to connect to the database. Please try again later.',
  [ERROR_CODES.DB_QUERY_FAILED]: 'Failed to retrieve data. Please refresh and try again.',
  [ERROR_CODES.DB_TIMEOUT]: 'The operation is taking too long. Please try again.',
  
  [ERROR_CODES.INVALID_INPUT]: 'Please check your input and try again.',
  [ERROR_CODES.REQUIRED_FIELD_MISSING]: 'Please fill in all required fields.',
  [ERROR_CODES.FORMAT_INVALID]: 'The format is invalid. Please check and try again.',
  
  [ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid credentials. Please check and try again.',
  [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to perform this action.',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.OPERATION_NOT_ALLOWED]: 'This operation is not allowed at this time.',
  [ERROR_CODES.DATA_CONFLICT]: 'The data has been modified by another user. Please refresh and try again.',
  
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again or contact support.',
  [ERROR_CODES.CONFIG_ERROR]: 'Configuration error. Please contact support.',
  [ERROR_CODES.MEMORY_ERROR]: 'System resources are low. Please try again later.'
} as const;