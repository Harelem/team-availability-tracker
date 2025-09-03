/**
 * Retry and Fallback UI Provider
 * 
 * Provides comprehensive retry functionality and fallback UI states
 * for failed operations throughout the application.
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useRef, 
  useEffect 
} from 'react';
import { ResponsiveLoadingSpinner } from './ResponsiveLoadingSpinner';
import { Button } from './button';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface RetryConfig {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number;
  maxDelay: number;
  shouldRetry: (error: Error) => boolean;
  onRetryAttempt?: (attempt: number, error: Error) => void;
  onMaxAttemptsReached?: (error: Error) => void;
}

export interface FallbackState {
  id: string;
  type: 'retry' | 'offline' | 'degraded' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  canRetry: boolean;
  retryConfig?: RetryConfig;
  estimatedRecoveryTime?: number;
  fallbackData?: any;
  actions?: FallbackAction[];
}

export interface FallbackAction {
  id: string;
  label: string;
  description: string;
  variant: 'primary' | 'secondary' | 'outline';
  action: () => Promise<void> | void;
  disabled?: boolean;
}

export interface RetryOperation {
  id: string;
  name: string;
  operation: () => Promise<any>;
  config: RetryConfig;
  currentAttempt: number;
  isRetrying: boolean;
  lastError?: Error;
  startTime: number;
  fallbackState?: FallbackState;
}

export interface RetryFallbackContextType {
  operations: Map<string, RetryOperation>;
  registerOperation: (id: string, operation: () => Promise<any>, config?: Partial<RetryConfig>) => void;
  executeWithRetry: (id: string, operationName?: string) => Promise<any>;
  setFallbackState: (operationId: string, state: FallbackState) => void;
  clearFallbackState: (operationId: string) => void;
  isOnline: boolean;
  connectionQuality: 'good' | 'poor' | 'offline';
}

// =============================================================================
// CONTEXT
// =============================================================================

const RetryFallbackContext = createContext<RetryFallbackContextType | null>(null);

export const useRetryFallback = () => {
  const context = useContext(RetryFallbackContext);
  if (!context) {
    throw new Error('useRetryFallback must be used within RetryFallbackProvider');
  }
  return context;
};

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface RetryFallbackProviderProps {
  children: React.ReactNode;
  defaultRetryConfig?: Partial<RetryConfig>;
}

export const RetryFallbackProvider: React.FC<RetryFallbackProviderProps> = ({
  children,
  defaultRetryConfig = {}
}) => {
  const [operations, setOperations] = useState<Map<string, RetryOperation>>(new Map());
  const [fallbackStates, setFallbackStates] = useState<Map<string, FallbackState>>(new Map());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const connectionTestRef = useRef<NodeJS.Timeout | null>(null);

  // Default retry configuration
  const defaultConfig: RetryConfig = {
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    baseDelay: 1000,
    maxDelay: 10000,
    shouldRetry: (error) => {
      // Retry on network errors, but not on 4xx client errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return true;
      }
      if (error.message.includes('40')) return false; // 400-level errors
      return true;
    },
    ...defaultRetryConfig
  };

  // =============================================================================
  // CONNECTION MONITORING
  // =============================================================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      testConnectionQuality();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection quality test
    testConnectionQuality();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connectionTestRef.current) {
        clearTimeout(connectionTestRef.current);
      }
    };
  }, []);

  const testConnectionQuality = async () => {
    if (!navigator.onLine) {
      setConnectionQuality('offline');
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.ok) {
        setConnectionQuality(latency < 1000 ? 'good' : 'poor');
      } else {
        setConnectionQuality('poor');
      }
    } catch {
      setConnectionQuality('poor');
    }

    // Test again in 30 seconds
    connectionTestRef.current = setTimeout(testConnectionQuality, 30000);
  };

  // =============================================================================
  // RETRY LOGIC
  // =============================================================================

  const calculateDelay = (attempt: number, config: RetryConfig): number => {
    let delay: number;

    switch (config.backoffStrategy) {
      case 'linear':
        delay = config.baseDelay * attempt;
        break;
      case 'exponential':
        delay = config.baseDelay * Math.pow(2, attempt - 1);
        break;
      case 'fixed':
      default:
        delay = config.baseDelay;
        break;
    }

    return Math.min(delay, config.maxDelay);
  };

  const executeWithRetry = useCallback(async (id: string, operationName?: string): Promise<any> => {
    const operation = operations.get(id);
    if (!operation) {
      throw new Error(`Operation ${id} not found`);
    }

    const updatedOperation = { ...operation, isRetrying: true };
    setOperations(prev => new Map(prev).set(id, updatedOperation));

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= operation.config.maxAttempts; attempt++) {
      try {
        updatedOperation.currentAttempt = attempt;
        setOperations(prev => new Map(prev).set(id, updatedOperation));

        // Add artificial delay for retries
        if (attempt > 1) {
          const delay = calculateDelay(attempt, operation.config);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const result = await operation.operation();

        // Success - clear any fallback states
        clearFallbackState(id);
        
        updatedOperation.isRetrying = false;
        updatedOperation.currentAttempt = 0;
        setOperations(prev => new Map(prev).set(id, updatedOperation));

        return result;

      } catch (error) {
        lastError = error as Error;
        updatedOperation.lastError = lastError;
        
        console.warn(`Attempt ${attempt}/${operation.config.maxAttempts} failed for operation ${operationName || id}:`, error);

        // Check if we should retry this error
        if (!operation.config.shouldRetry(lastError)) {
          console.log('Error is not retryable, stopping retry attempts');
          break;
        }

        // Call retry attempt callback
        operation.config.onRetryAttempt?.(attempt, lastError);

        // Set appropriate fallback state based on attempt
        if (attempt === operation.config.maxAttempts) {
          // Final attempt failed
          const fallbackState: FallbackState = {
            id: `${id}-max-attempts`,
            type: 'retry',
            severity: 'high',
            title: 'Operation Failed',
            message: `${operationName || 'Operation'} failed after ${attempt} attempts. ${lastError.message}`,
            canRetry: true,
            retryConfig: operation.config,
            actions: [
              {
                id: 'retry-now',
                label: 'Try Again',
                description: 'Retry the operation immediately',
                variant: 'primary',
                action: () => executeWithRetry(id, operationName)
              },
              {
                id: 'dismiss',
                label: 'Dismiss',
                description: 'Close this error message',
                variant: 'outline',
                action: () => clearFallbackState(id)
              }
            ]
          };
          
          setFallbackState(id, fallbackState);
        } else if (attempt > 1) {
          // Intermediate attempt failed
          const nextDelay = calculateDelay(attempt + 1, operation.config);
          const fallbackState: FallbackState = {
            id: `${id}-retrying`,
            type: 'retry',
            severity: 'medium',
            title: 'Retrying Operation',
            message: `Attempt ${attempt} failed. Retrying in ${Math.round(nextDelay / 1000)}s...`,
            canRetry: false,
            estimatedRecoveryTime: nextDelay
          };
          
          setFallbackState(id, fallbackState);
        }
      }
    }

    // All attempts failed
    updatedOperation.isRetrying = false;
    setOperations(prev => new Map(prev).set(id, updatedOperation));

    operation.config.onMaxAttemptsReached?.(lastError);
    throw lastError;
  }, [operations]);

  const registerOperation = useCallback((
    id: string, 
    operation: () => Promise<any>, 
    config: Partial<RetryConfig> = {}
  ) => {
    const fullConfig = { ...defaultConfig, ...config };
    
    const retryOperation: RetryOperation = {
      id,
      name: id,
      operation,
      config: fullConfig,
      currentAttempt: 0,
      isRetrying: false,
      startTime: Date.now()
    };

    setOperations(prev => new Map(prev).set(id, retryOperation));
  }, [defaultConfig]);

  const setFallbackState = useCallback((operationId: string, state: FallbackState) => {
    setFallbackStates(prev => new Map(prev).set(operationId, state));
  }, []);

  const clearFallbackState = useCallback((operationId: string) => {
    setFallbackStates(prev => {
      const updated = new Map(prev);
      updated.delete(operationId);
      return updated;
    });
  }, []);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: RetryFallbackContextType = {
    operations,
    registerOperation,
    executeWithRetry,
    setFallbackState,
    clearFallbackState,
    isOnline,
    connectionQuality
  };

  return (
    <RetryFallbackContext.Provider value={contextValue}>
      {children}
      
      {/* Render fallback UIs */}
      {Array.from(fallbackStates.values()).map(state => (
        <FallbackUI key={state.id} state={state} />
      ))}
      
      {/* Connection Status Indicator */}
      <ConnectionStatusIndicator 
        isOnline={isOnline} 
        quality={connectionQuality} 
      />
    </RetryFallbackContext.Provider>
  );
};

