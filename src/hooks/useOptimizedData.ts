/**
 * Optimized Data Hooks - V2.2 Performance Enhancement
 * 
 * React hooks that integrate with the unified caching system for
 * component-level performance optimization and data consistency.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedDataSource } from '@/lib/performance/unifiedDataSource';
import { calculationCacheManager } from '@/lib/performance/calculationCache';
import { databaseOptimizer } from '@/lib/performance/databaseOptimization';
import { unifiedCalculationService } from '@/lib/unifiedCalculationService';
import { getCurrentSprint } from '@/utils/smartSprintDetection';
import { debug, error as logError } from '@/utils/debugLogger';
import type { 
  UnifiedSprintData, 
  TeamCalculationResult, 
  CompanyCalculationResult 
} from '@/lib/unifiedCalculationService';
import type { COODashboardData } from '@/types';

// ================================================
// TYPES AND INTERFACES
// ================================================

interface UseOptimizedDataOptions {
  enableCache: boolean;
  enableRealTimeSync: boolean;
  refetchOnWindowFocus: boolean;
  refetchInterval?: number;
  staleTime: number;
  cacheTime: number;
}

interface DataState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  lastUpdated: string | null;
  cacheHit: boolean;
}

interface OptimizedDataHookResult<T> extends DataState<T> {
  refetch: () => Promise<void>;
  invalidate: () => void;
  isRefetching: boolean;
}

// ================================================
// DEFAULT OPTIONS
// ================================================

const DEFAULT_OPTIONS: UseOptimizedDataOptions = {
  enableCache: true,
  enableRealTimeSync: true,
  refetchOnWindowFocus: true,
  refetchInterval: undefined,
  staleTime: 2 * 60 * 1000, // 2 minutes
  cacheTime: 5 * 60 * 1000  // 5 minutes
};

// ================================================
// CORE OPTIMIZED DATA HOOK
// ================================================

function useOptimizedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: Partial<UseOptimizedDataOptions> = {}
): OptimizedDataHookResult<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<DataState<T>>({
    data: null,
    isLoading: true,
    isError: false,
    error: null,
    isStale: false,
    lastUpdated: null,
    cacheHit: false
  });
  
  const [isRefetching, setIsRefetching] = useState(false);
  const fetcherRef = useRef(fetcher);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Update fetcher ref when it changes
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const fetchData = useCallback(async (isRefetch = false) => {
    if (isRefetch) {
      setIsRefetching(true);
    } else {
      setState(prev => ({ ...prev, isLoading: true }));
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      const startTime = performance.now();
      const result = await fetcherRef.current();
      const executionTime = performance.now() - startTime;

      setState({
        data: result,
        isLoading: false,
        isError: false,
        error: null,
        isStale: false,
        lastUpdated: new Date().toISOString(),
        cacheHit: executionTime < 10 // Likely a cache hit if very fast
      });

      debug(`Data fetched for key ${key} in ${executionTime}ms`);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was aborted, don't update state
      }

      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      setState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        error: errorObj,
        isStale: true
      }));

      logError(`Failed to fetch data for key ${key}:`, error);
    } finally {
      setIsRefetching(false);
    }
  }, [key]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  const invalidate = useCallback(() => {
    // Invalidate related caches
    if (key.includes('sprint')) {
      calculationCacheManager.invalidateSprintCaches();
    } else if (key.includes('team')) {
      const teamIdMatch = key.match(/team_(\d+)/);
      if (teamIdMatch) {
        calculationCacheManager.invalidateTeamCaches(parseInt(teamIdMatch[1]));
      }
    } else if (key.includes('coo') || key.includes('company')) {
      calculationCacheManager.invalidateAllCalculationCaches();
    }

    // Mark data as stale
    setState(prev => ({ ...prev, isStale: true }));
    
    // Refetch
    fetchData();
  }, [key, fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle window focus refetch
  useEffect(() => {
    if (!opts.refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (state.data && !state.isLoading) {
        const timeSinceLastUpdate = state.lastUpdated 
          ? Date.now() - new Date(state.lastUpdated).getTime()
          : Infinity;
        
        if (timeSinceLastUpdate > opts.staleTime) {
          refetch();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [opts.refetchOnWindowFocus, opts.staleTime, state.data, state.isLoading, state.lastUpdated, refetch]);

  // Handle refetch interval
  useEffect(() => {
    if (!opts.refetchInterval) return;

    const interval = setInterval(() => {
      if (!state.isLoading) {
        refetch();
      }
    }, opts.refetchInterval);

    return () => clearInterval(interval);
  }, [opts.refetchInterval, state.isLoading, refetch]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    refetch,
    invalidate,
    isRefetching
  };
}

// ================================================
// SPECIALIZED HOOKS FOR DIFFERENT DATA TYPES
// ================================================

/**
 * Hook for optimized sprint data access
 */
