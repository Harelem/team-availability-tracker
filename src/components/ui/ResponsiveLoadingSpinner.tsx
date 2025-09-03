/**
 * Responsive Loading Spinner Component
 * 
 * A comprehensive loading spinner system optimized for mobile interactions
 * with haptic feedback, progress indicators, and accessibility features.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { cx } from '@/design-system/theme';

// =============================================================================
// TYPES
// =============================================================================

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'default' | 'dots' | 'pulse' | 'progress' | 'orbit';
export type SpinnerColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'white';

export interface ResponsiveLoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  color?: SpinnerColor;
  message?: string;
  showProgress?: boolean;
  progress?: number;
  showTimer?: boolean;
  estimatedDuration?: number;
  enableHaptics?: boolean;
  className?: string;
  'aria-label'?: string;
  testId?: string;
  onTimeout?: () => void;
  timeoutMs?: number;
}

export interface LoadingOverlayProps extends ResponsiveLoadingSpinnerProps {
  isVisible: boolean;
  backdrop?: boolean;
  blurBackground?: boolean;
  preventInteraction?: boolean;
  children?: React.ReactNode;
}

// =============================================================================
// RESPONSIVE LOADING SPINNER COMPONENT
// =============================================================================

export const ResponsiveLoadingSpinner: React.FC<ResponsiveLoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  color = 'primary',
  message,
  showProgress = false,
  progress = 0,
  showTimer = false,
  estimatedDuration,
  enableHaptics = true,
  className,
  'aria-label': ariaLabel,
  testId,
  onTimeout,
  timeoutMs = 30000
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Timer functionality
  useEffect(() => {
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);
      
      if (elapsed >= timeoutMs && !isTimedOut) {
        setIsTimedOut(true);
        onTimeout?.();
        
        // Haptic feedback for timeout
        if (enableHaptics && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    }, 100);

    // Initial haptic feedback
    if (enableHaptics && 'vibrate' in navigator) {
      navigator.vibrate(25);
    }

    return () => clearInterval(interval);
  }, [timeoutMs, isTimedOut, onTimeout, enableHaptics]);

  // =============================================================================
  // STYLES
  // =============================================================================

  const sizeClasses = {
    xs: {
      spinner: 'w-4 h-4',
      dots: 'w-1.5 h-1.5',
      text: 'text-xs',
      gap: 'gap-1'
    },
    sm: {
      spinner: 'w-5 h-5',
      dots: 'w-2 h-2',
      text: 'text-sm',
      gap: 'gap-1.5'
    },
    md: {
      spinner: 'w-6 h-6',
      dots: 'w-2.5 h-2.5',
      text: 'text-base',
      gap: 'gap-2'
    },
    lg: {
      spinner: 'w-8 h-8',
      dots: 'w-3 h-3',
      text: 'text-lg',
      gap: 'gap-3'
    },
    xl: {
      spinner: 'w-12 h-12',
      dots: 'w-4 h-4',
      text: 'text-xl',
      gap: 'gap-4'
    }
  };

  const colorClasses = {
    primary: {
      spinner: 'border-blue-600 border-t-transparent',
      dots: 'bg-blue-600',
      text: 'text-blue-600',
      progress: 'bg-blue-600'
    },
    secondary: {
      spinner: 'border-gray-600 border-t-transparent',
      dots: 'bg-gray-600',
      text: 'text-gray-600',
      progress: 'bg-gray-600'
    },
    success: {
      spinner: 'border-green-600 border-t-transparent',
      dots: 'bg-green-600',
      text: 'text-green-600',
      progress: 'bg-green-600'
    },
    warning: {
      spinner: 'border-yellow-600 border-t-transparent',
      dots: 'bg-yellow-600',
      text: 'text-yellow-600',
      progress: 'bg-yellow-600'
    },
    error: {
      spinner: 'border-red-600 border-t-transparent',
      dots: 'bg-red-600',
      text: 'text-red-600',
      progress: 'bg-red-600'
    },
    white: {
      spinner: 'border-white border-t-transparent',
      dots: 'bg-white',
      text: 'text-white',
      progress: 'bg-white'
    }
  };

  const sizeConfig = sizeClasses[size];
  const colorConfig = colorClasses[color];

  // =============================================================================
  // SPINNER VARIANTS
  // =============================================================================

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={cx('flex items-center', sizeConfig.gap)}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={cx(
                  sizeConfig.dots,
                  colorConfig.dots,
                  'rounded-full animate-bounce'
                )}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div className={cx(
            sizeConfig.spinner,
            colorConfig.dots,
            'rounded-full animate-pulse opacity-75'
          )} />
        );

      case 'progress':
        return (
          <div className={cx('relative', sizeConfig.spinner)}>
            <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
            <div 
              className={cx(
                'absolute inset-0 rounded-full border-2 border-t-transparent transition-all duration-300',
                colorConfig.spinner
              )}
              style={{
                transform: `rotate(${(progress / 100) * 360}deg)`
              }}
            />
            {showProgress && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cx('font-bold text-xs', colorConfig.text)}>
                  {Math.round(progress)}%
                </span>
              </div>
            )}
          </div>
        );

      case 'orbit':
        return (
          <div className={cx('relative', sizeConfig.spinner)}>
            <div className={cx(
              'absolute inset-0 rounded-full border border-gray-200'
            )} />
            <div className={cx(
              'absolute top-0 left-1/2 w-1 h-1 -translate-x-1/2 rounded-full animate-spin origin-center',
              colorConfig.dots
            )}
            style={{
              transformOrigin: `50% ${parseInt(sizeConfig.spinner.split('w-')[1]) * 4}px`
            }}
            />
          </div>
        );

      default: // 'default'
        return (
          <div
            className={cx(
              sizeConfig.spinner,
              'border-2 rounded-full animate-spin',
              colorConfig.spinner
            )}
            style={{
              animation: 'spin 1s linear infinite'
            }}
          />
        );
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center',
        sizeConfig.gap,
        className
      )}
      data-testid={testId}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel || message || 'Loading...'}
    >
      {/* Spinner */}
      <div className="relative">
        {renderSpinner()}
        
        {/* Timeout indicator */}
        {isTimedOut && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-ping" />
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={cx('text-center font-medium', sizeConfig.text, colorConfig.text)}>
          {isTimedOut ? `${message} (taking longer than expected)` : message}
        </div>
      )}

      {/* Progress bar */}
      {showProgress && variant !== 'progress' && (
        <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cx('h-full rounded-full transition-all duration-300', colorConfig.progress)}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      {/* Timer */}
      {showTimer && (
        <div className={cx('text-center opacity-75', sizeConfig.text, colorConfig.text)}>
          {formatTime(elapsedTime)}
          {estimatedDuration && elapsedTime < estimatedDuration && (
            <span> / ~{formatTime(estimatedDuration)}</span>
          )}
        </div>
      )}

      {/* Screen reader text */}
      <span className="sr-only">
        {message || 'Loading content, please wait'}
        {showProgress && `, ${Math.round(progress)}% complete`}
        {isTimedOut && ', taking longer than expected'}
      </span>
    </div>
  );
};

