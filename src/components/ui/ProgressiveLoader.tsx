/**
 * Progressive Loading Component
 * 
 * A sophisticated loading system that reveals content progressively,
 * providing smooth transitions and optimistic updates for better UX.
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { cx } from '@/design-system/theme';
import { Skeleton, MetricsCardSkeleton, LoadingTable } from './Loading';

// =============================================================================
// TYPES
// =============================================================================

export interface ProgressiveLoaderProps {
  children: ReactNode;
  isLoading: boolean;
  skeleton?: 'cards' | 'table' | 'custom';
  skeletonProps?: {
    cards?: number;
    rows?: number;
    columns?: number;
  };
  customSkeleton?: ReactNode;
  loadingStages?: string[];
  currentStage?: number;
  className?: string;
  testId?: string;
}

export interface ContentRevealProps {
  children: ReactNode;
  isVisible: boolean;
  delay?: number;
  animation?: 'fadeIn' | 'slideUp' | 'scaleIn';
  duration?: number;
  className?: string;
}

export interface OptimisticUpdateProps<T = any> {
  children: (data: T, isOptimistic: boolean) => ReactNode;
  data: T | null;
  optimisticData?: T;
  isLoading: boolean;
  className?: string;
}

// =============================================================================
// CONTENT REVEAL COMPONENT
// =============================================================================

export const ContentReveal: React.FC<ContentRevealProps> = ({
  children,
  isVisible,
  delay = 0,
  animation = 'fadeIn',
  duration = 300,
  className
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setShouldRender(true);
        setIsAnimating(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, delay, duration]);

  if (!shouldRender) return null;

  const animationClasses = {
    fadeIn: 'animate-fadeIn',
    slideUp: 'animate-slideUp',
    scaleIn: 'animate-scaleIn'
  };

  return (
    <div
      className={cx(
        'transition-all ease-out',
        isAnimating ? animationClasses[animation] : 'opacity-0',
        'motion-reduce:transition-none motion-reduce:animate-none',
        className
      )}
      style={{
        animationDuration: `${duration}ms`,
        animationFillMode: 'both'
      }}
    >
      {children}
    </div>
  );
};

// =============================================================================
// PROGRESSIVE LOADER COMPONENT
// =============================================================================

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  children,
  isLoading,
  skeleton = 'cards',
  skeletonProps = {},
  customSkeleton,
  loadingStages = [],
  currentStage = 0,
  className,
  testId
}) => {
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [isLoading, hasLoaded]);

  const renderSkeleton = () => {
    if (customSkeleton) return customSkeleton;

    switch (skeleton) {
      case 'cards':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {Array.from({ length: skeletonProps.cards || 5 }).map((_, index) => (
              <ContentReveal
                key={index}
                isVisible={isLoading}
                delay={index * 150}
                animation="slideUp"
              >
                <MetricsCardSkeleton />
              </ContentReveal>
            ))}
          </div>
        );
      case 'table':
        return (
          <ContentReveal isVisible={isLoading} animation="fadeIn">
            <LoadingTable
              rows={skeletonProps.rows || 5}
              columns={skeletonProps.columns || 4}
            />
          </ContentReveal>
        );
      default:
        return (
          <ContentReveal isVisible={isLoading} animation="fadeIn">
            <Skeleton width="100%" height={200} />
          </ContentReveal>
        );
    }
  };

  const renderStageIndicator = () => {
    if (loadingStages.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-center space-x-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {loadingStages[currentStage] || 'Loading...'}
          </div>
          <div className="flex space-x-1">
            {loadingStages.map((_, index) => (
              <div
                key={index}
                className={cx(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  index <= currentStage
                    ? 'bg-blue-500 scale-110'
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
              />
            ))}
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-1 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((currentStage + 1) / loadingStages.length) * 100}%`
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cx('relative', className)} data-testid={testId}>
      {/* Loading state with skeleton and progress indicator */}
      {isLoading && (
        <div className="space-y-6">
          {renderStageIndicator()}
          {renderSkeleton()}
        </div>
      )}

      {/* Content with reveal animation */}
      <ContentReveal
        isVisible={!isLoading}
        delay={100}
        animation="slideUp"
        duration={400}
      >
        {children}
      </ContentReveal>
    </div>
  );
};

// =============================================================================
// OPTIMISTIC UPDATE COMPONENT
// =============================================================================

export const OptimisticUpdate: React.FC<OptimisticUpdateProps> = ({
  children,
  data,
  optimisticData,
  isLoading,
  className
}) => {
  const [showOptimistic, setShowOptimistic] = useState(false);

  useEffect(() => {
    if (isLoading && optimisticData) {
      setShowOptimistic(true);
    } else if (!isLoading) {
      setShowOptimistic(false);
    }
  }, [isLoading, optimisticData]);

  const currentData = showOptimistic && optimisticData ? optimisticData : data;
  const isOptimistic = showOptimistic && !!optimisticData;

  return (
    <div className={cx('relative', className)}>
      {/* Optimistic update indicator */}
      {isOptimistic && (
        <div className="absolute top-0 right-0 z-10">
          <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 border border-yellow-200 rounded-full text-xs font-medium text-yellow-800">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span>Saving...</span>
          </div>
        </div>
      )}

      {/* Content with subtle opacity during optimistic updates */}
      <div className={cx(
        'transition-opacity duration-200',
        isOptimistic ? 'opacity-80' : 'opacity-100'
      )}>
        {children(currentData, isOptimistic)}
      </div>
    </div>
  );
};

// =============================================================================
// STAGGERED REVEAL COMPONENT
// =============================================================================

export interface StaggeredRevealProps {
  children: ReactNode[];
  isVisible: boolean;
  staggerDelay?: number;
  animation?: 'fadeIn' | 'slideUp' | 'scaleIn';
  className?: string;
}

export const StaggeredReveal: React.FC<StaggeredRevealProps> = ({
  children,
  isVisible,
  staggerDelay = 100,
  animation = 'slideUp',
  className
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <ContentReveal
          key={index}
          isVisible={isVisible}
          delay={index * staggerDelay}
          animation={animation}
        >
          {child}
        </ContentReveal>
      ))}
    </div>
  );
};

// =============================================================================
// LOADING SHIMMER COMPONENT
// =============================================================================

export interface LoadingShimmerProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'rectangle' | 'circle';
}

export const LoadingShimmer: React.FC<LoadingShimmerProps> = ({
  width = '100%',
  height = 16,
  className,
  variant = 'rectangle'
}) => {
  const baseClasses = cx(
    'relative overflow-hidden bg-gray-200 dark:bg-gray-700',
    'before:absolute before:inset-0',
    'before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent',
    'dark:before:via-gray-500',
    'before:opacity-60 before:animate-shimmer',
    variant === 'circle' ? 'rounded-full' : '',
    variant === 'rectangle' ? 'rounded-md' : '',
    variant === 'text' ? 'rounded-sm' : '',
    className
  );

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  return <div className={baseClasses} style={style} />;
};

// =============================================================================
// HOOKS
// =============================================================================

export const useProgressiveLoading = (stages: string[]) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const nextStage = () => {
    setCurrentStage(prev => {
      const next = prev + 1;
      if (next >= stages.length) {
        setIsComplete(true);
        return prev;
      }
      return next;
    });
  };

  const reset = () => {
    setCurrentStage(0);
    setIsComplete(false);
  };

  return {
    currentStage,
    isComplete,
    nextStage,
    reset,
    progress: ((currentStage + 1) / stages.length) * 100
  };
};

// =============================================================================
// EXPORTS
// =============================================================================

export default ProgressiveLoader;