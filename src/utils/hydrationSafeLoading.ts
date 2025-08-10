/**
 * Hydration Safe Loading Utilities
 * 
 * Utilities to help prevent hydration mismatch errors in loading states
 * and ensure consistent server/client rendering.
 */

import { useEffect, useState } from 'react';

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to detect when component has mounted on client-side
 * Useful for preventing hydration mismatches
 */
export const useIsomorphicEffect = (
  effect: () => void | (() => void),
  deps?: React.DependencyList
) => {
  useEffect(effect, deps);
};

/**
 * Hook to safely detect client-side mounting
 * Returns true only after component has hydrated
 */
export const useClientSideMount = () => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  return isMounted;
};

/**
 * Hook for hydration-safe loading states
 * Provides consistent loading experience across SSR/CSR
 */
export const useHydrationSafeLoading = (isLoading: boolean) => {
  const [clientLoading, setClientLoading] = useState(isLoading);
  const isMounted = useClientSideMount();
  
  useEffect(() => {
    if (isMounted) {
      setClientLoading(isLoading);
    }
  }, [isLoading, isMounted]);
  
  return {
    isLoading: clientLoading,
    isMounted,
    // For server-side, always show loading
    serverLoading: true,
    // For client-side, show actual loading state
    clientLoading: isMounted ? isLoading : true
  };
};

// =============================================================================
// COMPONENT PATTERNS
// =============================================================================

export interface LoadingStatePattern {
  server: () => React.ReactElement;
  client: () => React.ReactElement;
  fallback?: () => React.ReactElement;
}

/**
 * Creates a loading pattern that's consistent across server/client
 */
export const createHydrationSafePattern = (pattern: LoadingStatePattern) => {
  return function HydrationSafeLoadingComponent({ 
    isLoading, 
    children,
    testId 
  }: { 
    isLoading: boolean; 
    children: React.ReactNode;
    testId?: string;
  }) {
    const isMounted = useClientSideMount();
    
    if (isLoading) {
      // Server-side: use server pattern
      if (!isMounted) {
        return <div suppressHydrationWarning data-testid={testId}>{pattern.server()}</div>;
      }
      
      // Client-side: use client pattern
      return <div data-testid={testId}>{pattern.client()}</div>;
    }
    
    return <>{children}</>;
  };
};

// =============================================================================
// COMMON PATTERNS
// =============================================================================

/**
 * Dashboard loading pattern
 */
export const DashboardLoadingPattern = createHydrationSafePattern({
  server: () => (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-lg"></div>
    </div>
  ),
  client: () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-gray-600">Loading dashboard...</span>
      </div>
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  )
});

/**
 * Table loading pattern
 */
export const TableLoadingPattern = createHydrationSafePattern({
  server: () => (
    <div className="animate-pulse">
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-4 bg-gray-200 rounded"></div>
        ))}
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="grid grid-cols-4 gap-4 mb-3">
          {[1, 2, 3, 4].map(j => (
            <div key={j} className="h-3 bg-gray-200 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  ),
  client: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Loading table data...</span>
      </div>
      <div className="animate-pulse">
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="grid grid-cols-4 gap-4 mb-3">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="h-3 bg-gray-200 rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
});

/**
 * Card loading pattern
 */
export const CardLoadingPattern = createHydrationSafePattern({
  server: () => (
    <div className="animate-pulse space-y-4">
      <div className="flex items-start space-x-4">
        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  ),
  client: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-5 h-5 border border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
      <div className="animate-pulse space-y-4">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  )
});

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates that loading states won't cause hydration mismatches
 */
export const validateHydrationSafety = {
  /**
   * Checks if a component is using hydration-unsafe patterns
   */
  checkLoadingPattern: (componentCode: string): { 
    isHydrationSafe: boolean; 
    issues: string[]; 
    suggestions: string[];
  } => {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check for animate-spin without server fallback
    if (componentCode.includes('animate-spin') && !componentCode.includes('suppressHydrationWarning')) {
      issues.push('Found animate-spin without hydration warning suppression');
      suggestions.push('Add suppressHydrationWarning or use server-safe fallback');
    }
    
    // Check for conditional rendering based on mounted state
    if (!componentCode.includes('useEffect') && componentCode.includes('animate-spin')) {
      issues.push('Loading component may render differently on server vs client');
      suggestions.push('Use useClientSideMount hook for consistent rendering');
    }
    
    // Check for icons in loading states
    if (componentCode.includes('lucide-react') && componentCode.includes('loading')) {
      issues.push('Using icons in loading states can cause hydration mismatches');
      suggestions.push('Use CSS-only loading animations for server-safe rendering');
    }
    
    return {
      isHydrationSafe: issues.length === 0,
      issues,
      suggestions
    };
  },
  
  /**
   * Suggests improvements for hydration safety
   */
  suggestImprovements: (issues: string[]): string[] => {
    return [
      'Use ConsistentLoader component for all loading states',
      'Add suppressHydrationWarning for client-only content',
      'Use CSS animations instead of SVG icons for loading',
      'Implement server-safe fallbacks for all loading variants',
      'Use useClientSideMount hook to detect hydration completion'
    ];
  }
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  useClientSideMount as useIsHydrated,
  useHydrationSafeLoading,
  createHydrationSafePattern
};

export default {
  useClientSideMount,
  useHydrationSafeLoading,
  createHydrationSafePattern,
  DashboardLoadingPattern,
  TableLoadingPattern,
  CardLoadingPattern,
  validateHydrationSafety
};