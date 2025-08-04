'use client';

import { useState, useEffect, useCallback } from 'react';
import { TeamMember, Team, WeekData } from '@/types';
import { DatabaseService } from '@/lib/database';
import { TeamDailyCalculationService, TeamDayStatusData } from '@/lib/teamDailyCalculationService';

interface UseTeamDailyStatusProps {
  team: Team;
  teamMembers: TeamMember[];
  currentWeekOffset: number;
}

interface UseTeamDailyStatusReturn {
  data: TeamDayStatusData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useTeamDailyStatus = ({
  team,
  teamMembers,
  currentWeekOffset
}: UseTeamDailyStatusProps): UseTeamDailyStatusReturn => {
  const [data, setData] = useState<TeamDayStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamDailyStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`🏢 Fetching team daily status for ${team.name} (week offset: ${currentWeekOffset})`);
      
      // Get the current week dates
      const weekDays = TeamDailyCalculationService.getCurrentWeekDates(currentWeekOffset);
      const startDate = weekDays[0].toISOString().split('T')[0];
      const endDate = weekDays[6].toISOString().split('T')[0];

      // Fetch schedule data for the week
      const scheduleEntries: WeekData = await DatabaseService.getScheduleEntries(
        startDate, 
        endDate, 
        team.id
      );

      // Calculate daily status for each day
      const dayStatusList = weekDays.map(date => 
        TeamDailyCalculationService.calculateDayStatus(date, teamMembers, scheduleEntries)
      );

      // Calculate week metrics
      const weekMetrics = TeamDailyCalculationService.calculateWeekMetrics(
        weekDays, 
        teamMembers, 
        scheduleEntries
      );

      const teamDayStatusData: TeamDayStatusData = {
        teamId: team.id,
        teamName: team.name,
        weekDays: dayStatusList,
        weekMetrics,
        currentWeekOffset
      };

      setData(teamDayStatusData);
      
      console.log('✅ Team daily status loaded:', {
        teamName: team.name,
        weekDays: dayStatusList.length,
        totalHours: weekMetrics.totalHours,
        completionRate: weekMetrics.completionRate
      });

    } catch (err) {
      console.error('❌ Error fetching team daily status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [team.id, team.name, teamMembers, currentWeekOffset]);

  // Initial load and reload when dependencies change
  useEffect(() => {
    if (team && teamMembers.length > 0) {
      fetchTeamDailyStatus();
    }
  }, [fetchTeamDailyStatus, team, teamMembers]);

  // Set up real-time subscription for schedule changes
  useEffect(() => {
    if (!team || teamMembers.length === 0) return;

    console.log(`🔔 Setting up real-time subscription for team ${team.name}`);

    // Get current week dates for subscription filter
    const weekDays = TeamDailyCalculationService.getCurrentWeekDates(currentWeekOffset);
    const startDate = weekDays[0].toISOString().split('T')[0];
    const endDate = weekDays[6].toISOString().split('T')[0];

    // Subscribe to schedule changes for this team and week
    const subscription = DatabaseService.subscribeToScheduleChanges(
      startDate,
      endDate,
      team.id,
      () => {
        console.log('🔄 Schedule change detected, refreshing team daily status');
        fetchTeamDailyStatus();
      }
    );

    // Cleanup subscription on unmount or dependency change
    return () => {
      if (subscription) {
        console.log(`🔕 Cleaning up subscription for team ${team.name}`);
        subscription.unsubscribe();
      }
    };
  }, [team, teamMembers, currentWeekOffset, fetchTeamDailyStatus]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchTeamDailyStatus
  };
};

export default useTeamDailyStatus;