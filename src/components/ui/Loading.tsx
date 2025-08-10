/**
 * Enhanced Loading Component
 * 
 * A comprehensive loading component with spinners, skeletons, and pulse animations.
 * Supports different variants, sizes, and accessibility features.
 * Now includes hydration-safe rendering to prevent SSR/CSR mismatches.
 */

import React, { forwardRef, ReactNode, useEffect, useState } from 'react';
import { cx } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export type LoadingVariant = 'spinner' | 'pulse' | 'skeleton' | 'dots';
export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface LoadingProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  className?: string;
  color?: string;
  label?: string;
  testId?: string;
  suppressHydrationWarning?: boolean;
}

export interface SkeletonProps {
  variant?: 'circle' | 'rectangle' | 'text';
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
  testId?: string;
}

export interface LoadingOverlayProps {
  children: ReactNode;
  loading: boolean;
  variant?: LoadingVariant;
  size?: LoadingSize;
  message?: string;
  className?: string;
  overlayClassName?: string;
  testId?: string;
}

// =============================================================================
// LOADING COMPONENT
// =============================================================================

export const Loading = forwardRef<HTMLDivElement, LoadingProps>(
  (
    {
      variant = 'spinner',
      size = 'md',
      className,
      color = 'currentColor',
      label = 'Loading...',
      testId,
      suppressHydrationWarning = false
    },
    ref
  ) => {
    // Hydration-safe state
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
      setIsMounted(true);
    }, []);
    // Size classes
    const sizeClasses = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8'
    };

    // Server-side fallback to pulse for spinner variant
    if (!isMounted && variant === 'spinner') {
      return (
        <div
          ref={ref}
          className={cx(
            'animate-pulse bg-gray-300 rounded-full',
            sizeClasses[size],
            className
          )}
          role="status"
          aria-label={label}
          data-testid={testId}
          suppressHydrationWarning={suppressHydrationWarning}
        />
      );
    }

    // Spinner variant (client-side only)
    if (variant === 'spinner') {
      return (
        <div
          ref={ref}
          className={cx(
            'animate-spin rounded-full border-2 border-gray-300',
            'border-t-current',
            sizeClasses[size],
            className
          )}
          style={{ borderTopColor: color }}
          role="status"
          aria-label={label}
          data-testid={testId}
          suppressHydrationWarning={suppressHydrationWarning}
        />
      );
    }

    // Dots variant
    if (variant === 'dots') {
      const dotSizes = {
        xs: 'w-1 h-1',
        sm: 'w-1.5 h-1.5',
        md: 'w-2 h-2',
        lg: 'w-2.5 h-2.5',
        xl: 'w-3 h-3'
      };

      return (
        <div
          ref={ref}
          className={cx('flex space-x-1', className)}
          role="status"
          aria-label={label}
          data-testid={testId}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cx(
                'rounded-full animate-pulse',
                dotSizes[size]
              )}
              style={{ 
                backgroundColor: color,
                animationDelay: `${i * 0.15}s`,
                animationDuration: '0.6s'
              }}
            />
          ))}
        </div>
      );
    }

    // Pulse variant
    if (variant === 'pulse') {
      return (
        <div
          ref={ref}
          className={cx(
            'animate-pulse bg-gray-300 rounded',
            sizeClasses[size],
            className
          )}
          role="status"
          aria-label={label}
          data-testid={testId}
        />
      );
    }

    // Skeleton variant (default rectangle)
    return (
      <div
        ref={ref}
        className={cx(
          'animate-pulse bg-gray-300 rounded',
          sizeClasses[size],
          className
        )}
        role="status"
        aria-label={label}
        data-testid={testId}
      />
    );
  }
);

Loading.displayName = 'Loading';

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangle',
  width,
  height,
  className,
  animate = true,
  testId
}) => {
  const baseClasses = cx(
    'bg-gray-300',
    animate ? 'animate-pulse' : '',
    variant === 'circle' ? 'rounded-full' : '',
    variant === 'rectangle' ? 'rounded' : '',
    variant === 'text' ? 'h-4 rounded' : ''
  );

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cx(baseClasses, className)}
      style={style}
      role="status"
      aria-label="Loading content..."
      data-testid={testId}
    />
  );
};

