/**
 * Analytics Hooks with Performance Optimization
 * 
 * Provides React hooks for accessing analytics data with intelligent caching,
 * background updates, and performance optimizations.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { dataProcessor, ProcessedTeamData } from '@/lib/analytics/dataProcessor';
import { predictiveAnalytics, CapacityForecast, BurnoutRiskAssessment, DeliveryPrediction } from '@/lib/analytics/predictiveAnalytics';
import { performanceMetrics, TeamPerformanceMetrics, CompanyPerformanceMetrics } from '@/lib/analytics/performanceMetrics';
import { alertSystem, Alert, InsightSummary } from '@/lib/analytics/alertSystem';

// Hook Configuration Types
interface UseAnalyticsConfig {
  refreshInterval?: number; // Milliseconds
  enableBackgroundRefresh?: boolean;
  cacheTimeout?: number; // Milliseconds
  retryAttempts?: number;
  onError?: (error: Error) => void;
}

interface UseTeamAnalyticsConfig extends UseAnalyticsConfig {
  teamId: string;
  monthsBack?: number;
  includeForecasting?: boolean;
  includeBurnoutAnalysis?: boolean;
}

interface UseCompanyAnalyticsConfig extends UseAnalyticsConfig {
  monthsBack?: number;
  includeTeamComparisons?: boolean;
  includeIndustryBenchmarks?: boolean;
}

interface UseAlertsConfig extends UseAnalyticsConfig {
  severityFilter?: ('info' | 'low' | 'medium' | 'high' | 'critical')[];
  categoryFilter?: string[];
  autoAcknowledge?: boolean;
}

// Hook Return Types
interface AnalyticsState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  isStale: boolean;
}

interface TeamAnalyticsData {
  performance: TeamPerformanceMetrics;
  forecast: CapacityForecast;
  burnoutRisks: BurnoutRiskAssessment[];
  processedData: ProcessedTeamData;
}

interface CompanyAnalyticsData {
  performance: CompanyPerformanceMetrics;
  insights: InsightSummary;
  alerts: Alert[];
}

interface AnalyticsActions {
  refresh: () => Promise<void>;
  invalidateCache: () => void;
  retry: () => Promise<void>;
}

// Performance optimization utilities
class AnalyticsCache {
  private cache = new Map<string, { data: any; timestamp: number; expiry: number }>();
  private backgroundTasks = new Map<string, Promise<any>>();

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data as T;
    }
    return null;
  }

  set<T>(key: string, data: T, timeout: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + timeout
    });
  }

  isStale(key: string, staleThreshold: number = 2 * 60 * 1000): boolean {
    const cached = this.cache.get(key);
    if (!cached) return true;
    return Date.now() - cached.timestamp > staleThreshold;
  }

  setBackgroundTask(key: string, task: Promise<any>): void {
    this.backgroundTasks.set(key, task);
    task.finally(() => this.backgroundTasks.delete(key));
  }

  getBackgroundTask(key: string): Promise<any> | null {
    return this.backgroundTasks.get(key) || null;
  }

  clear(): void {
    this.cache.clear();
    this.backgroundTasks.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
const analyticsCache = new AnalyticsCache();

// Cleanup interval for cache
setInterval(() => analyticsCache.cleanup(), 5 * 60 * 1000);

/**
 * Hook for team-specific analytics data
 */
