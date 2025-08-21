'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrentGlobalSprint, TeamSprintStats, GlobalSprintSettings, GlobalSprintContextType } from '@/types';
import { DatabaseService } from '@/lib/database';

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

  // Load global sprint and team stats
  const refreshSprint = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load global sprint (always available)
      const globalSprint = await DatabaseService.getCurrentGlobalSprint();
      setCurrentSprint(globalSprint);
      
      // Load team-specific stats if teamId is provided
      if (teamId) {
        const stats = await DatabaseService.getTeamSprintStats(teamId);
        setTeamStats(stats);
      } else {
        setTeamStats(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sprint data');
    } finally {
      setIsLoading(false);
    }
  };

  // Update global sprint settings (admin only)
  const updateSprintSettings = async (settings: Partial<GlobalSprintSettings>): Promise<boolean> => {
    try {
      const success = await DatabaseService.updateGlobalSprintSettings(settings, 'Harel Mazan');
      
      if (success) {
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
      const success = await DatabaseService.startNewGlobalSprint(lengthWeeks, 'Harel Mazan');
      
      if (success) {
        await refreshSprint(); // Refresh data after starting new sprint
        return true;
      } else {
        setError('Failed to start new sprint');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start new sprint');
      return false;
    }
  };

  // Update sprint dates (admin only)
  const updateSprintDates = async (startDate: string, endDate?: string): Promise<boolean> => {
    try {
      const success = await DatabaseService.updateSprintDates(startDate, endDate, 'Harel Mazan');
      
      if (success) {
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
  }, [teamId]);

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
  }, [teamId]);

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