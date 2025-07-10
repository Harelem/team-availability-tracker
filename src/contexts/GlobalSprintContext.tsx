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
      console.log('🌍 Loading global sprint data...');
      
      // Load global sprint (always available)
      const globalSprint = await DatabaseService.getCurrentGlobalSprint();
      setCurrentSprint(globalSprint);
      
      // Load team-specific stats if teamId is provided
      if (teamId) {
        console.log('📊 Loading team sprint stats for team:', teamId);
        const stats = await DatabaseService.getTeamSprintStats(teamId);
        setTeamStats(stats);
      } else {
        setTeamStats(null);
      }
      
      console.log('✅ Global sprint data loaded successfully');
    } catch (err) {
      console.error('❌ Error loading sprint data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sprint data');
    } finally {
      setIsLoading(false);
    }
  };

  // Update global sprint settings (admin only)
  const updateSprintSettings = async (settings: Partial<GlobalSprintSettings>): Promise<boolean> => {
    try {
      console.log('⚙️ Updating global sprint settings:', settings);
      
      const success = await DatabaseService.updateGlobalSprintSettings(settings, 'Harel Mazan');
      
      if (success) {
        console.log('✅ Sprint settings updated successfully');
        await refreshSprint(); // Refresh data after update
        return true;
      } else {
        console.error('❌ Failed to update sprint settings');
        setError('Failed to update sprint settings');
        return false;
      }
    } catch (err) {
      console.error('❌ Error updating sprint settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update sprint settings');
      return false;
    }
  };

  // Start a new sprint (admin only)
  const startNewSprint = async (lengthWeeks: number): Promise<boolean> => {
    try {
      console.log('🚀 Starting new sprint with length:', lengthWeeks, 'weeks');
      
      const success = await DatabaseService.startNewGlobalSprint(lengthWeeks, 'Harel Mazan');
      
      if (success) {
        console.log('✅ New sprint started successfully');
        await refreshSprint(); // Refresh data after starting new sprint
        return true;
      } else {
        console.error('❌ Failed to start new sprint');
        setError('Failed to start new sprint');
        return false;
      }
    } catch (err) {
      console.error('❌ Error starting new sprint:', err);
      setError(err instanceof Error ? err.message : 'Failed to start new sprint');
      return false;
    }
  };

  // Load data on mount and when teamId changes
  useEffect(() => {
    refreshSprint();
  }, [teamId]);

  // Auto-refresh every 5 minutes to keep data current
  useEffect(() => {
    const interval = setInterval(refreshSprint, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [teamId]);

  const value: GlobalSprintContextType = {
    currentSprint,
    teamStats,
    isLoading,
    error,
    refreshSprint,
    updateSprintSettings,
    startNewSprint
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