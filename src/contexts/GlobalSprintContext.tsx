'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback, startTransition } from 'react';
import { CurrentGlobalSprint, TeamSprintStats, GlobalSprintSettings, GlobalSprintContextType } from '@/types';
import { DatabaseService } from '@/lib/database';
import { sprintDataHandler } from '@/lib/SprintDataHandler';
import { debug, warn } from '@/utils/debugLogger';

const GlobalSprintContext = createContext<GlobalSprintContextType | undefined>(undefined);

interface GlobalSprintProviderProps {
  children: ReactNode;
  teamId?: number; // Current team for team-specific stats
}

export function GlobalSprintProvider({ children, teamId }: GlobalSprintProviderProps) {
  const [currentSprint, setCurrentSprint] = useState<CurrentGlobalSprint | null>(null);
  const [teamStats, setTeamStats] = useState<TeamSprintStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Debouncing and error boundary refs
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);
  const errorRetryCountRef = useRef<number>(0);
  const maxRetries = 3;
  const refreshDebounceMs = 500; // Prevent excessive refresh calls

  // Debounced refresh function to prevent cascading updates
  const debouncedRefreshSprint = useCallback(() => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Check if we're already refreshing or too soon since last refresh
    const now = Date.now();
    if (isRefreshingRef.current || (now - lastRefreshRef.current < refreshDebounceMs)) {
      console.log('🚫 GlobalSprintContext: Refresh debounced/throttled');
      return;
    }
    
    // Set debounce timeout
    refreshTimeoutRef.current = setTimeout(() => {
      refreshSprintInternal();
    }, refreshDebounceMs);
  }, []);

  // Internal refresh function with error boundaries and non-blocking updates
  const refreshSprintInternal = async () => {
    if (isRefreshingRef.current) {
      console.log('🚫 GlobalSprintContext: Refresh already in progress');
      return;
    }
    
    isRefreshingRef.current = true;
    lastRefreshRef.current = Date.now();
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 GlobalSprintContext: Starting sprint data loading...');
      
      // Use the new centralized sprint data handler
      const sprintResult = await sprintDataHandler.getCurrentSprint();
      
      console.log('📊 GlobalSprintContext: Sprint result:', {
        success: sprintResult.success,
        source: sprintResult.source,
        cached: sprintResult.cached,
        hasSprint: !!sprintResult.sprint,
        sprintId: sprintResult.sprint?.id,
        warnings: sprintResult.warnings,
        errors: sprintResult.errors
      });
      
      if (sprintResult.success) {
        console.log('✅ GlobalSprintContext: Setting currentSprint:', sprintResult.sprint);
        
        // Use startTransition for non-blocking state updates
        startTransition(() => {
          setCurrentSprint(sprintResult.sprint);
        });
        
        // Log warnings if any (for debugging)
        if (sprintResult.warnings.length > 0) {
          warn('Sprint data warnings:', sprintResult.warnings);
        }
        
        debug(`Sprint data loaded from ${sprintResult.source} (cached: ${sprintResult.cached})`);
      } else {
        console.log('⚠️ GlobalSprintContext: SprintResult not successful, checking for fallback sprint');
        // Even if there are errors, we should have emergency default data
        if (sprintResult.sprint) {
          console.log('✅ GlobalSprintContext: Using fallback sprint:', sprintResult.sprint);
          startTransition(() => {
            setCurrentSprint(sprintResult.sprint);
          });
          warn('Using fallback sprint data:', sprintResult.warnings);
        } else {
          console.log('❌ GlobalSprintContext: No sprint data available, throwing error');
          throw new Error('Failed to load sprint data from all sources');
        }
      }
      
      // Load team-specific stats if teamId is provided (non-blocking)
      if (teamId) {
        startTransition(() => {
          DatabaseService.getTeamSprintStats(teamId)
            .then(stats => setTeamStats(stats))
            .catch(err => console.warn('Failed to load team stats:', err));
        });
      } else {
        setTeamStats(null);
      }
      
      // Reset error retry count on success
      errorRetryCountRef.current = 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sprint data';
      errorRetryCountRef.current++;
      
      console.error(`GlobalSprintContext error (attempt ${errorRetryCountRef.current}/${maxRetries}):`, err);
      
      // Only set error state if we've exhausted retries
      if (errorRetryCountRef.current >= maxRetries) {
        setError(errorMessage);
        
        // Try to provide emergency default even on error (non-blocking)
        startTransition(() => {
          sprintDataHandler.getCurrentSprint()
            .then(emergencyResult => {
              if (emergencyResult.sprint) {
                setCurrentSprint(emergencyResult.sprint);
                warn('Using emergency sprint configuration due to error:', errorMessage);
              }
            })
            .catch(emergencyErr => {
              warn('Failed to load even emergency sprint configuration:', emergencyErr);
            });
        });
      } else {
        // Retry after a brief delay
        setTimeout(() => {
          refreshSprintInternal();
        }, 1000 * errorRetryCountRef.current); // Exponential backoff
      }
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  };
  
  // Public interface (uses debounced version)
  const refreshSprint = useCallback(async () => {
    debouncedRefreshSprint();
  }, [debouncedRefreshSprint]);

  // Update global sprint settings (admin only)
  const updateSprintSettings = async (settings: Partial<GlobalSprintSettings>): Promise<boolean> => {
    try {
      const success = await DatabaseService.updateGlobalSprintSettings(settings, 'Harel Mazan');
      
      if (success) {
        // Invalidate sprint data cache before refresh
        sprintDataHandler.invalidateCache();
        await refreshSprint(); // Refresh data after update
        return true;
      } else {
        setError('Failed to update sprint settings');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sprint settings');
      return false;
    }
  };

  // Start a new sprint (admin only)
  const startNewSprint = async (lengthWeeks: number): Promise<boolean> => {
    try {
      console.log('Starting new sprint with length:', lengthWeeks);
      const success = await DatabaseService.startNewGlobalSprint(lengthWeeks, 'Harel Mazan');
      
      if (success) {
        // Invalidate sprint data cache before refresh
        sprintDataHandler.invalidateCache();
        await refreshSprint(); // Refresh data after starting new sprint
        console.log('New sprint started successfully');
        return true;
      } else {
        const errorMessage = 'Failed to start new sprint - please check console for details';
        setError(errorMessage);
        console.error('Sprint creation failed: DatabaseService returned false');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Sprint creation failed: ${errorMessage}`);
      console.error('Sprint creation error:', err);
      return false;
    }
  };

  // Update sprint dates (admin only)
  const updateSprintDates = async (startDate: string, endDate?: string): Promise<boolean> => {
    try {
      const success = await DatabaseService.updateSprintDates(startDate, endDate, 'Harel Mazan');
      
      if (success) {
        // Invalidate sprint data cache before refresh
        sprintDataHandler.invalidateCache();
        await refreshSprint(); // Refresh data after updating dates
        return true;
      } else {
        setError('Failed to update sprint dates');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sprint dates');
      return false;
    }
  };

  // Load data on mount and when teamId changes
  useEffect(() => {
    refreshSprint();
  }, [teamId, refreshSprint]);

  // Auto-refresh every 10 minutes to reduce server load (optimized for performance)
  useEffect(() => {
    // Only enable auto-refresh when page is visible and not in development
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    const interval = setInterval(() => {
      if (!document.hidden) { // Only refresh when tab is active
        refreshSprint();
      }
    }, 10 * 60 * 1000); // Reduced frequency from 5 to 10 minutes
    
    return () => clearInterval(interval);
  }, [refreshSprint]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      isRefreshingRef.current = false;
    };
  }, []);

  const value: GlobalSprintContextType = {
    currentSprint,
    teamStats,
    isLoading,
    error,
    refreshSprint,
    updateSprintSettings,
    startNewSprint,
    updateSprintDates
  };

  return (
    <GlobalSprintContext.Provider value={value}>
      {children}
    </GlobalSprintContext.Provider>
  );
}

// Hook to use the global sprint context
export function useGlobalSprint() {
  const context = useContext(GlobalSprintContext);
  if (context === undefined) {
    throw new Error('useGlobalSprint must be used within a GlobalSprintProvider');
  }
  return context;
}