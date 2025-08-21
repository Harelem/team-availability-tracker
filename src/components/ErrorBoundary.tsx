'use client';

/**
 * Error Boundary Component
 * 
 * Provides comprehensive error boundary functionality with graceful fallbacks,
 * error recovery, and user-friendly error displays.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, X } from 'lucide-react';
import { 
  AppError, 
  ErrorBoundaryState, 
  ErrorBoundaryActions,
  ErrorCategory,
  ErrorSeverity,
  ErrorContext
} from '@/types/errors';
import { errorHandler, handleError } from '@/utils/errorHandler';

// =============================================================================
// ERROR BOUNDARY PROPS
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AppError, actions: ErrorBoundaryActions) => ReactNode;
  level?: 'page' | 'section' | 'component';
  enableRecovery?: boolean;
  maxRetries?: number;
  onError?: (error: AppError) => void;
  context?: Partial<ErrorContext>;
  showErrorDetails?: boolean;
  className?: string;
}

// =============================================================================
// ERROR BOUNDARY CLASS COMPONENT
// =============================================================================

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      retryCount: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true
    };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      // Create context for error handling
      const context: Partial<ErrorContext> = {
        component: this.constructor.name,
        action: 'render',
        ...this.props.context,
        additionalData: {
          componentStack: errorInfo.componentStack,
          errorBoundary: errorInfo
        }
      };

      // Handle error through centralized handler
      const appError = await handleError(error, context);
      
      this.setState({
        error: appError,
        errorId: appError.id
      });

      // Call onError callback if provided
      if (this.props.onError) {
        this.props.onError(appError);
      }

      // Attempt automatic recovery for recoverable errors
      if (appError.isRecoverable && this.props.enableRecovery !== false) {
        await this.attemptRecovery(appError);
      }

    } catch (handlingError) {
      console.error('Error in error boundary error handling:', handlingError);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  // =============================================================================
  // ERROR RECOVERY METHODS
  // =============================================================================

  private async attemptRecovery(appError: AppError): Promise<void> {
    if (!appError.recoveryOptions) return;

    this.setState({ isRecovering: true });

    try {
      const recovered = await errorHandler.recover(appError);
      
      if (recovered) {
        this.handleRecoverySuccess();
      } else {
        console.log('❌ Automatic recovery failed for error:', appError.id);
      }
    } catch (recoveryError) {
      console.error('Error during recovery attempt:', recoveryError);
    } finally {
      this.setState({ isRecovering: false });
    }
  }

  private handleRecoverySuccess(): void {
    console.log('✅ Error recovery successful, resetting error boundary');
    this.setState({
      hasError: false,
      error: undefined,
      errorId: undefined,
      isRecovering: false,
      retryCount: 0
    });
  }

  // =============================================================================
  // USER ACTION HANDLERS
  // =============================================================================

  private handleRetry = async (): Promise<void> => {
    const { maxRetries = 3 } = this.props;
    const { retryCount, error } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('Max retry attempts reached');
      return;
    }

    this.setState({ 
      isRecovering: true, 
      retryCount: retryCount + 1 
    });

    // Delay before retry to prevent rapid successive failures
    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));

    try {
      if (error?.isRetryable) {
        const recovered = await errorHandler.recover(error);
        if (recovered) {
          this.handleRecoverySuccess();
          return;
        }
      }
      
      // Simple reset if recovery doesn't work
      this.handleReset();
    } catch (retryError) {
      console.error('Retry attempt failed:', retryError);
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorId: undefined,
      retryCount: 0,
      isRecovering: false
    });
  };

  private handleRecover = async (): Promise<void> => {
    const { error } = this.state;
    if (!error) return;

    this.setState({ isRecovering: true });
    
    try {
      await this.attemptRecovery(error);
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  private handleDismiss = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorId: undefined
    });
  };

  private handleReport = (): void => {
    const { error } = this.state;
    if (error) {
      errorHandler.report(error);
      // Could also open a support ticket or feedback form
      console.log('📧 Error reported:', error.id);
    }
  };

  private handleGoHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  // =============================================================================
  // ERROR BOUNDARY ACTIONS
  // =============================================================================

  private getActions = (): ErrorBoundaryActions => ({
    retry: this.handleRetry,
    reset: this.handleReset,
    recover: this.handleRecover,
    dismiss: this.handleDismiss,
    report: this.handleReport
  });

  // =============================================================================
  // RENDER METHODS
  // =============================================================================

  private renderErrorFallback(): ReactNode {
    const { fallback, level = 'component', showErrorDetails = false } = this.props;
    const { error, isRecovering, retryCount } = this.state;
    
    if (!error) return null;

    // Use custom fallback if provided
    if (fallback) {
      return fallback(error, this.getActions());
    }

    // Render appropriate fallback based on level and severity
    if (level === 'page' || error.severity === ErrorSeverity.CRITICAL) {
      return this.renderPageLevelError();
    }
    
    if (level === 'section' || error.severity === ErrorSeverity.HIGH) {
      return this.renderSectionLevelError();
    }

    return this.renderComponentLevelError();
  }

  private renderPageLevelError(): ReactNode {
    const { error, isRecovering, retryCount } = this.state;
    const { maxRetries = 3, showErrorDetails = false } = this.props;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>

          {/* Error Message */}
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-6">
            {error?.userMessage || "We're sorry, but something unexpected happened."}
          </p>

          {/* Error Details (if enabled) */}
          {showErrorDetails && error && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg text-left">
              <div className="text-xs text-gray-500 space-y-1">
                <div><strong>Error ID:</strong> {error.id}</div>
                <div><strong>Category:</strong> {error.category}</div>
                <div><strong>Code:</strong> {error.code}</div>
                {error.context.timestamp && (
                  <div><strong>Time:</strong> {error.context.timestamp.toLocaleString()}</div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {error?.isRetryable && retryCount < maxRetries && (
              <button
                onClick={this.handleRetry}
                disabled={isRecovering}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRecovering ? 'animate-spin' : ''}`} />
                {isRecovering ? 'Retrying...' : `Try Again ${retryCount > 0 ? `(${retryCount}/${maxRetries})` : ''}`}
              </button>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
              
              <button
                onClick={this.handleReport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Bug className="w-4 h-4" />
                Report Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderSectionLevelError(): ReactNode {
    const { error, isRecovering, retryCount } = this.state;
    const { maxRetries = 3 } = this.props;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-red-900 mb-1">
              Unable to load this section
            </h3>
            <p className="text-sm text-red-700 mb-3">
              {error?.userMessage || "This section is temporarily unavailable."}
            </p>
            
            <div className="flex gap-2">
              {error?.isRetryable && retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  disabled={isRecovering}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isRecovering ? 'animate-spin' : ''}`} />
                  {isRecovering ? 'Retrying...' : 'Retry'}
                </button>
              )}
              
              <button
                onClick={this.handleDismiss}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
              >
                <X className="w-3 h-3" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private renderComponentLevelError(): ReactNode {
    const { error, isRecovering } = this.state;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-yellow-800">
              {error?.userMessage || "This component failed to load."}
            </p>
          </div>
          {error?.isRetryable && (
            <button
              onClick={this.handleRetry}
              disabled={isRecovering}
              className="flex items-center gap-1 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded hover:bg-yellow-300 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isRecovering ? 'animate-spin' : ''}`} />
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderErrorFallback();
    }

    return this.props.children;
  }
}

// =============================================================================
// HIGHER-ORDER COMPONENT
// =============================================================================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// =============================================================================
// CONVENIENCE COMPONENTS
// =============================================================================

export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page" enableRecovery showErrorDetails>
    {children}
  </ErrorBoundary>
);

export const SectionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="section" enableRecovery>
    {children}
  </ErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="component" enableRecovery maxRetries={2}>
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;