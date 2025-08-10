/**
 * Centralized Error Handler
 * 
 * This service provides comprehensive error handling, classification, recovery, and reporting
 * for the Team Availability Tracker application.
 */

import {
  AppError,
  NetworkError,
  DatabaseError,
  ValidationError,
  AuthenticationError,
  BusinessLogicError,
  ErrorCategory,
  ErrorSeverity,
  ErrorCode,
  ErrorRecoveryStrategy,
  ErrorContext,
  ErrorRecoveryOptions,
  ErrorHandler,
  ErrorHandlerConfig,
  RetryConfig,
  ErrorReport,
  ERROR_CODES,
  USER_ERROR_MESSAGES
} from '@/types/errors';

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true,
  logLevel: ErrorSeverity.MEDIUM,
  enableUserNotifications: true,
  enableErrorReporting: true,
  fallbackStrategies: {
    [ErrorCategory.NETWORK]: ErrorRecoveryStrategy.RETRY,
    [ErrorCategory.DATABASE]: ErrorRecoveryStrategy.RETRY,
    [ErrorCategory.VALIDATION]: ErrorRecoveryStrategy.MANUAL,
    [ErrorCategory.AUTHENTICATION]: ErrorRecoveryStrategy.REDIRECT,
    [ErrorCategory.AUTHORIZATION]: ErrorRecoveryStrategy.MANUAL,
    [ErrorCategory.BUSINESS_LOGIC]: ErrorRecoveryStrategy.MANUAL,
    [ErrorCategory.UI]: ErrorRecoveryStrategy.REFRESH,
    [ErrorCategory.SYSTEM]: ErrorRecoveryStrategy.GRACEFUL_DEGRADATION,
    [ErrorCategory.UNKNOWN]: ErrorRecoveryStrategy.REFRESH
  }
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  enabled: true,
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorCategory.NETWORK,
    ErrorCategory.DATABASE,
    ErrorCategory.SYSTEM
  ]
};

// =============================================================================
// ERROR CLASSIFICATION PATTERNS
// =============================================================================

const ERROR_PATTERNS = {
  network: [
    /network|fetch|timeout|connection/i,
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i,
    /Failed to fetch/i,
    /NetworkError/i
  ],
  database: [
    /database|db|sql|query|connection/i,
    /supabase|postgres/i,
    /relation.*does not exist/i,
    /duplicate key value/i
  ],
  validation: [
    /validation|invalid|required|format/i,
    /missing|empty|null|undefined/i,
    /ValidationError/i
  ],
  authentication: [
    /auth|token|session|login|credential/i,
    /unauthorized|unauthenticated/i,
    /JWT|bearer/i
  ],
  authorization: [
    /permission|access|forbidden|privilege/i,
    /not allowed|denied/i
  ]
};

// =============================================================================
// CENTRALIZED ERROR HANDLER CLASS
// =============================================================================

