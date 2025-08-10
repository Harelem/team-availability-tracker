'use client';

import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface MobileLoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'refresh' | 'dots';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

// Optimized loading dots animation
const LoadingDots: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const dotSizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  };

  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${dotSizes[size]} bg-blue-500 rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
};

// Skeleton loading for mobile cards
export const MobileCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mobile-card">
          <div className="mobile-card-header">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="text-right">
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="text-center">
                <div className="w-4 h-4 bg-gray-200 rounded-full mx-auto mb-1"></div>
                <div className="h-4 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded mb-3"></div>
          <div className="h-9 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
};

// Main mobile loading spinner component
export default function MobileLoadingSpinner({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
  className = ''
}: MobileLoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const containerClass = fullScreen 
    ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center'
    : 'flex items-center justify-center py-8';

  const renderSpinner = () => {
    switch (variant) {
      case 'refresh':
        return (
          <RefreshCw 
            className={`${sizeClasses[size]} text-blue-500 animate-spin`}
            aria-hidden="true"
          />
        );
      case 'dots':
        return <LoadingDots size={size} />;
      default:
        return (
          <Loader2 
            className={`${sizeClasses[size]} text-blue-500 animate-spin`}
            aria-hidden="true"
          />
        );
    }
  };

  return (
    <div className={`${containerClass} ${className}`} role="status" aria-label={text || 'Loading'}>
      <div className="flex flex-col items-center gap-3">
        {renderSpinner()}
        {text && (
          <p className={`${textSizes[size]} text-gray-600 font-medium text-center`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

// Optimized loading states for different mobile contexts
export const MobileLoadingStates = {
  // Page loading
  PageLoading: () => (
    <MobileLoadingSpinner 
      variant="spinner" 
      size="lg" 
      text="Loading dashboard..." 
      fullScreen 
    />
  ),

  // Data refreshing
  DataRefreshing: () => (
    <MobileLoadingSpinner 
      variant="refresh" 
      size="md" 
      text="Refreshing data..." 
    />
  ),

  // Inline loading
  InlineLoading: () => (
    <MobileLoadingSpinner 
      variant="dots" 
      size="sm" 
    />
  ),

  // Team data loading
  TeamDataLoading: () => (
    <div className="mobile-card text-center py-8">
      <MobileLoadingSpinner 
        variant="spinner" 
        size="md" 
        text="Loading team data..." 
      />
    </div>
  ),

  // Navigation loading
  NavigationLoading: () => (
    <div className="flex items-center justify-center p-2">
      <MobileLoadingSpinner 
        variant="dots" 
        size="sm" 
      />
    </div>
  )
};

// Hook for managing loading states
export const useLoadingStates = () => {
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
  };

  const isLoading = (key: string) => loadingStates[key] || false;

  const isAnyLoading = () => Object.values(loadingStates).some(Boolean);

  return {
    setLoading,
    isLoading,
    isAnyLoading,
    loadingStates
  };
};