'use client';

import { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '@/lib/database';
import { SprintCalculations } from '@/lib/sprintCalculations';
import { EnhancedUnifiedSprintData, SprintNavigationData } from '@/types';

export interface UnifiedSprintData {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  timeProgress: number;
  totalDays: number;
  daysElapsed: number;
  daysRemaining: number;
  workingDaysRemaining: number;
  isOnTrack: boolean;
  settingsId: number;
  lastUpdated: string;
  sprintNumber: number;
  sprintWeeks: number;
}

// Enhanced hook for sprint data with navigation and notes
export const useEnhancedSprintData = (targetSprintNumber?: number) => {
  const [sprintData, setSprintData] = useState<EnhancedUnifiedSprintData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const fetchSprintData = useCallback(async (requestedSprintNumber?: number) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching enhanced sprint data...');
      
      // Get navigation context for the requested sprint
      const navigationData = await DatabaseService.getSprintWithNavigation(requestedSprintNumber);
      
      if (!navigationData) {
        throw new Error('No sprint data available');
      }

      const { sprint: targetSprint, previous, next, position } = navigationData;

      console.log('📊 Target sprint from navigation:', {
        sprintNumber: targetSprint.sprint_number,
        startDate: targetSprint.sprint_start_date,
        endDate: targetSprint.sprint_end_date,
        weeks: targetSprint.sprint_length_weeks
      });

      // Get notes for this sprint
      const sprintNotes = await DatabaseService.getSprintNotes(
        targetSprint.sprint_number, 
        targetSprint.sprint_start_date
      );

      // Use the standardized SprintCalculations for all progress calculations
      const now = new Date();
      const startDate = new Date(targetSprint.sprint_start_date);
      const endDate = new Date(targetSprint.sprint_end_date);

      // Validate dates
      if (startDate >= endDate) {
        throw new Error('Invalid sprint dates: start date must be before end date');
      }

      // Calculate time-based progress using SprintCalculations (canonical method)
      const timeProgress = SprintCalculations.calculateSprintProgress(
        targetSprint.sprint_start_date,
        targetSprint.sprint_end_date
      );

      // Calculate days using SprintCalculations
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysElapsed = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysRemaining = SprintCalculations.calculateDaysRemaining(targetSprint.sprint_end_date);

      // Calculate working days (Sunday-Thursday) remaining
      const workingDaysRemaining = calculateWorkingDaysRemaining(now, endDate);

      // Determine if sprint is on track
      const isOnTrack = timeProgress <= 100 && daysRemaining >= 0;

      const enhancedData: EnhancedUnifiedSprintData = {
        // Core sprint data
        id: targetSprint.id || targetSprint.sprint_number,
        name: `Sprint ${targetSprint.sprint_number}`,
        startDate: targetSprint.sprint_start_date,
        endDate: targetSprint.sprint_end_date,
        timeProgress,
        totalDays,
        daysElapsed,
        daysRemaining,
        workingDaysRemaining,
        isOnTrack,
        settingsId: targetSprint.id || targetSprint.sprint_number,
        lastUpdated: new Date().toISOString(),
        sprintNumber: targetSprint.sprint_number,
        sprintWeeks: targetSprint.sprint_length_weeks,
        
        // Enhanced features
        notes: sprintNotes?.notes || '',
        navigation: {
          hasPrevious: previous !== null,
          hasNext: next !== null,
          previousSprint: previous,
          nextSprint: next,
          position
        }
      };

      console.log('✅ Enhanced sprint data calculated:', {
        sprintNumber: enhancedData.sprintNumber,
        timeProgress: enhancedData.timeProgress,
        daysRemaining: enhancedData.daysRemaining,
        hasNotes: enhancedData.notes.length > 0,
        hasPrevious: enhancedData.navigation.hasPrevious,
        hasNext: enhancedData.navigation.hasNext
      });

      setSprintData(enhancedData);

    } catch (err) {
      console.error('❌ Error fetching enhanced sprint data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Navigation methods
  const navigateToPrevious = useCallback(async () => {
    if (!sprintData?.navigation.hasPrevious || !sprintData.navigation.previousSprint) {
      return;
    }
    
    await fetchSprintData(sprintData.navigation.previousSprint.sprint_number);
  }, [sprintData, fetchSprintData]);

  const navigateToNext = useCallback(async () => {
    if (!sprintData?.navigation.hasNext || !sprintData.navigation.nextSprint) {
      return;
    }
    
    await fetchSprintData(sprintData.navigation.nextSprint.sprint_number);
  }, [sprintData, fetchSprintData]);

  const navigateToSprint = useCallback(async (sprintNumber: number) => {
    await fetchSprintData(sprintNumber);
  }, [fetchSprintData]);

  // Notes management
  const saveNotes = useCallback(async (notes: string) => {
    if (!sprintData) {
      return false;
    }

    setIsSavingNotes(true);
    try {
      const success = await DatabaseService.createOrUpdateSprintNotes(
        sprintData.sprintNumber,
        sprintData.startDate,
        sprintData.endDate,
        notes,
        'user'
      );

      if (success) {
        // Update local state optimistically
        setSprintData(prev => prev ? {
          ...prev,
          notes
        } : null);
      }

      return success;
    } catch (error) {
      console.error('Error saving sprint notes:', error);
      return false;
    } finally {
      setIsSavingNotes(false);
    }
  }, [sprintData]);

  useEffect(() => {
    fetchSprintData(targetSprintNumber);
    
    // Auto-refresh every hour to keep progress current (only for current sprint)
    const interval = setInterval(() => {
      if (!targetSprintNumber) { // Only auto-refresh current sprint
        fetchSprintData();
      }
    }, 3600000); // 1 hour
    
    return () => clearInterval(interval);
  }, [fetchSprintData, targetSprintNumber]);

  return { 
    sprintData, 
    isLoading, 
    error, 
    isSavingNotes,
    refetch: fetchSprintData,
    navigateToPrevious,
    navigateToNext,
    navigateToSprint,
    saveNotes
  };
};

// Original hook for backward compatibility
export const useUnifiedSprintData = () => {
  const { sprintData, isLoading, error, refetch } = useEnhancedSprintData();
  
  // Convert enhanced data to original format for backward compatibility
  const originalFormatData = sprintData ? {
    id: sprintData.id,
    name: sprintData.name,
    startDate: sprintData.startDate,
    endDate: sprintData.endDate,
    timeProgress: sprintData.timeProgress,
    totalDays: sprintData.totalDays,
    daysElapsed: sprintData.daysElapsed,
    daysRemaining: sprintData.daysRemaining,
    workingDaysRemaining: sprintData.workingDaysRemaining,
    isOnTrack: sprintData.isOnTrack,
    settingsId: sprintData.settingsId,
    lastUpdated: sprintData.lastUpdated,
    sprintNumber: sprintData.sprintNumber,
    sprintWeeks: sprintData.sprintWeeks
  } : null;

  return { 
    sprintData: originalFormatData, 
    isLoading, 
    error, 
    refetch 
  };
};

// Helper function for working days calculation (Israeli work week: Sunday-Thursday)
const calculateWorkingDaysRemaining = (fromDate: Date, toDate: Date): number => {
  let workingDays = 0;
  const current = new Date(fromDate);
  
  while (current <= toDate) {
    const dayOfWeek = current.getDay();
    // Sunday=0, Monday=1, ..., Thursday=4 are working days in Israel
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
};

export default useUnifiedSprintData;