// =============================================================================
// SKELETON TEXT COMPONENT
// =============================================================================

export interface SkeletonTextProps {
  lines?: number;
  width?: (string | number)[];
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
  testId?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  width,
  spacing = 'md',
  className,
  testId
}) => {
  const spacingClasses = {
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4'
  };

  return (
    <div 
      className={cx(spacingClasses[spacing], className)}
      data-testid={testId}
    >
      {Array.from({ length: lines }).map((_, index) => {
        const lineWidth = width?.[index] || (index === lines - 1 ? '75%' : '100%');
        return (
          <Skeleton
            key={index}
            variant="text"
            width={lineWidth}
          />
        );
      })}
    </div>
  );
};

// =============================================================================
// LOADING OVERLAY COMPONENT
// =============================================================================

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  children,
  loading,
  variant = 'spinner',
  size = 'lg',
  message,
  className,
  overlayClassName,
  testId
}) => {
  return (
    <div className={cx('relative', className)} data-testid={testId}>
      {children}
      
      {loading && (
        <div
          className={cx(
            'absolute inset-0 flex flex-col items-center justify-center',
            'bg-white bg-opacity-75 backdrop-blur-sm z-10',
            overlayClassName
          )}
          role="status"
          aria-live="polite"
          data-testid={testId ? `${testId}-overlay` : undefined}
        >
          <Loading
            variant={variant}
            size={size}
            label={message || 'Loading content...'}
          />
          {message && (
            <p className="mt-3 text-sm text-gray-600 font-medium">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// LOADING CARD COMPONENT
// =============================================================================

export interface LoadingCardProps {
  title?: boolean;
  description?: boolean;
  avatar?: boolean;
  actions?: boolean;
  className?: string;
  testId?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  title = true,
  description = true,
  avatar = false,
  actions = false,
  className,
  testId
}) => {
  return (
    <div 
      className={cx('p-6 bg-white rounded-lg border border-gray-200', className)}
      role="status"
      aria-label="Loading card content..."
      data-testid={testId}
    >
      {/* Header with optional avatar */}
      <div className="flex items-start space-x-4">
        {avatar && (
          <Skeleton variant="circle" width={40} height={40} />
        )}
        
        <div className="flex-1 space-y-3">
          {title && (
            <Skeleton variant="text" width="60%" />
          )}
          
          {description && (
            <SkeletonText lines={2} width={['100%', '80%']} spacing="sm" />
          )}
        </div>
      </div>
      
      {/* Actions */}
      {actions && (
        <div className="mt-6 flex space-x-3">
          <Skeleton width={80} height={32} />
          <Skeleton width={60} height={32} />
        </div>
      )}
    </div>
  );
};

// =============================================================================
// LOADING TABLE COMPONENT
// =============================================================================

export interface LoadingTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
  testId?: string;
}

export const LoadingTable: React.FC<LoadingTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
  testId
}) => {
  return (
    <div className={cx('w-full', className)} data-testid={testId}>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full">
          {showHeader && (
            <thead className="bg-gray-50">
              <tr>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <th key={colIndex} className="px-4 py-3">
                    <Skeleton variant="text" width="80%" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-200 bg-white">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <Skeleton 
                      variant="text" 
                      width={colIndex === 0 ? '90%' : `${60 + Math.random() * 30}%`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =============================================================================
// HOOKS
// =============================================================================

export interface UseLoadingReturn {
  loading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  toggleLoading: () => void;
}

export const useLoading = (initialLoading = false): UseLoadingReturn => {
  const [loading, setLoading] = React.useState(initialLoading);

  const startLoading = React.useCallback(() => setLoading(true), []);
  const stopLoading = React.useCallback(() => setLoading(false), []);
  const toggleLoading = React.useCallback(() => setLoading(prev => !prev), []);

  return { loading, startLoading, stopLoading, toggleLoading };
};

// =============================================================================
// EXPORTS
// =============================================================================

// Types already exported above
export default Loading;