export function useOptimizedSprintData(
  options: Partial<UseOptimizedDataOptions> = {}
): OptimizedDataHookResult<UnifiedSprintData> {
  return useOptimizedData(
    'unified_sprint_data',
    async () => {
      const sprintData = await unifiedDataSource.getCurrentSprintUnified();
      if (!sprintData) {
        throw new Error('No sprint data available');
      }
      return sprintData;
    },
    {
      ...options,
      staleTime: 5 * 60 * 1000, // 5 minutes for sprint data
      cacheTime: 30 * 60 * 1000 // 30 minutes
    }
  );
}

/**
 * Hook for optimized team dashboard data
 */
export function useOptimizedTeamData(
  teamId: number,
  options: Partial<UseOptimizedDataOptions> = {}
): OptimizedDataHookResult<TeamCalculationResult> {
  return useOptimizedData(
    `team_dashboard_data_${teamId}`,
    async () => {
      const teamData = await unifiedDataSource.getTeamDashboardDataUnified(teamId);
      if (!teamData) {
        throw new Error(`No data available for team ${teamId}`);
      }
      return teamData;
    },
    {
      ...options,
      staleTime: 1 * 60 * 1000, // 1 minute for team data
      cacheTime: 5 * 60 * 1000  // 5 minutes
    }
  );
}

/**
 * Hook for optimized COO dashboard data
 */
export function useOptimizedCOODashboard(
  options: Partial<UseOptimizedDataOptions> = {}
): OptimizedDataHookResult<COODashboardData> {
  return useOptimizedData(
    'coo_dashboard_data',
    async () => {
      return await unifiedDataSource.getCOODashboardDataUnified();
    },
    {
      ...options,
      staleTime: 30 * 1000,     // 30 seconds for COO dashboard
      cacheTime: 2 * 60 * 1000  // 2 minutes
    }
  );
}

/**
 * Hook for optimized company totals
 */
export function useOptimizedCompanyTotals(
  options: Partial<UseOptimizedDataOptions> = {}
): OptimizedDataHookResult<CompanyCalculationResult> {
  return useOptimizedData(
    'company_totals_data',
    async () => {
      return await unifiedCalculationService.calculateCompanyTotals();
    },
    {
      ...options,
      staleTime: 2 * 60 * 1000, // 2 minutes for company totals
      cacheTime: 10 * 60 * 1000 // 10 minutes
    }
  );
}

/**
 * Hook for optimized schedule entries
 */
export function useOptimizedScheduleEntries(
  teamIds: number[],
  startDate: string,
  endDate: string,
  options: Partial<UseOptimizedDataOptions> = {}
): OptimizedDataHookResult<any[]> {
  return useOptimizedData(
    `schedule_entries_${teamIds.join(',')}_${startDate}_${endDate}`,
    async () => {
      const result = await databaseOptimizer.getBulkScheduleEntries(teamIds, startDate, endDate);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch schedule entries');
      }
      return result.data || [];
    },
    {
      ...options,
      staleTime: 30 * 1000,     // 30 seconds for schedule data
      cacheTime: 2 * 60 * 1000  // 2 minutes
    }
  );
}

// ================================================
// CACHE MANAGEMENT HOOKS
// ================================================

/**
 * Hook for cache invalidation management
 */