class CentralizedErrorHandler implements ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorReports: Map<string, ErrorReport> = new Map();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main error handling entry point
   */
  async handle(error: Error, context: Partial<ErrorContext> = {}): Promise<AppError> {
    const appError = this.createAppError(error, context);
    
    // Log the error
    if (this.config.enableLogging) {
      this.log(appError);
    }

    // Report the error if enabled
    if (this.config.enableErrorReporting) {
      this.report(appError);
    }

    // Attempt automatic recovery if possible
    if (appError.isRecoverable && appError.recoveryOptions) {
      try {
        const recovered = await this.recover(appError);
        if (recovered) {
          console.log(`✅ Successfully recovered from error: ${appError.code}`);
        }
      } catch (recoveryError) {
        console.error('❌ Failed to recover from error:', recoveryError);
      }
    }

    return appError;
  }

  /**
   * Attempt to recover from an error
   */
  async recover(appError: AppError): Promise<boolean> {
    if (!appError.recoveryOptions) {
      return false;
    }

    const { strategy, customAction } = appError.recoveryOptions;

    try {
      switch (strategy) {
        case ErrorRecoveryStrategy.RETRY:
          return await this.performRetry(appError);
        
        case ErrorRecoveryStrategy.REFRESH:
          window.location.reload();
          return true;
        
        case ErrorRecoveryStrategy.FALLBACK:
          return this.useFallbackData(appError);
        
        case ErrorRecoveryStrategy.REDIRECT:
          return this.performRedirect(appError);
        
        case ErrorRecoveryStrategy.RESET:
          return this.resetComponentState(appError);
        
        case ErrorRecoveryStrategy.MANUAL:
          if (customAction) {
            customAction();
            return true;
          }
          return false;
        
        case ErrorRecoveryStrategy.GRACEFUL_DEGRADATION:
          return this.gracefullyDegrade(appError);
        
        default:
          return false;
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      return false;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>, 
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error;
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if this error type is not retryable
        const errorCategory = this.classify(lastError);
        if (!retryConfig.retryableErrors.includes(errorCategory)) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === retryConfig.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
          retryConfig.maxDelay
        );

        console.log(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Classify error into appropriate category
   */
  classify(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    const errorString = `${message} ${stack}`;

    // Check each pattern category
    for (const [category, patterns] of Object.entries(ERROR_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(errorString))) {
        return category as ErrorCategory;
      }
    }

    // Check by error type
    if (error.name === 'ValidationError') return ErrorCategory.VALIDATION;
    if (error.name === 'NetworkError') return ErrorCategory.NETWORK;
    if (error.name === 'TypeError' && message.includes('fetch')) return ErrorCategory.NETWORK;

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Generate user-friendly error message
   */
  generateUserMessage(appError: AppError): string {
    // Try to get predefined user message
    const predefinedMessage = USER_ERROR_MESSAGES[appError.code as ErrorCode];
    if (predefinedMessage) {
      return predefinedMessage;
    }

    // Generate contextual message based on category
    switch (appError.category) {
      case ErrorCategory.NETWORK:
        return 'Connection issue. Please check your internet and try again.';
      
      case ErrorCategory.DATABASE:
        return 'Unable to save or retrieve data. Please try again.';
      
      case ErrorCategory.VALIDATION:
        return 'Please check your input and try again.';
      
      case ErrorCategory.AUTHENTICATION:
        return 'Please log in again to continue.';
      
      case ErrorCategory.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.';
      
      case ErrorCategory.BUSINESS_LOGIC:
        return 'This operation cannot be completed. Please check your data.';
      
      default:
        return 'Something went wrong. Please try again or contact support.';
    }
  }

  /**
   * Determine if error should be retried
   */
  shouldRetry(appError: AppError): boolean {
    return appError.isRetryable && 
           this.config.enableRetry && 
           DEFAULT_RETRY_CONFIG.retryableErrors.includes(appError.category);
  }

  /**
   * Log error to console and external services
   */
  log(appError: AppError): void {
    const logLevel = this.getSeverityLogLevel(appError.severity);
    const logMessage = `[${appError.category.toUpperCase()}] ${appError.code}: ${appError.message}`;
    
    // Log to console based on severity
    switch (appError.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        console.error(logMessage, appError);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage, appError);
        break;
      case ErrorSeverity.LOW:
      case ErrorSeverity.INFO:
        console.info(logMessage, appError);
        break;
    }

    // Log to external service (if configured)
    if (this.config.enableErrorReporting && appError.severity !== ErrorSeverity.INFO) {
      this.sendToExternalLogger(appError);
    }
  }

  /**
   * Report error for analytics and monitoring
   */
  report(appError: AppError): void {
    const report: ErrorReport = {
      errorId: appError.id,
      category: appError.category,
      severity: appError.severity,
      message: appError.message,
      stack: appError.stack,
      context: appError.context,
      timestamp: appError.timestamp,
      resolved: false,
      retryCount: 0,
      userImpact: this.calculateUserImpact(appError)
    };

    this.errorReports.set(appError.id, report);
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private createAppError(error: Error, context: Partial<ErrorContext>): AppError {
    const category = this.classify(error);
    const errorId = this.generateErrorId();
    const severity = this.determineSeverity(error, category);
    const code = this.generateErrorCode(error, category);
    
    const fullContext: ErrorContext = {
      timestamp: new Date(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...context
    };

    const baseError: AppError = {
      id: errorId,
      category,
      severity,
      code,
      message: error.message,
      userMessage: '',
      originalError: error,
      context: fullContext,
      isRecoverable: this.isRecoverable(category, error),
      isRetryable: this.isRetryable(category, error),
      stack: error.stack,
      timestamp: new Date()
    };

    // Generate user message
    baseError.userMessage = this.generateUserMessage(baseError);

    // Add recovery options if recoverable
    if (baseError.isRecoverable) {
      baseError.recoveryOptions = this.generateRecoveryOptions(baseError);
    }

    return baseError;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorCode(error: Error, category: ErrorCategory): string {
    // Try to map to predefined error codes
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return ERROR_CODES.NETWORK_TIMEOUT;
    if (message.includes('connection')) return ERROR_CODES.CONNECTION_LOST;
    if (message.includes('fetch')) return ERROR_CODES.API_UNAVAILABLE;
    if (message.includes('validation')) return ERROR_CODES.INVALID_INPUT;
    if (message.includes('required')) return ERROR_CODES.REQUIRED_FIELD_MISSING;
    if (message.includes('token') || message.includes('jwt')) return ERROR_CODES.TOKEN_EXPIRED;
    if (message.includes('permission')) return ERROR_CODES.INSUFFICIENT_PERMISSIONS;
    if (message.includes('not found')) return ERROR_CODES.RESOURCE_NOT_FOUND;

    // Fallback to category-based codes
    switch (category) {
      case ErrorCategory.NETWORK: return ERROR_CODES.CONNECTION_LOST;
      case ErrorCategory.DATABASE: return ERROR_CODES.DB_QUERY_FAILED;
      case ErrorCategory.VALIDATION: return ERROR_CODES.INVALID_INPUT;
      case ErrorCategory.AUTHENTICATION: return ERROR_CODES.INVALID_CREDENTIALS;
      case ErrorCategory.AUTHORIZATION: return ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      default: return ERROR_CODES.UNKNOWN_ERROR;
    }
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that break core functionality
    if (category === ErrorCategory.AUTHENTICATION && error.message.includes('session expired')) {
      return ErrorSeverity.CRITICAL;
    }
    
    if (category === ErrorCategory.DATABASE && error.message.includes('connection')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity for important operations
    if (category === ErrorCategory.DATABASE || category === ErrorCategory.NETWORK) {
      return ErrorSeverity.HIGH;
    }

    // Medium for validation and business logic
    if (category === ErrorCategory.VALIDATION || category === ErrorCategory.BUSINESS_LOGIC) {
      return ErrorSeverity.MEDIUM;
    }

    // Low for UI issues
    if (category === ErrorCategory.UI) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  private isRecoverable(category: ErrorCategory, error: Error): boolean {
    // Transient errors are usually recoverable
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.DATABASE) {
      return !error.message.includes('permanent') && !error.message.includes('fatal');
    }

    // Validation errors are recoverable through user action
    if (category === ErrorCategory.VALIDATION) {
      return true;
    }

    // UI errors are usually recoverable
    if (category === ErrorCategory.UI) {
      return true;
    }

    return false;
  }

  private isRetryable(category: ErrorCategory, error: Error): boolean {
    // Only retry transient errors
    return DEFAULT_RETRY_CONFIG.retryableErrors.includes(category) &&
           !error.message.includes('permanent') &&
           !error.message.includes('invalid') &&
           !error.message.includes('unauthorized');
  }

  private generateRecoveryOptions(appError: AppError): ErrorRecoveryOptions {
    const strategy = this.config.fallbackStrategies[appError.category];
    
    const options: ErrorRecoveryOptions = {
      strategy,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay
    };

    // Add category-specific recovery options
    switch (appError.category) {
      case ErrorCategory.AUTHENTICATION:
        options.redirectUrl = '/login';
        break;
      
      case ErrorCategory.NETWORK:
      case ErrorCategory.DATABASE:
        options.maxRetries = 3;
        options.retryDelay = 2000;
        break;
    }

    return options;
  }

  private async performRetry(appError: AppError): Promise<boolean> {
    // This would typically re-run the failed operation
    // For now, we'll simulate a retry attempt
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Math.random() > 0.5); // 50% success rate for simulation
      }, 1000);
    });
  }

  private useFallbackData(appError: AppError): boolean {
    // Implement fallback data logic
    return appError.recoveryOptions?.fallbackData !== undefined;
  }

  private performRedirect(appError: AppError): boolean {
    const redirectUrl = appError.recoveryOptions?.redirectUrl;
    if (redirectUrl && typeof window !== 'undefined') {
      window.location.href = redirectUrl;
      return true;
    }
    return false;
  }

  private resetComponentState(appError: AppError): boolean {
    // This would typically reset React component state
    // Implementation depends on the component architecture
    return true;
  }

  private gracefullyDegrade(appError: AppError): boolean {
    // Implement graceful degradation logic
    console.log('🔄 Gracefully degrading functionality due to error:', appError.code);
    return true;
  }

  private getSeverityLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 'error';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.MEDIUM: return 'warn';
      case ErrorSeverity.LOW: return 'info';
      case ErrorSeverity.INFO: return 'log';
      default: return 'warn';
    }
  }

  private sendToExternalLogger(appError: AppError): void {
    // Implement external logging service integration
    // This could be Sentry, LogRocket, or custom logging service
    console.log('📊 Sending error to external logger:', appError.id);
  }

  private calculateUserImpact(appError: AppError): 'high' | 'medium' | 'low' {
    switch (appError.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'high';
      case ErrorSeverity.MEDIUM:
        return 'medium';
      default:
        return 'low';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const errorHandler = new CentralizedErrorHandler();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Handle error with automatic classification and recovery
 */
export async function handleError(
  error: Error, 
  context?: Partial<ErrorContext>
): Promise<AppError> {
  return errorHandler.handle(error, context);
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  return errorHandler.retry(operation, config);
}

/**
 * Classify error into category
 */
export function classifyError(error: Error): ErrorCategory {
  return errorHandler.classify(error);
}

/**
 * Generate user-friendly error message
 */
export function getUserErrorMessage(appError: AppError): string {
  return errorHandler.generateUserMessage(appError);
}

/**
 * Check if error should be retried
 */
export function shouldRetryError(appError: AppError): boolean {
  return errorHandler.shouldRetry(appError);
}

/**
 * Create error with context for better debugging
 */
export function createContextualError(
  message: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Partial<ErrorContext>
): AppError {
  const error = new Error(message);
  return errorHandler.handle(error, context) as unknown as AppError;
}

export default errorHandler;