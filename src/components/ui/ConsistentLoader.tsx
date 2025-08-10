/**
 * Consistent Loader Component
 * 
 * A hydration-safe loading component that renders identical HTML on server and client
 * to prevent hydration mismatch errors.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { cx } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface ConsistentLoaderProps {
  variant?: 'pulse' | 'spinner' | 'skeleton';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  message?: string;
  fullPage?: boolean;
  testId?: string;
}

export interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
  avatar?: boolean;
  actions?: boolean;
}

// =============================================================================
// HOOKS
// =============================================================================

export const useIsomorphicLoading = () => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  return isMounted;
};

// =============================================================================
// CONSISTENT LOADER COMPONENT
// =============================================================================

export const ConsistentLoader: React.FC<ConsistentLoaderProps> = ({
  variant = 'pulse',
  size = 'md',
  className,
  message,
  fullPage = false,
  testId
}) => {
  const isMounted = useIsomorphicLoading();
  
  // Size mappings for consistent sizing
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  // Base pulse skeleton that's identical on server and client
  const PulseContent = () => (
    <div className="animate-pulse space-y-3" data-testid={testId}>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );

  // Server-side rendering: Always use pulse animation
  if (!isMounted) {
    const content = <PulseContent />;
    
    if (fullPage) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full">
            {message && (
              <div className="text-center mb-4">
                <div className="h-6 bg-gray-200 rounded w-32 mx-auto"></div>
              </div>
            )}
            {content}
          </div>
        </div>
      );
    }

    return (
      <div className={cx('p-4', className)}>
        {message && (
          <div className="mb-4">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        )}
        {content}
      </div>
    );
  }

  // Client-side rendering: Can use enhanced loading based on variant
  const renderVariant = () => {
    switch (variant) {
      case 'spinner':
        return (
          <div className="flex flex-col items-center space-y-3" data-testid={testId}>
            <div 
              className={cx(
                'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
                sizeClasses[size]
              )}
              role="status"
              aria-label="Loading..."
            />
            {message && (
              <p className="text-sm text-gray-600 text-center">{message}</p>
            )}
          </div>
        );

      case 'skeleton':
        return <LoadingSkeleton className={className} />;

      case 'pulse':
      default:
        return <PulseContent />;
    }
  };

  const content = renderVariant();

  if (fullPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full text-center">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={cx('p-4', className)}>
      {content}
    </div>
  );
};

// =============================================================================
// LOADING SKELETON COMPONENT
// =============================================================================

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 3,
  className,
  avatar = false,
  actions = false
}) => {
  const isMounted = useIsomorphicLoading();
  
  // Server-safe skeleton that's identical on both sides
  return (
    <div className={cx('animate-pulse space-y-4', className)}>
      {/* Header with optional avatar */}
      <div className="flex items-start space-x-4">
        {avatar && (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
        )}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          {lines > 1 && (
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          )}
        </div>
      </div>

      {/* Content lines */}
      <div className="space-y-2">
        {Array.from({ length: Math.max(0, lines - 1) }).map((_, index) => (
          <div
            key={index}
            className={cx(
              'h-3 bg-gray-200 rounded',
              index === lines - 2 ? 'w-5/6' : 'w-full'
            )}
          />
        ))}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex space-x-3 pt-2">
          <div className="h-8 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-16"></div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// LOADING BOUNDARY COMPONENT
// =============================================================================

export interface LoadingBoundaryProps {
  children: React.ReactNode;
  loading: boolean;
  fallback?: React.ReactNode;
  variant?: 'pulse' | 'spinner' | 'skeleton';
  message?: string;
  className?: string;
  testId?: string;
}

export const LoadingBoundary: React.FC<LoadingBoundaryProps> = ({
  children,
  loading,
  fallback,
  variant = 'pulse',
  message,
  className,
  testId
}) => {
  if (loading) {
    return (
      <>
        {fallback || (
          <ConsistentLoader
            variant={variant}
            message={message}
            className={className}
            testId={testId}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
};

// =============================================================================
// FULL PAGE LOADING COMPONENT
// =============================================================================

export interface FullPageLoadingProps {
  message?: string;
  variant?: 'pulse' | 'spinner';
  showProgress?: boolean;
  progress?: number;
  className?: string;
  testId?: string;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  message = 'Loading...',
  variant = 'pulse',
  showProgress = false,
  progress = 0,
  className,
  testId
}) => {
  const isMounted = useIsomorphicLoading();
  
  return (
    <div 
      className={cx(
        'min-h-screen bg-gray-50 flex items-center justify-center p-4',
        className
      )}
      data-testid={testId}
    >
      <div className="bg-white rounded-lg p-8 shadow-md max-w-md w-full text-center">
        {/* Always show pulse on server, upgrade to variant on client */}
        <div className="animate-pulse space-y-4" suppressHydrationWarning>
          <div className="h-6 bg-gray-200 rounded w-48 mx-auto"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>

        {/* Enhanced loading only on client */}
        {isMounted && variant === 'spinner' && (
          <div className="mt-6" suppressHydrationWarning>
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">{message}</p>
            
            {showProgress && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{Math.round(progress)}% complete</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export default ConsistentLoader;