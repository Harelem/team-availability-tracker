/**
 * Enhanced Skeleton Component
 * 
 * Professional skeleton loading states with smooth animations and
 * content-aware shapes for better user experience.
 */

import React from 'react';
import { cx } from '@/design-system/theme';
import { designTokens } from '@/design-system/tokens';

// =============================================================================
// TYPES
// =============================================================================

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangle' | 'circle' | 'rounded' | 'avatar' | 'button' | 'card';
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
  testId?: string;
}

export interface SkeletonGroupProps {
  children: React.ReactNode;
  loading?: boolean;
  fallback?: React.ReactNode;
  className?: string;
}

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  variant = 'rectangle',
  animation = 'wave',
  className,
  testId
}) => {
  // Base skeleton styles
  const baseClasses = cx(
    'bg-gray-200 dark:bg-gray-700',
    animation === 'pulse' && 'animate-pulse',
    animation === 'wave' && 'relative overflow-hidden'
  );

  // Variant-specific styles
  const variantClasses = {
    text: 'rounded-sm',
    rectangle: 'rounded-md',
    rounded: 'rounded-lg',
    circle: 'rounded-full',
    avatar: 'rounded-full',
    button: 'rounded-lg',
    card: 'rounded-xl'
  };

  // Dimension styles based on variant
  const getDimensions = () => {
    const style: React.CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height
    };

    switch (variant) {
      case 'text':
        return { ...style, height: '1rem' };
      case 'avatar':
        return { 
          width: height, 
          height: height,
          minWidth: height,
          minHeight: height 
        };
      case 'button':
        return { ...style, height: height || '2.5rem' };
      case 'card':
        return { ...style, minHeight: '8rem' };
      default:
        return style;
    }
  };

  const skeletonClasses = cx(
    baseClasses,
    variantClasses[variant],
    className
  );

  return (
    <div
      className={skeletonClasses}
      style={getDimensions()}
      data-testid={testId}
      aria-label="Loading..."
      role="status"
    >
      {animation === 'wave' && (
        <div
          className={cx(
            'absolute inset-0 -translate-x-full',
            'bg-gradient-to-r from-transparent via-white/30 to-transparent',
            'dark:via-white/10',
            'animate-[shimmer_1.5s_ease-in-out_infinite]'
          )}
          style={{
            animation: 'shimmer 1.5s ease-in-out infinite'
          }}
        />
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// =============================================================================
// SKELETON GROUP COMPONENT
// =============================================================================

export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  children,
  loading = true,
  fallback,
  className
}) => {
  if (!loading) {
    return <>{children}</>;
  }

  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  return <div className={className}>{children}</div>;
};

// =============================================================================
// PRE-BUILT SKELETON PATTERNS
// =============================================================================

export const MetricCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cx('p-6 space-y-4', className)}>
    <div className="flex items-center justify-between">
      <Skeleton variant="circle" width="2.5rem" height="2.5rem" />
      <Skeleton variant="rectangle" width="4rem" height="1.5rem" />
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="100%" height="2rem" />
      <Skeleton variant="text" width="40%" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ columns?: number; className?: string }> = ({ 
  columns = 4, 
  className 
}) => (
  <tr className={className}>
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <Skeleton variant="text" width={index === 0 ? '80%' : '60%'} />
      </td>
    ))}
  </tr>
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cx('p-6 space-y-4', className)}>
    <div className="flex items-center space-x-3">
      <Skeleton variant="avatar" width="2.5rem" height="2.5rem" />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="60%" />
    </div>
  </div>
);

export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cx('space-y-6', className)}>
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton variant="text" width="12rem" height="2rem" />
        <Skeleton variant="text" width="8rem" />
      </div>
      <Skeleton variant="button" width="8rem" />
    </div>
    
    {/* Metrics grid skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <MetricCardSkeleton />
        </div>
      ))}
    </div>
    
    {/* Content area skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Skeleton variant="card" height="20rem" />
        <Skeleton variant="card" height="16rem" />
      </div>
      <div className="space-y-4">
        <Skeleton variant="card" height="12rem" />
        <Skeleton variant="card" height="24rem" />
      </div>
    </div>
  </div>
);

// =============================================================================
// CSS KEYFRAMES (to be added to global CSS)
// =============================================================================

export const skeletonStyles = `
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.skeleton-shimmer {
  position: relative;
  overflow: hidden;
}

.skeleton-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  transform: translateX(-100%);
  animation: shimmer 1.5s ease-in-out infinite;
}

.dark .skeleton-shimmer::after {
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
}
`;

// =============================================================================
// EXPORTS
// =============================================================================

export default Skeleton;
export { MetricCardSkeleton, TableRowSkeleton, CardSkeleton, DashboardSkeleton };