// =============================================================================
// LOADING OVERLAY COMPONENT
// =============================================================================

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  backdrop = true,
  blurBackground = true,
  preventInteraction = true,
  children,
  ...spinnerProps
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={cx(
        'fixed inset-0 z-50 flex items-center justify-center',
        backdrop && 'bg-black bg-opacity-50',
        blurBackground && 'backdrop-blur-sm',
        preventInteraction && 'pointer-events-auto',
        'transition-all duration-200 animate-in fade-in'
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
    >
      <div className="relative">
        {/* Loading content */}
        <div className="bg-white rounded-lg shadow-xl p-6 mx-4 max-w-sm w-full">
          <ResponsiveLoadingSpinner {...spinnerProps} />
          {children}
        </div>

        {/* Escape hint for mobile */}
        {preventInteraction && (
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
            <div className="text-white text-xs opacity-75 text-center">
              Please wait...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// HOOKS
// =============================================================================

export interface UseLoadingSpinnerReturn {
  isLoading: boolean;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  updateProgress: (progress: number) => void;
  updateMessage: (message: string) => void;
  progress: number;
  message: string;
}

export const useLoadingSpinner = (
  initialMessage = 'Loading...'
): UseLoadingSpinnerReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(initialMessage);

  const startLoading = (loadingMessage?: string) => {
    setIsLoading(true);
    setProgress(0);
    if (loadingMessage) setMessage(loadingMessage);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setProgress(0);
  };

  const updateProgress = (newProgress: number) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
  };

  const updateMessage = (newMessage: string) => {
    setMessage(newMessage);
  };

  return {
    isLoading,
    startLoading,
    stopLoading,
    updateProgress,
    updateMessage,
    progress,
    message
  };
};

// =============================================================================
// PRESETS
// =============================================================================

export const LoadingSpinnerPresets = {
  Mobile: {
    size: 'lg' as SpinnerSize,
    variant: 'default' as SpinnerVariant,
    enableHaptics: true,
    showTimer: true,
    timeoutMs: 15000
  },
  
  Desktop: {
    size: 'md' as SpinnerSize,
    variant: 'default' as SpinnerVariant,
    enableHaptics: false,
    showTimer: false,
    timeoutMs: 30000
  },
  
  Inline: {
    size: 'sm' as SpinnerSize,
    variant: 'dots' as SpinnerVariant,
    enableHaptics: false,
    showTimer: false
  },
  
  Button: {
    size: 'xs' as SpinnerSize,
    variant: 'default' as SpinnerVariant,
    color: 'white' as SpinnerColor,
    enableHaptics: false
  },
  
  Progress: {
    size: 'lg' as SpinnerSize,
    variant: 'progress' as SpinnerVariant,
    showProgress: true,
    enableHaptics: true
  }
};

export default ResponsiveLoadingSpinner;