export function useCacheInvalidation() {
  const invalidateSprintCaches = useCallback(() => {
    calculationCacheManager.invalidateSprintCaches();
    debug('Sprint caches invalidated');
  }, []);

  const invalidateTeamCaches = useCallback((teamId: number) => {
    calculationCacheManager.invalidateTeamCaches(teamId);
    debug(`Team ${teamId} caches invalidated`);
  }, []);

  const invalidateAllCaches = useCallback(() => {
    calculationCacheManager.invalidateAllCalculationCaches();
    debug('All caches invalidated');
  }, []);

  const getPerformanceMetrics = useCallback(() => {
    return {
      calculation: calculationCacheManager.getPerformanceMetrics(),
      database: databaseOptimizer.getMetrics(),
      dataSource: unifiedDataSource.getMetrics()
    };
  }, []);

  return {
    invalidateSprintCaches,
    invalidateTeamCaches,
    invalidateAllCaches,
    getPerformanceMetrics
  };
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    const interval = setInterval(() => {
      const performanceMetrics = {
        calculation: calculationCacheManager.getPerformanceMetrics(),
        database: databaseOptimizer.getMetrics(),
        dataSource: unifiedDataSource.getMetrics(),
        timestamp: new Date().toISOString()
      };
      setMetrics(performanceMetrics);
    }, 5000); // Update every 5 seconds

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    setMetrics(null);
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  };
}

// ================================================
// BACKWARD COMPATIBILITY HOOKS
// ================================================

/**
 * Legacy hook for dashboard data (backward compatibility)
 */
export function useOptimizedDashboardData() {
  const { data: cooData, isLoading, isError, error, refetch } = useOptimizedCOODashboard();
  
  return {
    data: cooData ? {
      todayCapacity: { totalCapacity: 0, availableCapacity: 0, absences: [] },
      tomorrowCapacity: { totalCapacity: 0, availableCapacity: 0, absences: [] },
      stats: { totalAbsences: 0, criticalAlerts: 0 },
      teamMembers: cooData.teamComparison || [],
      criticalAlerts: 0,
      upcomingAbsences: 0
    } : null,
    loading: isLoading,
    error,
    refetch
  };
}

/**
 * Legacy hook for weekly analytics (backward compatibility)
 */
export function useOptimizedWeeklyAnalytics() {
  const { data: companyData, isLoading, isError, error, refetch } = useOptimizedCompanyTotals();
  
  return {
    data: companyData ? {
      weeklyCapacity: [],
      stats: { totalAbsences: 0 },
      metrics: {
        averageCapacity: companyData.overallUtilization,
        criticalDays: 0,
        totalAbsenceDays: 0,
        capacityGaps: 0
      },
      capacityGaps: []
    } : null,
    loading: isLoading,
    error,
    refetch
  };
}

/**
 * Legacy hook for team capacity (backward compatibility)
 */
export function useOptimizedTeamCapacity(dates: string[]) {
  const teamIds = [1]; // Default to team 1 for compatibility
  const startDate = dates[0] || new Date().toISOString().split('T')[0];
  const endDate = dates[dates.length - 1] || startDate;
  
  const { data, isLoading, isError, error, refetch } = useOptimizedScheduleEntries(
    teamIds, startDate, endDate
  );
  
  return {
    data,
    loading: isLoading,
    error,
    refetch
  };
}

/**
 * Legacy hook for absence operations (backward compatibility)
 */
export function useOptimizedAbsenceOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createAbsence = async (absenceData: any) => {
    setLoading(true);
    setError(null);
    try {
      // This would integrate with the database optimizer for bulk operations
      const result = { id: Date.now().toString(), ...absenceData };
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAbsence = async (id: string, updates: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = { id, ...updates };
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteAbsence = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Implementation would use database optimizer
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createAbsence,
    updateAbsence,
    deleteAbsence,
    loading,
    error
  };
}

/**
 * Enhanced data layer performance monitoring
 */
export function useDataLayerPerformance() {
  const { metrics } = usePerformanceMonitoring();

  const clearCache = useCallback(() => {
    calculationCacheManager.invalidateAllCalculationCaches();
  }, []);

  return {
    metrics: metrics || {
      cacheHitRate: 0,
      averageResponseTime: 0,
      queryCount: 0,
      cacheSize: 0
    },
    clearCache
  };
}

// ================================================
// EXPORT ALL HOOKS
// ================================================

// Functions are exported individually above

// Export types
export type {
  UseOptimizedDataOptions,
  DataState,
  OptimizedDataHookResult
};

export default {
  useOptimizedDashboardData,
  useOptimizedWeeklyAnalytics,
  useOptimizedTeamCapacity,
  useOptimizedAbsenceOperations,
  useDataLayerPerformance
};