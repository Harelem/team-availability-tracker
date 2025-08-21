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

    // Enhanced spinner variant (client-side only)
    if (variant === 'spinner') {
      return (
        <div
          ref={ref}
          className={cx(
            'animate-spin rounded-full border-2 border-gray-300',
            'border-t-current drop-shadow-sm',
            'motion-reduce:animate-pulse',
            sizeClasses[size],
            className
          )}
          style={{ 
            borderTopColor: color,
            animation: 'spin 0.8s linear infinite'
          }}
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
    // Enhanced skeleton with professional shimmer effect
    'bg-gradient-to-r from-gray-200 via-white to-gray-200',
    'dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
    'bg-[length:200%_100%]',
    animate ? 'animate-shimmer' : '',
    variant === 'circle' ? 'rounded-full' : '',
    variant === 'rectangle' ? 'rounded-lg' : '',
    variant === 'text' ? 'h-4 rounded-sm' : '',
    // Professional polish with subtle styling
    'relative overflow-hidden',
    'shadow-sm border border-gray-100 dark:border-gray-700',
    'backdrop-blur-sm',
    'motion-reduce:animate-pulse motion-reduce:bg-gray-300',
    // Enhanced visual appeal
    'before:absolute before:inset-0',
    'before:bg-gradient-to-r before:from-transparent before:via-gray-100 before:to-transparent',
    'dark:before:via-gray-600',
    'before:opacity-60 before:animate-shimmer'
  );

  const style: React.CSSProperties = {
    animation: animate ? 'shimmer 1.8s ease-in-out infinite' : undefined
  };
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
      className={cx(
        'p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
        'shadow-lg shadow-gray-100 dark:shadow-gray-900/20',
        'animate-pulse backdrop-blur-sm',
        'hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ease-out',
        'motion-reduce:animate-none motion-reduce:transform-none',
        'ui-card', // Apply professional card styling
        className
      )}
      role="status"
      aria-label="Loading card content..."
      data-testid={testId}
    >
      {/* Header with optional avatar */}
      <div className="flex items-start space-x-4">
        {avatar && (
          <Skeleton 
            variant="circle" 
            width={48} 
            height={48}
            className="flex-shrink-0"
          />
        )}
        
        <div className="flex-1 space-y-3">
          {title && (
            <Skeleton 
              variant="text" 
              width="70%" 
              className="h-5"
            />
          )}
          
          {description && (
            <SkeletonText 
              lines={2} 
              width={['100%', '85%']} 
              spacing="sm" 
              className="opacity-80"
            />
          )}
        </div>
      </div>
      
      {/* Actions */}
      {actions && (
        <div className="mt-6 flex space-x-3">
          <Skeleton width={88} height={36} className="rounded-md" />
          <Skeleton width={72} height={36} className="rounded-md" />
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
    <div 
      className={cx('w-full animate-pulse motion-reduce:animate-none', className)} 
      data-testid={testId}
    >
      <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full">
          {showHeader && (
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <th key={colIndex} className="px-6 py-4">
                    <Skeleton 
                      variant="text" 
                      width={`${70 + Math.random() * 20}%`}
                      className="h-4"
                    />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-200 bg-white">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50/50">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <Skeleton 
                      variant="text" 
                      width={colIndex === 0 ? '85%' : `${55 + Math.random() * 35}%`}
                      className="h-4"
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
// METRICS CARD SKELETON
// =============================================================================

export interface MetricsCardSkeletonProps {
  className?: string;
  testId?: string;
}

export const MetricsCardSkeleton: React.FC<MetricsCardSkeletonProps> = ({
  className,
  testId
}) => {
  return (
    <div 
      className={cx(
        'p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
        'shadow-lg shadow-gray-100 dark:shadow-gray-900/20',
        'hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 ease-out',
        'motion-reduce:transform-none',
        'ui-card animate-pulse',
        className
      )}
      role="status"
      aria-label="Loading metric card..."
      data-testid={testId}
    >
      {/* Icon placeholder */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton 
          variant="circle" 
          width={24} 
          height={24}
          className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800"
        />
        <Skeleton 
          variant="rectangle" 
          width={20} 
          height={20}
          className="rounded-md"
        />
      </div>
      
      {/* Title */}
      <Skeleton 
        variant="text" 
        width="80%" 
        className="h-4 mb-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200"
      />
      
      {/* Main value */}
      <Skeleton 
        variant="text" 
        width="60%" 
        className="h-8 mb-2 bg-gradient-to-r from-blue-100 via-blue-50 to-blue-100"
      />
      
      {/* Trend/subtitle */}
      <Skeleton 
        variant="text" 
        width="90%" 
        className="h-3 opacity-70"
      />
      
      {/* Status indicator */}
      <div className="flex items-center mt-4 space-x-2">
        <Skeleton 
          variant="circle" 
          width={8} 
          height={8}
          className="bg-green-200 dark:bg-green-800"
        />
        <Skeleton 
          variant="text" 
          width="40%" 
          className="h-3"
        />
      </div>
    </div>
  );
};

// =============================================================================
// DASHBOARD GRID SKELETON
// =============================================================================

export interface DashboardGridSkeletonProps {
  cards?: number;
  className?: string;
  testId?: string;
}

export const DashboardGridSkeleton: React.FC<DashboardGridSkeletonProps> = ({
  cards = 5,
  className,
  testId
}) => {
  return (
    <div 
      className={cx(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6',
        className
      )}
      data-testid={testId}
    >
      {Array.from({ length: cards }).map((_, index) => (
        <MetricsCardSkeleton 
          key={index}
          testId={testId ? `${testId}-card-${index}` : undefined}
        />
      ))}
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

// Types already exported above
export default Loading;