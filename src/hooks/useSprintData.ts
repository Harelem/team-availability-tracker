/**
 * Sprint Data React Hooks
 * 
 * Easy-to-use hooks for accessing sprint data across components.
 * Provides consistent, cached, and automatically updated sprint information.
 * Eliminates duplicate sprint data fetching and state management.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CurrentGlobalSprint } from '@/types';
import { sprintDataHandler, SprintDataResult } from '@/lib/SprintDataHandler';
import { debug, warn } from '@/utils/debugLogger';

export interface UseSprintDataOptions {
  /**
   * Auto-refresh interval in milliseconds
   * Set to 0 to disable auto-refresh
   * Default: 5 minutes (300000ms)
   */
  refreshInterval?: number;
  
  /**
   * Whether to initialize sprint settings if they don't exist
   * Default: true
   */
  autoInitialize?: boolean;
  
  /**
   * Whether to automatically invalidate cache on focus
   * Default: true
   */
  refreshOnFocus?: boolean;

  /**
   * Whether to show warnings in console
   * Default: false (only in development)
   */
  debugMode?: boolean;
}

export interface SprintDataHookResult {
  /** Current sprint data (guaranteed to be available) */
  sprint: CurrentGlobalSprint | null;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: string | null;
  
  /** Data source (database, smart_detection, or emergency_default) */
  source: 'database' | 'smart_detection' | 'emergency_default';
  
  /** Whether data came from cache */
  cached: boolean;
  
  /** Warnings from sprint data retrieval */
  warnings: string[];
  
  /** Force refresh sprint data */
  refresh: () => Promise<void>;
  
  /** Invalidate cache and refresh */
  invalidateAndRefresh: () => Promise<void>;
  
  /** Health check result */
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'checking';
}

const DEFAULT_OPTIONS: UseSprintDataOptions = {
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  autoInitialize: true,
  refreshOnFocus: true,
  debugMode: process.env.NODE_ENV === 'development'
};

/**
 * Main hook for accessing sprint data
 */
export function useSprintData(options: UseSprintDataOptions = {}): SprintDataHookResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [sprint, setSprint] = useState<CurrentGlobalSprint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'database' | 'smart_detection' | 'emergency_default'>('database');
  const [cached, setCached] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'degraded' | 'unhealthy' | 'checking'>('checking');
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializationRef = useRef<Promise<void> | null>(null);

  /**
   * Fetch sprint data and update state
   */
  const fetchSprintData = useCallback(async (): Promise<void> => {
    if (opts.debugMode) {
      debug('🔄 useSprintData: Fetching sprint data');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Initialize sprint settings if needed
      if (opts.autoInitialize && !initializationRef.current) {
        initializationRef.current = sprintDataHandler.initializeSprintSettings().then(() => {
          if (opts.debugMode) {
            debug('✅ Sprint settings initialization completed');
          }
        });
      }
      
      if (initializationRef.current) {
        await initializationRef.current;
      }

      // Fetch sprint data
      const result: SprintDataResult = await sprintDataHandler.getCurrentSprint();
      
      if (result.success && result.sprint) {
        setSprint(result.sprint);
        setSource(result.source);
        setCached(result.cached);
        setWarnings(result.warnings);
        setError(null);
        
        if (opts.debugMode && result.warnings.length > 0) {
          warn('Sprint data warnings:', result.warnings);
        }
        
        if (opts.debugMode) {
          debug(`✅ Sprint data loaded from ${result.source} (cached: ${result.cached})`);
        }
      } else {
        setError('Failed to load sprint data');
        setWarnings(result.warnings);
        
        if (opts.debugMode) {
          warn('Failed to load sprint data:', result.errors);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      if (opts.debugMode) {
        warn('Error in useSprintData:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [opts.autoInitialize, opts.debugMode]);

  /**
   * Force refresh sprint data
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchSprintData();
  }, [fetchSprintData]);

  /**
   * Invalidate cache and refresh
   */
  const invalidateAndRefresh = useCallback(async (): Promise<void> => {
    sprintDataHandler.invalidateCache();
    await fetchSprintData();
  }, [fetchSprintData]);

  /**
   * Check health status
   */
  const checkHealth = useCallback(async (): Promise<void> => {
    try {
      const health = await sprintDataHandler.healthCheck();
      setHealthStatus(health.status);
    } catch (err) {
      setHealthStatus('unhealthy');
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchSprintData();
    checkHealth();
  }, [fetchSprintData, checkHealth]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (opts.refreshInterval && opts.refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (!document.hidden) { // Only refresh when tab is visible
          fetchSprintData();
        }
      }, opts.refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [opts.refreshInterval, fetchSprintData]);

  // Refresh on window focus
  useEffect(() => {
    if (!opts.refreshOnFocus) return;

    const handleFocus = () => {
      fetchSprintData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [opts.refreshOnFocus, fetchSprintData]);

  return {
    sprint,
    isLoading,
    error,
    source,
    cached,
    warnings,
    refresh,
    invalidateAndRefresh,
    healthStatus
  };
}

/**
 * Lightweight hook that only provides sprint dates without full data
 */
export function useSprintDates() {
  const { sprint, isLoading, error } = useSprintData({ 
    refreshInterval: 0, // No auto-refresh for dates-only hook
    debugMode: false 
  });

  const dates = sprint ? {
    startDate: sprint.sprint_start_date,
    endDate: sprint.sprint_end_date,
    formattedStart: new Date(sprint.sprint_start_date).toLocaleDateString(),
    formattedEnd: new Date(sprint.sprint_end_date).toLocaleDateString(),
    isActive: sprint.is_active,
    daysRemaining: sprint.days_remaining,
    progressPercentage: sprint.progress_percentage
  } : null;

  return {
    dates,
    isLoading,
    error,
    sprintNumber: sprint?.current_sprint_number || null,
    sprintName: sprint?.current_sprint_number ? `Sprint ${sprint.current_sprint_number}` : null
  };
}

/**
 * Hook for components that need to know if sprint data is available
 * Useful for conditional rendering
 */
export function useSprintAvailability() {
  const { sprint, isLoading, error, source, healthStatus } = useSprintData({
    refreshInterval: 10 * 60 * 1000, // Longer interval for availability check
    debugMode: false
  });

  return {
    isAvailable: !!sprint && !error,
    isLoading,
    hasError: !!error,
    isHealthy: healthStatus === 'healthy',
    isDegraded: healthStatus === 'degraded',
    isEmergencyMode: source === 'emergency_default',
    source
  };
}

/**
 * Hook for admin components that need to manage sprint settings
 */
export function useSprintManagement() {
  const sprintData = useSprintData({
    autoInitialize: true,
    refreshOnFocus: true,
    debugMode: true
  });

  const initializeSettings = useCallback(async (): Promise<boolean> => {
    try {
      await sprintDataHandler.initializeSprintSettings();
      await sprintData.invalidateAndRefresh();
      return true;
    } catch (error) {
      warn('Failed to initialize sprint settings:', error);
      return false;
    }
  }, [sprintData]);

  const performHealthCheck = useCallback(async () => {
    return await sprintDataHandler.healthCheck();
  }, []);

  return {
    ...sprintData,
    initializeSettings,
    performHealthCheck,
    clearCache: () => sprintDataHandler.invalidateCache()
  };
}

// Export the sprint data handler for direct access if needed
export { sprintDataHandler };