export function useTeamAnalytics(
  config: UseTeamAnalyticsConfig
): AnalyticsState<TeamAnalyticsData> & AnalyticsActions {
  const [state, setState] = useState<AnalyticsState<TeamAnalyticsData>>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
    isStale: false
  });

  const configRef = useRef(config);
  configRef.current = config;

  const cacheKey = useMemo(() => 
    `team_analytics_${config.teamId}_${config.monthsBack || 6}_${config.includeForecasting}_${config.includeBurnoutAnalysis}`,
    [config.teamId, config.monthsBack, config.includeForecasting, config.includeBurnoutAnalysis]
  );

  const fetchData = useCallback(async (): Promise<TeamAnalyticsData> => {
    const { teamId, monthsBack = 6, includeForecasting = true, includeBurnoutAnalysis = true } = configRef.current;

    try {
      // Check for existing background task
      const existingTask = analyticsCache.getBackgroundTask(cacheKey);
      if (existingTask) {
        return await existingTask;
      }

      // Create new fetch task
      const fetchTask = (async () => {
        const [performance, processedTeams] = await Promise.all([
          performanceMetrics.calculateTeamPerformance(teamId, monthsBack),
          dataProcessor.processAllTeams()
        ]);

        const processedData = processedTeams.find(t => t.teamId.toString() === teamId);
        if (!processedData) {
          throw new Error(`No data found for team ${teamId}`);
        }

        const results: Partial<TeamAnalyticsData> = {
          performance,
          processedData
        };

        // Optional forecasting
        if (includeForecasting) {
          results.forecast = await predictiveAnalytics.forecastSprintCapacity(teamId);
        }

        // Optional burnout analysis
        if (includeBurnoutAnalysis && processedData.historicalData.length > 0) {
          const memberIds = [...new Set(processedData.historicalData.map(d => d.memberId))];
          results.burnoutRisks = await Promise.all(
            memberIds.map(id => predictiveAnalytics.assessBurnoutRisk(id.toString()))
          );
        }

        return results as TeamAnalyticsData;
      })();

      analyticsCache.setBackgroundTask(cacheKey, fetchTask);
      const data = await fetchTask;
      
      // Cache the result
      analyticsCache.set(cacheKey, data, configRef.current.cacheTimeout);
      
      return data;
    } catch (error) {
      console.error('Error fetching team analytics:', error);
      throw error;
    }
  }, [cacheKey]);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = analyticsCache.get<TeamAnalyticsData>(cacheKey);
        if (cached) {
          setState({
            data: cached,
            loading: false,
            error: null,
            lastUpdated: new Date(),
            isStale: analyticsCache.isStale(cacheKey)
          });
          
          // Background refresh if stale
          if (analyticsCache.isStale(cacheKey) && configRef.current.enableBackgroundRefresh) {
            fetchData().then(data => {
              setState(prev => ({
                ...prev,
                data,
                isStale: false,
                lastUpdated: new Date()
              }));
            }).catch(console.error);
          }
          
          return;
        }
      }

      // Fetch fresh data
      const data = await fetchData();
      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        isStale: false
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({ ...prev, loading: false, error: err }));
      configRef.current.onError?.(err);
    }
  }, [cacheKey, fetchData]);

  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  const invalidateCache = useCallback(() => {
    analyticsCache.set(cacheKey, null, 0); // Expire immediately
  }, [cacheKey]);

  const retry = useCallback(async () => {
    if (state.error) {
      await loadData(true);
    }
  }, [loadData, state.error]);

  // Initial load and periodic refresh
  useEffect(() => {
    loadData();

    if (configRef.current.refreshInterval && configRef.current.refreshInterval > 0) {
      const interval = setInterval(() => {
        if (configRef.current.enableBackgroundRefresh) {
          loadData();
        }
      }, configRef.current.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [loadData]);

  return {
    ...state,
    refresh,
    invalidateCache,
    retry
  };
}

/**
 * Hook for company-wide analytics data
 */
export function useCompanyAnalytics(
  config: UseCompanyAnalyticsConfig
): AnalyticsState<CompanyAnalyticsData> & AnalyticsActions {
  const [state, setState] = useState<AnalyticsState<CompanyAnalyticsData>>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
    isStale: false
  });

  const configRef = useRef(config);
  configRef.current = config;

  const cacheKey = useMemo(() => 
    `company_analytics_${config.monthsBack || 6}`,
    [config.monthsBack]
  );

  const fetchData = useCallback(async (): Promise<CompanyAnalyticsData> => {
    const { monthsBack = 6 } = configRef.current;

    try {
      const existingTask = analyticsCache.getBackgroundTask(cacheKey);
      if (existingTask) {
        return await existingTask;
      }

      const fetchTask = (async () => {
        const [performance, insights, alerts] = await Promise.all([
          performanceMetrics.calculateCompanyPerformance(monthsBack),
          alertSystem.generateInsights(
            new Date(Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000),
            new Date()
          ),
          Promise.resolve(alertSystem.getActiveAlerts())
        ]);

        return { performance, insights, alerts };
      })();

      analyticsCache.setBackgroundTask(cacheKey, fetchTask);
      const data = await fetchTask;
      
      analyticsCache.set(cacheKey, data, configRef.current.cacheTimeout);
      return data;
    } catch (error) {
      console.error('Error fetching company analytics:', error);
      throw error;
    }
  }, [cacheKey]);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      if (!forceRefresh) {
        const cached = analyticsCache.get<CompanyAnalyticsData>(cacheKey);
        if (cached) {
          setState({
            data: cached,
            loading: false,
            error: null,
            lastUpdated: new Date(),
            isStale: analyticsCache.isStale(cacheKey)
          });

          if (analyticsCache.isStale(cacheKey) && configRef.current.enableBackgroundRefresh) {
            fetchData().then(data => {
              setState(prev => ({
                ...prev,
                data,
                isStale: false,
                lastUpdated: new Date()
              }));
            }).catch(console.error);
          }
          
          return;
        }
      }

      const data = await fetchData();
      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        isStale: false
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({ ...prev, loading: false, error: err }));
      configRef.current.onError?.(err);
    }
  }, [cacheKey, fetchData]);

  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  const invalidateCache = useCallback(() => {
    analyticsCache.set(cacheKey, null, 0);
  }, [cacheKey]);

  const retry = useCallback(async () => {
    if (state.error) {
      await loadData(true);
    }
  }, [loadData, state.error]);

  useEffect(() => {
    loadData();

    if (configRef.current.refreshInterval && configRef.current.refreshInterval > 0) {
      const interval = setInterval(() => {
        if (configRef.current.enableBackgroundRefresh) {
          loadData();
        }
      }, configRef.current.refreshInterval);

      return () => clearInterval(interval);
    }
  }, [loadData]);

  return {
    ...state,
    refresh,
    invalidateCache,
    retry
  };
}

