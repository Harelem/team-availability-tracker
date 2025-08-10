'use client';

/**
 * Standardized Error Display Component
 * 
 * Provides consistent, user-friendly error displays with recovery actions
 * across the entire application.
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  XCircle, 
  Info, 
  RefreshCw, 
  X, 
  Bug, 
  Home,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink
} from 'lucide-react';
import { 
  AppError, 
  ErrorSeverity, 
  ErrorCategory,
  ErrorRecoveryStrategy 
} from '@/types/errors';

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

interface ErrorDisplayProps {
  error: AppError;
  variant?: 'inline' | 'card' | 'banner' | 'modal';
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  showRetry?: boolean;
  showDismiss?: boolean;
  maxRetries?: number;
  currentRetries?: number;
  isRetrying?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  onReport?: () => void;
  className?: string;
}

interface ErrorMessageProps {
  message: string;
  severity: ErrorSeverity;
  className?: string;
}

interface ErrorActionsProps {
  error: AppError;
  showRetry: boolean;
  showDismiss: boolean;
  maxRetries: number;
  currentRetries: number;
  isRetrying: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  onReport?: () => void;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getSeverityConfig = (severity: ErrorSeverity) => {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        buttonColor: 'bg-red-600 hover:bg-red-700'
      };
    case ErrorSeverity.HIGH:
      return {
        icon: AlertTriangle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        buttonColor: 'bg-orange-600 hover:bg-orange-700'
      };
    case ErrorSeverity.MEDIUM:
      return {
        icon: AlertCircle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
      };
    case ErrorSeverity.LOW:
      return {
        icon: Info,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        buttonColor: 'bg-blue-600 hover:bg-blue-700'
      };
    default:
      return {
        icon: AlertCircle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        buttonColor: 'bg-gray-600 hover:bg-gray-700'
      };
  }
};

const getCategoryIcon = (category: ErrorCategory) => {
  switch (category) {
    case ErrorCategory.NETWORK:
      return '🌐';
    case ErrorCategory.DATABASE:
      return '💾';
    case ErrorCategory.VALIDATION:
      return '✏️';
    case ErrorCategory.AUTHENTICATION:
      return '🔐';
    case ErrorCategory.AUTHORIZATION:
      return '🚫';
    case ErrorCategory.BUSINESS_LOGIC:
      return '⚙️';
    case ErrorCategory.UI:
      return '🎨';
    case ErrorCategory.SYSTEM:
      return '⚡';
    default:
      return '❓';
  }
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  severity, 
  className = '' 
}) => {
  const config = getSeverityConfig(severity);
  
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <config.icon className={`w-5 h-5 ${config.color} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${config.color.replace('text-', 'text-').replace('-600', '-800')}`}>
          {message}
        </p>
      </div>
    </div>
  );
};

const ErrorDetails: React.FC<{ error: AppError; isOpen: boolean; onToggle: () => void }> = ({ 
  error, 
  isOpen, 
  onToggle 
}) => {
  const [copied, setCopied] = useState(false);

  const copyErrorDetails = async () => {
    const details = JSON.stringify({
      id: error.id,
      category: error.category,
      severity: error.severity,
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      context: error.context
    }, null, 2);

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {isOpen ? 'Hide details' : 'Show details'}
      </button>
      
      {isOpen && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span className="font-medium">Error Details</span>
              <button
                onClick={copyErrorDetails}
                className="flex items-center gap-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium">ID:</span> {error.id}
              </div>
              <div>
                <span className="font-medium">Code:</span> {error.code}
              </div>
              <div>
                <span className="font-medium">Category:</span> 
                <span className="ml-1">{getCategoryIcon(error.category)} {error.category}</span>
              </div>
              <div>
                <span className="font-medium">Severity:</span> {error.severity}
              </div>
            </div>
            
            <div>
              <span className="font-medium">Time:</span> {error.timestamp.toLocaleString()}
            </div>
            
            {error.context.component && (
              <div>
                <span className="font-medium">Component:</span> {error.context.component}
              </div>
            )}
            
            {error.context.action && (
              <div>
                <span className="font-medium">Action:</span> {error.context.action}
              </div>
            )}
            
            {error.originalError?.stack && (
              <div>
                <span className="font-medium">Stack trace:</span>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all">
                  {error.originalError.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ErrorActions: React.FC<ErrorActionsProps> = ({
  error,
  showRetry,
  showDismiss,
  maxRetries,
  currentRetries,
  isRetrying,
  onRetry,
  onDismiss,
  onReport
}) => {
  const config = getSeverityConfig(error.severity);
  const canRetry = showRetry && error.isRetryable && currentRetries < maxRetries;

  return (
    <div className="flex gap-2 mt-3">
      {canRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className={`flex items-center gap-1 px-3 py-1.5 text-white text-sm rounded transition-colors disabled:opacity-50 ${config.buttonColor}`}
        >
          <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : `Retry ${currentRetries > 0 ? `(${currentRetries}/${maxRetries})` : ''}`}
        </button>
      )}
      
      {onReport && (
        <button
          onClick={onReport}
          className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
        >
          <Bug className="w-3 h-3" />
          Report
        </button>
      )}
      
      {showDismiss && (
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded transition-colors"
        >
          <X className="w-3 h-3" />
          Dismiss
        </button>
      )}
      
      {error.severity === ErrorSeverity.CRITICAL && (
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
        >
          <Home className="w-3 h-3" />
          Go Home
        </button>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  variant = 'card',
  size = 'md',
  showDetails = false,
  showRetry = true,
  showDismiss = true,
  maxRetries = 3,
  currentRetries = 0,
  isRetrying = false,
  onRetry,
  onDismiss,
  onReport,
  className = ''
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const config = getSeverityConfig(error.severity);

  // Size classes
  const sizeClasses = {
    sm: 'p-2 text-xs',
    md: 'p-4 text-sm',
    lg: 'p-6 text-base'
  };

  // Variant-specific styling
  const getVariantClasses = () => {
    const baseClasses = `${config.bgColor} ${config.borderColor} ${sizeClasses[size]}`;
    
    switch (variant) {
      case 'inline':
        return `${baseClasses} border-l-4 pl-4`;
      
      case 'banner':
        return `${baseClasses} border-t border-b`;
      
      case 'modal':
        return `${baseClasses} rounded-lg shadow-lg border`;
      
      case 'card':
      default:
        return `${baseClasses} rounded-lg border`;
    }
  };

  return (
    <div className={`${getVariantClasses()} ${className}`}>
      <ErrorMessage 
        message={error.userMessage} 
        severity={error.severity} 
      />
      
      {(showRetry || showDismiss || onReport) && (
        <ErrorActions
          error={error}
          showRetry={showRetry}
          showDismiss={showDismiss}
          maxRetries={maxRetries}
          currentRetries={currentRetries}
          isRetrying={isRetrying}
          onRetry={onRetry}
          onDismiss={onDismiss}
          onReport={onReport}
        />
      )}
      
      {showDetails && (
        <ErrorDetails
          error={error}
          isOpen={detailsOpen}
          onToggle={() => setDetailsOpen(!detailsOpen)}
        />
      )}
    </div>
  );
};

// =============================================================================
// SPECIALIZED ERROR COMPONENTS
// =============================================================================

export const NetworkErrorDisplay: React.FC<{ error: AppError } & Omit<ErrorDisplayProps, 'error'>> = ({ 
  error, 
  ...props 
}) => (
  <ErrorDisplay 
    {...props}
    error={error}
    showRetry={true}
    maxRetries={3}
  />
);

export const DatabaseErrorDisplay: React.FC<{ error: AppError } & Omit<ErrorDisplayProps, 'error'>> = ({ 
  error, 
  ...props 
}) => (
  <ErrorDisplay 
    {...props}
    error={error}
    showRetry={true}
    maxRetries={2}
  />
);

export const ValidationErrorDisplay: React.FC<{ error: AppError } & Omit<ErrorDisplayProps, 'error'>> = ({ 
  error, 
  ...props 
}) => (
  <ErrorDisplay 
    {...props}
    error={error}
    showRetry={false}
    variant="inline"
  />
);

export const CriticalErrorDisplay: React.FC<{ error: AppError } & Omit<ErrorDisplayProps, 'error'>> = ({ 
  error, 
  ...props 
}) => (
  <ErrorDisplay 
    {...props}
    error={error}
    variant="modal"
    size="lg"
    showDetails={true}
    showRetry={error.isRetryable}
  />
);

// =============================================================================
// ERROR NOTIFICATION TOAST
// =============================================================================

export const ErrorToast: React.FC<{
  error: AppError;
  onDismiss: () => void;
  duration?: number;
}> = ({ error, onDismiss, duration = 5000 }) => {
  const config = getSeverityConfig(error.severity);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  return (
    <div className={`max-w-sm w-full ${config.bgColor} shadow-lg rounded-lg pointer-events-auto border ${config.borderColor}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <config.icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${config.color.replace('-600', '-900')}`}>
              Error occurred
            </p>
            <p className={`mt-1 text-sm ${config.color.replace('-600', '-700')}`}>
              {error.userMessage}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onDismiss}
              className={`rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;