// =============================================================================
// FALLBACK UI COMPONENT
// =============================================================================

interface FallbackUIProps {
  state: FallbackState;
}

const FallbackUI: React.FC<FallbackUIProps> = ({ state }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (state.estimatedRecoveryTime) {
      setCountdown(Math.ceil(state.estimatedRecoveryTime / 1000));
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [state.estimatedRecoveryTime]);

  if (!isVisible) return null;

  const getSeverityStyles = () => {
    switch (state.severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getSeverityIcon = () => {
    switch (state.severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'low':
      default:
        return <RefreshCw className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full mx-4 rounded-lg border p-4 shadow-lg ${getSeverityStyles()}`}>
      <div className="flex items-start gap-3">
        {getSeverityIcon()}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">{state.title}</h3>
          <p className="text-sm opacity-90 mb-3">{state.message}</p>
          
          {countdown && (
            <div className="flex items-center gap-2 mb-3">
              <ResponsiveLoadingSpinner size="xs" variant="dots" />
              <span className="text-xs opacity-75">
                Retrying in {countdown}s...
              </span>
            </div>
          )}
          
          {state.actions && state.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {state.actions.map(action => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={action.variant}
                  onClick={action.action}
                  disabled={action.disabled}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// CONNECTION STATUS INDICATOR
// =============================================================================

interface ConnectionStatusIndicatorProps {
  isOnline: boolean;
  quality: 'good' | 'poor' | 'offline';
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  isOnline,
  quality
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (isOnline && quality === 'good') {
    return null; // Don't show anything when connection is good
  }

  const getStatusInfo = () => {
    if (!isOnline || quality === 'offline') {
      return {
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Offline',
        color: 'bg-red-500',
        description: 'No internet connection. Some features may not work.'
      };
    }
    
    if (quality === 'poor') {
      return {
        icon: <Wifi className="w-4 h-4" />,
        text: 'Poor Connection',
        color: 'bg-yellow-500',
        description: 'Slow internet connection. Operations may take longer.'
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div 
        className="flex items-center gap-2 bg-white rounded-full shadow-lg border px-3 py-2 cursor-pointer transition-all duration-200 hover:shadow-xl"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className={`w-2 h-2 rounded-full ${statusInfo.color} animate-pulse`} />
        {statusInfo.icon}
        <span className="text-sm font-medium text-gray-700">
          {statusInfo.text}
        </span>
      </div>
      
      {showDetails && (
        <div className="mt-2 bg-white rounded-lg shadow-lg border p-3 max-w-xs">
          <p className="text-sm text-gray-600">{statusInfo.description}</p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              Reload Page
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetails(false)}
              className="text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// HOOKS
// =============================================================================

export const useRetryOperation = (
  operationId: string,
  operation: () => Promise<any>,
  config?: Partial<RetryConfig>
) => {
  const { registerOperation, executeWithRetry } = useRetryFallback();

  useEffect(() => {
    registerOperation(operationId, operation, config);
  }, [operationId, operation, config, registerOperation]);

  return useCallback(
    (operationName?: string) => executeWithRetry(operationId, operationName),
    [operationId, executeWithRetry]
  );
};

export default RetryFallbackProvider;