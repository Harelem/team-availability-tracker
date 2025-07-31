'use client';

import { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '@/lib/database';
import { SprintCalculations } from '@/lib/sprintCalculations';

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

export const useUnifiedSprintData = () => {
  const [sprintData, setSprintData] = useState<UnifiedSprintData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSprintData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching unified sprint data...');
      
      // Get ONLY from global_sprint_settings table (single source of truth)
      const currentSprint = await DatabaseService.getCurrentGlobalSprint();

      if (!currentSprint) {
        throw new Error('No current sprint configured in global_sprint_settings');
      }

      console.log('📊 Current sprint from global settings:', {
        sprintNumber: currentSprint.current_sprint_number,
        startDate: currentSprint.sprint_start_date,
        endDate: currentSprint.sprint_end_date,
        weeks: currentSprint.sprint_length_weeks
      });

      // Use the standardized SprintCalculations for all progress calculations
      const now = new Date();
      const startDate = new Date(currentSprint.sprint_start_date);
      const endDate = new Date(currentSprint.sprint_end_date);

      // Validate dates
      if (startDate >= endDate) {
        throw new Error('Invalid sprint dates: start date must be before end date');
      }

      // Calculate time-based progress using SprintCalculations (canonical method)
      const timeProgress = SprintCalculations.calculateSprintProgress(
        currentSprint.sprint_start_date,
        currentSprint.sprint_end_date
      );

      // Calculate days using SprintCalculations
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysElapsed = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysRemaining = SprintCalculations.calculateDaysRemaining(currentSprint.sprint_end_date);

      // Calculate working days (Sunday-Thursday) remaining
      const workingDaysRemaining = calculateWorkingDaysRemaining(now, endDate);

      // Determine if sprint is on track
      const expectedProgress = Math.max(10, timeProgress * 0.9); // Allow 10% buffer
      const isOnTrack = timeProgress <= 100 && daysRemaining >= 0;

      const unifiedData: UnifiedSprintData = {
        id: currentSprint.id || 1,
        name: `Sprint ${currentSprint.current_sprint_number}`,
        startDate: currentSprint.sprint_start_date,
        endDate: currentSprint.sprint_end_date,
        timeProgress,
        totalDays,
        daysElapsed,
        daysRemaining,
        workingDaysRemaining,
        isOnTrack,
        settingsId: currentSprint.id || 1,
        lastUpdated: currentSprint.updated_at || currentSprint.created_at || new Date().toISOString(),
        sprintNumber: currentSprint.current_sprint_number,
        sprintWeeks: currentSprint.sprint_length_weeks
      };

      console.log('✅ Unified sprint data calculated:', {
        timeProgress: unifiedData.timeProgress,
        daysRemaining: unifiedData.daysRemaining,
        workingDaysRemaining: unifiedData.workingDaysRemaining,
        isOnTrack: unifiedData.isOnTrack
      });

      setSprintData(unifiedData);

    } catch (err) {
      console.error('❌ Error fetching unified sprint data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSprintData();
    
    // Auto-refresh every hour to keep progress current
    const interval = setInterval(fetchSprintData, 3600000); // 1 hour
    
    return () => clearInterval(interval);
  }, [fetchSprintData]);

  return { sprintData, isLoading, error, refetch: fetchSprintData };
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