/**
 * Hook for alerts and notifications
 */
export function useAlerts(
  config: UseAlertsConfig = {}
): AnalyticsState<Alert[]> & AnalyticsActions & {
  acknowledgeAlert: (alertId: string) => Promise<boolean>;
  resolveAlert: (alertId: string, resolution: string) => Promise<boolean>;
  dismissAlert: (alertId: string) => Promise<boolean>;
} {
  const [state, setState] = useState<AnalyticsState<Alert[]>>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
    isStale: false
  });

  const configRef = useRef(config);
  configRef.current = config;

  const cacheKey = useMemo(() => 
    `alerts_${JSON.stringify(config.severityFilter)}_${JSON.stringify(config.categoryFilter)}`,
    [config.severityFilter, config.categoryFilter]
  );

  const fetchData = useCallback(async (): Promise<Alert[]> => {
    try {
      const alerts = alertSystem.getActiveAlerts({
        severity: configRef.current.severityFilter,
        category: configRef.current.categoryFilter as any
      });

      // Auto-acknowledge if enabled
      if (configRef.current.autoAcknowledge) {
        const unacknowledged = alerts.filter(a => a.status === 'active');
        for (const alert of unacknowledged) {
          if (alert.severity === 'info' || alert.severity === 'low') {
            alertSystem.acknowledgeAlert(alert.id, 'auto');
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  }, []);

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      if (!forceRefresh) {
        const cached = analyticsCache.get<Alert[]>(cacheKey);
        if (cached) {
          setState({
            data: cached,
            loading: false,
            error: null,
            lastUpdated: new Date(),
            isStale: analyticsCache.isStale(cacheKey, 30000) // 30 second stale threshold for alerts
          });
          return;
        }
      }

      const data = await fetchData();
      analyticsCache.set(cacheKey, data, 30000); // 30 second cache for alerts
      
      setState({
        data,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        isStale: false
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({ ...prev, loading: false, error: err }));
      configRef.current.onError?.(err);
    }
  }, [cacheKey, fetchData]);

  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  const invalidateCache = useCallback(() => {
    analyticsCache.set(cacheKey, null, 0);
  }, [cacheKey]);

  const retry = useCallback(async () => {
    if (state.error) {
      await loadData(true);
    }
  }, [loadData, state.error]);

  const acknowledgeAlert = useCallback(async (alertId: string): Promise<boolean> => {
    const success = alertSystem.acknowledgeAlert(alertId, 'user');
    if (success) {
      invalidateCache();
      await loadData(true);
    }
    return success;
  }, [invalidateCache, loadData]);

  const resolveAlert = useCallback(async (alertId: string, resolution: string): Promise<boolean> => {
    const success = alertSystem.resolveAlert(alertId, 'user', resolution);
    if (success) {
      invalidateCache();
      await loadData(true);
    }
    return success;
  }, [invalidateCache, loadData]);

  const dismissAlert = useCallback(async (alertId: string): Promise<boolean> => {
    // In a real implementation, would have a dismiss method
    const success = alertSystem.resolveAlert(alertId, 'user', 'dismissed');
    if (success) {
      invalidateCache();
      await loadData(true);
    }
    return success;
  }, [invalidateCache, loadData]);

  useEffect(() => {
    loadData();

    // Alerts refresh more frequently (every 30 seconds by default)
    const refreshInterval = configRef.current.refreshInterval || 30000;
    const interval = setInterval(() => {
      loadData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [loadData]);

  return {
    ...state,
    refresh,
    invalidateCache,
    retry,
    acknowledgeAlert,
    resolveAlert,
    dismissAlert
  };
}

/**
 * Hook for predictive analytics (forecasting, predictions)
 */
export function usePredictiveAnalytics(
  teamId: string,
  config: UseAnalyticsConfig = {}
) {
  const [forecastData, setForecastData] = useState<{
    capacity: CapacityForecast | null;
    burnoutRisks: BurnoutRiskAssessment[];
    loading: boolean;
    error: Error | null;
  }>({
    capacity: null,
    burnoutRisks: [],
    loading: true,
    error: null
  });

  const fetchPredictions = useCallback(async () => {
    try {
      setForecastData(prev => ({ ...prev, loading: true, error: null }));

      const [capacity, processedTeams] = await Promise.all([
        predictiveAnalytics.forecastSprintCapacity(teamId),
        dataProcessor.processAllTeams()
      ]);

      const teamData = processedTeams.find(t => t.teamId.toString() === teamId);
      const burnoutRisks: BurnoutRiskAssessment[] = [];

      if (teamData && teamData.historicalData.length > 0) {
        const memberIds = [...new Set(teamData.historicalData.map(d => d.memberId))];
        for (const memberId of memberIds) {
          try {
            const risk = await predictiveAnalytics.assessBurnoutRisk(memberId.toString());
            burnoutRisks.push(risk);
          } catch (error) {
            console.warn(`Could not assess burnout risk for member ${memberId}`);
          }
        }
      }

      setForecastData({
        capacity,
        burnoutRisks,
        loading: false,
        error: null
      });
    } catch (error) {
      setForecastData(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }));
      config.onError?.(error as Error);
    }
  }, [teamId, config]);

  useEffect(() => {
    fetchPredictions();

    if (config.refreshInterval) {
      const interval = setInterval(fetchPredictions, config.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPredictions, config.refreshInterval]);

  return {
    ...forecastData,
    refresh: fetchPredictions
  };
}

/**
 * Hook for real-time analytics monitoring
 */
export function useAnalyticsMonitoring(config: UseAnalyticsConfig = {}) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [newAlerts, setNewAlerts] = useState<Alert[]>([]);
  const monitoringRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef(config);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const startMonitoring = useCallback(() => {
    if (monitoringRef.current) return; // Already monitoring

    setIsMonitoring(true);
    monitoringRef.current = setInterval(async () => {
      try {
        const alerts = await alertSystem.runMonitoringCycle();
        if (alerts.length > 0) {
          setNewAlerts(prev => [...prev, ...alerts]);
        }
      } catch (error) {
        console.error('Monitoring cycle error:', error);
        configRef.current.onError?.(error as Error);
      }
    }, configRef.current.refreshInterval || 60000); // Default 1 minute
  }, []); // Remove dependencies to prevent recreation

  const stopMonitoring = useCallback(() => {
    if (monitoringRef.current) {
      clearInterval(monitoringRef.current);
      monitoringRef.current = null;
    }
    setIsMonitoring(false);
  }, []);

  const clearNewAlerts = useCallback(() => {
    setNewAlerts([]);
  }, []);

  useEffect(() => {
    return () => {
      if (monitoringRef.current) {
        clearInterval(monitoringRef.current);
        monitoringRef.current = null;
      }
      setIsMonitoring(false);
    };
  }, []);

  return {
    isMonitoring,
    newAlerts,
    startMonitoring,
    stopMonitoring,
    clearNewAlerts
  };
}

/**
 * Utility hook for invalidating all analytics caches
 */
export function useAnalyticsCache() {
  const clearAll = useCallback(() => {
    analyticsCache.clear();
  }, []);

  const cleanup = useCallback(() => {
    analyticsCache.cleanup();
  }, []);

  return {
    clearAll,
    cleanup
  };
}