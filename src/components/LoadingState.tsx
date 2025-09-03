/**
 * Universal Loading State Component
 * Ensures 100% identical server/client rendering in ALL contexts
 * Prevents React hydration mismatches through context-aware rendering
 */

'use client';

import React from 'react';

interface LoadingStateProps {
  /**
   * Number of skeleton rows to display
   * @default 5
   */
  rows?: number;
  
  /**
   * Show loading text
   * @default false  
   */
  showText?: boolean;
  
  /**
   * Custom loading text
   * @default "Loading..."
   */
  text?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Size variant for different contexts
   * @default "default"
   */
  size?: 'small' | 'default' | 'large';
  
  /**
   * Test ID for testing
   */
  testId?: string;
  
  /**
   * Context mode for different usage scenarios
   * - 'fullscreen': Full page loading (includes min-h-screen wrapper)
   * - 'inline': Inline loading within existing container
   * @default "fullscreen"
   */
  mode?: 'fullscreen' | 'inline';
}

/**
 * Universal Loading State Component
 * Context-aware rendering prevents hydration mismatches
 */
const LoadingState = React.memo(function LoadingState({
  rows = 5,
  showText = false,
  text = "Loading...",
  className = "",
  size = "default",
  testId = "loading-state",
  mode = "fullscreen"
}: LoadingStateProps) {
  const sizeClasses = {
    small: {
      container: "max-w-sm",
      header: "h-6",
      subheader: "h-3 w-24",
      row: "h-8"
    },
    default: {
      container: "max-w-md",
      header: "h-8", 
      subheader: "h-4 w-32",
      row: "h-12"
    },
    large: {
      container: "max-w-lg",
      header: "h-10",
      subheader: "h-5 w-40", 
      row: "h-16"
    }
  };
  
  const sizes = sizeClasses[size];
  
  // Core loading content - always identical with proper testId handling and fixed dimensions for CLS
  const loadingContent = (
    <div className={`bg-white rounded-lg p-6 sm:p-8 shadow-md max-w-5xl w-full min-h-[400px] ${className}`}>
      <div className="animate-pulse" data-testid={testId || null}>
        {/* Header skeleton - fixed height */}
        <div className={`${sizes.header} bg-gray-200 rounded mb-4 flex-shrink-0`} style={{ minHeight: '32px' }}></div>
        
        {/* Subheader skeleton - fixed width and height */}
        <div className={`${sizes.subheader} bg-gray-200 rounded mx-auto mb-6 flex-shrink-0`} style={{ minHeight: '16px' }}></div>
        
        {/* Loading text (optional) - reserved space */}
        <div className="mb-4 flex-shrink-0" style={{ minHeight: showText ? '20px' : '0px' }}>
          {showText && (
            <div className="text-gray-600 text-sm">
              {text}
            </div>
          )}
        </div>
        
        {/* Skeleton rows - fixed heights to prevent layout shift */}
        <div className="space-y-2">
          {Array.from({ length: rows }, (_, i) => (
            <div 
              key={i} 
              className={`${sizes.row} bg-gray-200 rounded flex-shrink-0`}
              style={{ minHeight: size === 'small' ? '32px' : size === 'large' ? '64px' : '48px' }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
  
  // Context-aware wrapper
  if (mode === 'inline') {
    return loadingContent;
  }
  
  // Fullscreen mode - matches the established HTML pattern used throughout the app with stable layout
  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning={true}>
      <div className="flex items-center justify-center p-4 min-h-screen">
        {loadingContent}
      </div>
    </div>
  );
});

export default LoadingState;

/**
 * Compact Loading State for smaller contexts
 */
export function CompactLoadingState({
  className = "",
  testId = "compact-loading-state"
}: {
  className?: string;
  testId?: string;
}) {
  return (
    <div className={`animate-pulse ${className}`} data-testid={testId || undefined}>
      <div className="h-6 bg-gray-200 rounded mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

/**
 * Inline Loading State for button contexts
 */
export function InlineLoadingState({
  text = "Loading...",
  className = "",
  testId = "inline-loading-state"
}: {
  text?: string;
  className?: string;
  testId?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid={testId || undefined}>
      <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      <span className="text-gray-600 text-sm">{text}</span>
    </div>
  );
}