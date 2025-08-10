'use client';

/**
 * Centralized App State Context
 * 
 * This context provides the unified state management system to all components.
 * It includes debugging utilities and DevTools integration for development.
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { AppStateContextType, AppState } from '@/types/state';
import { useAppStateReducer } from '@/lib/appState';

// Extend Window interface for debugging
declare global {
  interface Window {
    __APP_STATE__?: boolean;
  }
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
  initialState?: Partial<AppState>;
  enableDevTools?: boolean;
}

export function AppStateProvider({ 
  children, 
  initialState,
  enableDevTools = process.env.NODE_ENV === 'development'
}: AppStateProviderProps) {
  console.log('🔄 AppStateProvider initializing...');
  
  const {
    state,
    dispatch,
    selectors,
    actions,
    debug
  } = useAppStateReducer(initialState);
  
  // Add initialization flag to prevent premature hook usage
  const [isProviderReady, setIsProviderReady] = React.useState(false);
  
  React.useEffect(() => {
    setIsProviderReady(true);
    console.log('✅ AppStateProvider fully initialized');
  }, []);

  // Initialize app state on mount
  useEffect(() => {
    if (!state.initialized) {
      dispatch({ type: 'INITIALIZE_APP' });
    }
  }, [state.initialized, dispatch]);

  // DevTools integration (development only)
  useEffect(() => {
    if (enableDevTools && typeof window !== 'undefined') {
      // Expose state management to window for debugging
      (window as any).__APP_STATE__ = {
        getState: () => state,
        dispatch,
        selectors,
        actions,
        debug,
        history: state.history
      };

      // Redux DevTools Extension integration
      if ((window as any).__REDUX_DEVTOOLS_EXTENSION__) {
        const devTools = (window as any).__REDUX_DEVTOOLS_EXTENSION__.connect({
          name: 'Team Availability Tracker',
          features: {
            pause: true,
            lock: true,
            persist: true,
            export: true,
            import: 'custom',
            jump: true,
            skip: true,
            reorder: true,
            dispatch: true,
            test: true
          }
        });

        // Send initial state
        devTools.send({ type: '@@INIT' }, state);

        // Monitor state changes
        const unsubscribe = () => {
          // Clean up subscription
        };

        return unsubscribe;
      }
    }
  }, [state, dispatch, selectors, actions, debug, enableDevTools]);

  // Performance monitoring (development only)
  useEffect(() => {
    if (enableDevTools && state.debugMode) {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        if (renderTime > 16) { // More than one frame (16ms)
          console.warn(`🐌 Slow render detected: ${renderTime.toFixed(2)}ms`);
        }
      };
    }
  });

  // Error boundary for state-related errors
  useEffect(() => {
    if (selectors.hasError()) {
      console.error('🚨 App State Errors:', {
        errors: Object.entries(state.ui.errors)
          .filter(([, error]) => error !== null)
          .reduce((acc, [key, error]) => ({ ...acc, [key]: error }), {}),
        timestamp: new Date().toISOString()
      });
    }
  }, [selectors, state.ui.errors]);

  // Auto-save user preferences to localStorage
  useEffect(() => {
    if (state.initialized && state.user.currentUser) {
      try {
        localStorage.setItem('userPreferences', JSON.stringify(state.user.preferences));
      } catch (error) {
        console.warn('Failed to save user preferences:', error);
      }
    }
  }, [state.initialized, state.user.currentUser, state.user.preferences]);

  // Load user preferences from localStorage
  useEffect(() => {
    if (state.initialized && !state.user.currentUser) {
      try {
        const savedPreferences = localStorage.getItem('userPreferences');
        if (savedPreferences) {
          const preferences = JSON.parse(savedPreferences);
          dispatch({ 
            type: 'UPDATE_USER_PREFERENCES', 
            payload: { preferences } 
          });
        }
      } catch (error) {
        console.warn('Failed to load user preferences:', error);
      }
    }
  }, [state.initialized, state.user.currentUser, dispatch]);

  // Cache invalidation cleanup
  useEffect(() => {
    const cleanup = () => {
      // Clean up any pending timeouts or intervals
      Object.entries(state.cache.policies).forEach(([key, policy]) => {
        const timestamp = state.cache.timestamps[key as keyof typeof state.cache.timestamps];
        if (timestamp && policy.ttl) {
          const age = Date.now() - timestamp.getTime();
          if (age > policy.ttl) {
            dispatch({ 
              type: 'INVALIDATE_CACHE', 
              payload: { key: key as keyof typeof state.cache.invalidation } 
            });
          }
        }
      });
    };

    const interval = setInterval(cleanup, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [state.cache.policies, state.cache.timestamps, dispatch]);

  const contextValue: AppStateContextType = {
    state,
    dispatch,
    selectors,
    actions,
    debug,
    isProviderReady
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
}

// =============================================================================
// CONTEXT HOOK
// =============================================================================

export function useAppState(): AppStateContextType {
  const context = useContext(AppStateContext);
  
  if (context === undefined) {
    // Enhanced error reporting for debugging
    const errorDetails = {
      location: new Error().stack?.split('\n')[2]?.trim() || 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
    };
    
    console.error('🚨 AppStateProvider Context Error:', errorDetails);
    
    // Check if we're in SSR or hydration
    if (typeof window === 'undefined') {
      throw new Error(
        'useAppState called during server-side rendering. ' +
        'This hook can only be used on the client side.'
      );
    }
    
    // Check if we're during React hydration
    if (typeof window !== 'undefined' && !window.__APP_STATE__) {
      console.warn('⚠️ useAppState called before AppStateProvider is fully initialized');
    }
    
    throw new Error(
      `useAppState must be used within an AppStateProvider. ` +
      `Error occurred at: ${errorDetails.location}. ` +
      `Make sure your component is wrapped with <AppStateProvider>. ` +
      `If you're seeing this error, check the component hierarchy and ensure ` +
      `the provider is mounted before this hook is called.`
    );
  }
  
  return context;
}

// =============================================================================
// DEBUGGING UTILITIES
// =============================================================================

export function useStateDebugger() {
  const { state, debug, selectors } = useAppState();

  return {
    // State inspection
    inspectState: () => {
      console.group('🔍 App State Inspector');
      console.log('Current State:', state);
      console.log('Loading States:', state.ui.loading);
      console.log('Error States:', state.ui.errors);
      console.log('Modal States:', state.ui.modals);
      console.log('Navigation State:', state.ui.navigation);
      console.log('User State:', state.user);
      console.log('Cache State:', state.cache);
      console.groupEnd();
    },

    // Performance analysis
    analyzePerformance: () => {
      const loadTimes = state.data.dashboards.performanceData.loadTimes;
      const errorRates = state.data.dashboards.performanceData.errorRates;
      
      console.group('⚡ Performance Analysis');
      console.log('Load Times:', loadTimes);
      console.log('Error Rates:', errorRates);
      console.log('User Interactions:', state.data.dashboards.performanceData.userInteractions.slice(-10));
      console.groupEnd();
    },

    // State history
    showHistory: (limit = 10) => {
      console.group(`📋 State History (last ${limit})`);
      state.history.slice(-limit).forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.action} - ${entry.timestamp.toISOString()}`);
      });
      console.groupEnd();
    },

    // Cache analysis
    analyzeCaches: () => {
      console.group('💾 Cache Analysis');
      console.log('Timestamps:', state.cache.timestamps);
      console.log('Invalidation Flags:', state.cache.invalidation);
      console.log('Policies:', state.cache.policies);
      
      // Calculate cache ages
      const now = Date.now();
      const cacheAges = Object.entries(state.cache.timestamps).reduce((acc, [key, timestamp]) => {
        if (timestamp) {
          acc[key] = `${Math.round((now - timestamp.getTime()) / 1000)}s ago`;
        } else {
          acc[key] = 'never';
        }
        return acc;
      }, {} as Record<string, string>);
      
      console.log('Cache Ages:', cacheAges);
      console.groupEnd();
    },

    // Export/Import utilities
    exportState: debug.exportState,
    importState: debug.importState,
    clearHistory: debug.clearHistory,

    // Quick selectors for debugging
    selectors: {
      isAnyLoading: () => selectors.isLoading(),
      hasAnyErrors: () => selectors.hasError(),
      getActiveModals: () => Object.entries(state.ui.modals)
        .filter(([, modal]) => modal.isOpen)
        .map(([name]) => name),
      getCurrentUserType: () => selectors.getUserType(),
      getTeamCount: () => selectors.getTeams().length,
      getNotificationCount: () => selectors.getActiveNotifications().length
    }
  };
}

// =============================================================================
// DEVELOPMENT UTILITIES
// =============================================================================

export function useDevMode() {
  const { state, dispatch } = useAppState();

  return {
    isEnabled: state.debugMode,
    toggle: () => dispatch({ type: 'TOGGLE_DEBUG_MODE' }),
    reset: () => dispatch({ type: 'RESET_STATE' }),
    version: state.version,
    initialized: state.initialized
  };
}

// Error Boundary for State Context
export class AppStateErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 App State Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Application State Error
            </h2>
            <p className="text-gray-600 mb-4">
              Something went wrong with the application state management.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}