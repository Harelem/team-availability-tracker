'use client';

/**
 * Error Boundary Hook
 * 
 * Provides programmatic error boundary control and error handling capabilities
 * for functional components.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  AppError, 
  ErrorBoundaryState, 
  ErrorBoundaryActions,
  ErrorContext,
  ErrorCategory
} from '@/types/errors';
import { errorHandler, handleError } from '@/utils/errorHandler';

// =============================================================================
// HOOK INTERFACES
// =============================================================================

interface UseErrorBoundaryOptions {
  enableRecovery?: boolean;
  maxRetries?: number;
  onError?: (error: AppError) => void;
  context?: Partial<ErrorContext>;
  fallbackData?: any;
}

interface UseErrorBoundaryReturn {
  // State
  hasError: boolean;
  error: AppError | undefined;
  isRecovering: boolean;
  retryCount: number;
  
  // Actions
  captureError: (error: Error, context?: Partial<ErrorContext>) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  recover: () => Promise<void>;
  dismiss: () => void;
  
  // Error boundary wrapper
  ErrorBoundaryWrapper: React.FC<{ children: React.ReactNode }>;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useErrorBoundary(options: UseErrorBoundaryOptions = {}): UseErrorBoundaryReturn {
  const {
    enableRecovery = true,
    maxRetries = 3,
    onError,
    context: defaultContext,
    fallbackData
  } = options;

  // State management
  const [state, setState] = useState<ErrorBoundaryState>({
    hasError: false,
    retryCount: 0,
    isRecovering: false,
    fallbackData
  });

  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // =============================================================================
  // ERROR HANDLING METHODS
  // =============================================================================

  const captureError = useCallback(async (
    error: Error, 
    context?: Partial<ErrorContext>
  ): Promise<void> => {
    try {
      // Merge context with default context
      const fullContext = {
        ...defaultContext,
        ...context,
        component: context?.component || defaultContext?.component || 'useErrorBoundary'
      };

      // Handle error through centralized handler
      const appError = await handleError(error, fullContext);
      
      // Update state
      setState(prev => ({
        ...prev,
        hasError: true,
        error: appError,
        errorId: appError.id
      }));

      // Call error callback if provided
      if (onError) {
        onError(appError);
      }

      // Attempt automatic recovery if enabled
      if (enableRecovery && appError.isRecoverable) {
        await performRecovery(appError);
      }

    } catch (handlingError) {
      console.error('Error in useErrorBoundary.captureError:', handlingError);
    }
  }, [defaultContext, onError, enableRecovery]);

  const performRecovery = useCallback(async (appError: AppError): Promise<void> => {
    setState(prev => ({ ...prev, isRecovering: true }));

    try {
      const recovered = await errorHandler.recover(appError);
      
      if (recovered) {
        console.log('✅ Error recovery successful:', appError.id);
        reset();
      } else {
        console.log('❌ Automatic recovery failed:', appError.id);
      }
    } catch (recoveryError) {
      console.error('Error during recovery attempt:', recoveryError);
    } finally {
      setState(prev => ({ ...prev, isRecovering: false }));
    }
  }, []);

  // =============================================================================
  // USER ACTION HANDLERS
  // =============================================================================

  const retry = useCallback(async (): Promise<void> => {
    const { retryCount, error } = state;

    if (retryCount >= maxRetries) {
      console.warn('Max retry attempts reached');
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isRecovering: true, 
      retryCount: retryCount + 1 
    }));

    try {
      // If we have a stored operation, retry it
      if (lastOperationRef.current) {
        await lastOperationRef.current();
        reset();
        return;
      }

      // Otherwise attempt recovery
      if (error?.isRetryable) {
        const recovered = await errorHandler.recover(error);
        if (recovered) {
          reset();
          return;
        }
      }

      console.log('No specific operation to retry, resetting error state');
      reset();

    } catch (retryError) {
      console.error('Retry attempt failed:', retryError);
      await captureError(retryError as Error, { action: 'retry' });
    } finally {
      setState(prev => ({ ...prev, isRecovering: false }));
    }
  }, [state, maxRetries, captureError]);

  const reset = useCallback((): void => {
    setState({
      hasError: false,
      error: undefined,
      errorId: undefined,
      retryCount: 0,
      isRecovering: false,
      fallbackData
    });
    lastOperationRef.current = null;
  }, [fallbackData]);

  const recover = useCallback(async (): Promise<void> => {
    const { error } = state;
    if (!error) return;

    await performRecovery(error);
  }, [state.error, performRecovery]);

  const dismiss = useCallback((): void => {
    setState(prev => ({
      ...prev,
      hasError: false,
      error: undefined,
      errorId: undefined
    }));
  }, []);

  // =============================================================================
  // ERROR BOUNDARY WRAPPER COMPONENT
  // =============================================================================

  const ErrorBoundaryWrapper: React.FC<{ children: React.ReactNode }> = useCallback(({ children }) => {
    const { hasError, error, isRecovering, retryCount } = state;

    if (hasError && error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0">
              ⚠️
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-red-900 mb-1">
                Something went wrong
              </h3>
              <p className="text-sm text-red-700 mb-3">
                {error.userMessage}
              </p>
              
              <div className="flex gap-2">
                {error.isRetryable && retryCount < maxRetries && (
                  <button
                    onClick={retry}
                    disabled={isRecovering}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {isRecovering ? '🔄 Retrying...' : 'Retry'}
                  </button>
                )}
                
                <button
                  onClick={dismiss}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  }, [state, retry, dismiss, maxRetries]);

  return {
    // State
    hasError: state.hasError,
    error: state.error,
    isRecovering: state.isRecovering,
    retryCount: state.retryCount,
    
    // Actions
    captureError,
    retry,
    reset,
    recover,
    dismiss,
    
    // Wrapper component
    ErrorBoundaryWrapper
  };
}

// =============================================================================
// ASYNC OPERATION HOOK
// =============================================================================

interface UseAsyncOperationOptions<T> {
  onError?: (error: AppError) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  context?: Partial<ErrorContext>;
}

interface UseAsyncOperationReturn<T> {
  data: T | undefined;
  loading: boolean;
  error: AppError | undefined;
  execute: (operation: () => Promise<T>) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

export function useAsyncOperation<T>(
  options: UseAsyncOperationOptions<T> = {}
): UseAsyncOperationReturn<T> {
  const {
    onError,
    enableRetry = true,
    maxRetries = 3,
    context: defaultContext
  } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const lastOperationRef = useRef<(() => Promise<T>) | null>(null);

  const errorBoundary = useErrorBoundary({
    enableRecovery: enableRetry,
    maxRetries,
    onError,
    context: defaultContext
  });

  const execute = useCallback(async (operation: () => Promise<T>): Promise<void> => {
    lastOperationRef.current = operation;
    setLoading(true);
    
    try {
      const result = await operation();
      setData(result);
      errorBoundary.reset(); // Clear any previous errors
    } catch (error) {
      await errorBoundary.captureError(error as Error, { action: 'async_operation' });
    } finally {
      setLoading(false);
    }
  }, [errorBoundary]);

  const retry = useCallback(async (): Promise<void> => {
    if (lastOperationRef.current) {
      await execute(lastOperationRef.current);
    }
  }, [execute]);

  const reset = useCallback((): void => {
    setData(undefined);
    setLoading(false);
    lastOperationRef.current = null;
    errorBoundary.reset();
  }, [errorBoundary]);

  return {
    data,
    loading,
    error: errorBoundary.error,
    execute,
    retry,
    reset
  };
}

// =============================================================================
// ERROR HANDLING HOOKS FOR SPECIFIC CATEGORIES
// =============================================================================

export function useNetworkErrorHandler() {
  return useErrorBoundary({
    context: { component: 'NetworkOperation' },
    enableRecovery: true,
    maxRetries: 3
  });
}

export function useDatabaseErrorHandler() {
  return useErrorBoundary({
    context: { component: 'DatabaseOperation' },
    enableRecovery: true,
    maxRetries: 2
  });
}

export function useValidationErrorHandler() {
  return useErrorBoundary({
    context: { component: 'ValidationOperation' },
    enableRecovery: false, // Validation errors require user action
    maxRetries: 0
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Wraps an async function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Partial<ErrorContext>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = await handleError(error as Error, context);
      throw appError;
    }
  };
}

/**
 * Creates a safe async function that handles errors gracefully
 */
export function createSafeAsyncFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  fallbackValue: R,
  context?: Partial<ErrorContext>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Safe async function error:', error);
      await handleError(error as Error, context);
      return fallbackValue;
    }
  };
}

export default useErrorBoundary;