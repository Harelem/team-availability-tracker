'use client';

import { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '@/lib/database';
import { SprintCalculations } from '@/lib/sprintCalculations';
import { 
  TeamDetailData, 
  TeamInfo, 
  SprintSummary, 
  DetailedTeamMember, 
  TeamStatistics, 
  ActivityLog, 
  PendingEntry,
  UseTeamDetailReturn
} from '@/types/modalTypes';

export interface AccurateTeamData {
  teamInfo: {
    id: number;
    name: string;
    description?: string;
    managerName?: string;
    totalMembers: number;
    activeMembers: number;
  };
  currentSprint: {
    sprintId: string;
    sprintNumber: number;
    startDate: string;
    endDate: string;
    durationDays: number;
    potentialHours: number;
    plannedHours: number;
    completionPercentage: number;
    daysRemaining: number;
    isOnTrack: boolean;
    healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
    healthColor: string;
  };
  memberStats: Array<{
    id: number;
    name: string;
    hebrew?: string;
    isManager: boolean;
    plannedHours: number;
    potentialHours: number;
    completionPercentage: number;
    currentWeekHours: number;
    hasCompletedPlanning: boolean;
    availabilityStatus: 'available' | 'partial' | 'unavailable';
    availabilityColor: string;
    lastActivity: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    timestamp: string;
    description: string;
    memberName: string;
    details: string;
    date: string;
    hours: number;
  }>;
  quickStats: {
    averageUtilization: number;
    membersWithIncompleteHours: number;
    totalHoursThisWeek: number;
    sprintHealthStatus: 'excellent' | 'good' | 'warning' | 'critical';
  };
}

/**
 * Hook to fetch accurate team detail data from real database queries
 * Replaces the mock data in useTeamDetail with real calculations
 */
export function useTeamDetailData(teamId: number | null): {
  teamData: AccurateTeamData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [teamData, setTeamData] = useState<AccurateTeamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccurateTeamData = useCallback(async () => {
    if (!teamId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log(`🔍 Fetching accurate data for team ${teamId}...`);

      // 1. Get current sprint settings (REAL data)
      const currentSprint = await DatabaseService.getCurrentGlobalSprint();
      if (!currentSprint) {
        throw new Error('No active sprint found');
      }

      // 2. Get team information (REAL data)
      const teams = await DatabaseService.getOperationalTeams();
      const team = teams.find(t => t.id === teamId);
      if (!team) {
        throw new Error(`Team with ID ${teamId} not found`);
      }

      // 3. Get team members (REAL data)
      const teamMembers = await DatabaseService.getTeamMembers(teamId);
      const manager = teamMembers.find(m => m.isManager);

      // 4. Get schedule entries for current sprint (REAL data)
      const { startDate, endDate } = DatabaseService.getSprintDateRange(currentSprint);
      const scheduleData = await DatabaseService.getScheduleEntries(startDate, endDate, teamId);

      // 5. Calculate accurate sprint metrics using standardized calculations
      const workingDays = SprintCalculations.calculateWorkingDays(startDate, endDate);
      const sprintPotentialHours = SprintCalculations.calculateSprintPotential(
        teamMembers.length,
        startDate,
        endDate
      );

      // Convert schedule data to entries for calculation
      const scheduleEntries: Array<{ hours: number }> = [];
      
      // Iterate through all team members and their schedule entries
      Object.values(scheduleData).forEach(memberSchedule => {
        if (memberSchedule) {
          Object.values(memberSchedule).forEach(entry => {
            if (entry?.value) {
              const hours = entry.value === '1' ? 7 : entry.value === '0.5' ? 3.5 : 0;
              scheduleEntries.push({ hours });
            }
          });
        }
      });

      const plannedHours = SprintCalculations.calculateActualPlannedHours(scheduleEntries);
      const completionPercentage = SprintCalculations.calculateCompletionPercentage(
        plannedHours, 
        sprintPotentialHours
      );

      const daysRemaining = SprintCalculations.calculateDaysRemaining(endDate);
      const sprintProgress = SprintCalculations.calculateSprintProgress(startDate, endDate);
      const healthInfo = SprintCalculations.getSprintHealthStatus(
        completionPercentage,
        sprintProgress,
        daysRemaining
      );

      // 6. Calculate individual member statistics (REAL data)
      const memberStats = teamMembers.map(member => {
        const memberData = scheduleData[member.id] || {};
        const memberEntries = Object.entries(memberData).map(([date, entry]) => ({
          date,
          hours: entry?.value === '1' ? 7 : entry?.value === '0.5' ? 3.5 : 0
        }));

        const memberPlannedHours = memberEntries.reduce((sum, e) => sum + e.hours, 0);
        const memberPotentialHours = workingDays * 7; // 7 hours per day
        const memberCompletionPercentage = memberPotentialHours > 0 
          ? Math.round((memberPlannedHours / memberPotentialHours) * 100)
          : 0;

        // Calculate current week hours
        const currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

        const currentWeekHours = memberEntries
          .filter(e => {
            const entryDate = new Date(e.date);
            return entryDate >= currentWeekStart && entryDate <= currentWeekEnd;
          })
          .reduce((sum, e) => sum + e.hours, 0);

        // Check if member has completed their planning
        const expectedEntries = workingDays;
        const actualEntries = memberEntries.filter(e => e.hours > 0).length;
        const hasCompletedPlanning = actualEntries >= expectedEntries * 0.8; // 80% threshold

        // Determine availability status
        let availabilityStatus: 'available' | 'partial' | 'unavailable';
        let availabilityColor: string;
        
        if (currentWeekHours >= 30) {
          availabilityStatus = 'available';
          availabilityColor = '#10B981';
        } else if (currentWeekHours >= 15) {
          availabilityStatus = 'partial';
          availabilityColor = '#F59E0B';
        } else {
          availabilityStatus = 'unavailable';
          availabilityColor = '#EF4444';
        }

        // Find last activity (most recent schedule update)
        const lastActivityDate = Object.keys(memberData).sort().pop();
        const lastActivity = lastActivityDate ? new Date(lastActivityDate).toISOString() : null;

        return {
          id: member.id,
          name: member.name,
          hebrew: member.hebrew,
          isManager: Boolean(member.isManager),
          plannedHours: memberPlannedHours,
          potentialHours: memberPotentialHours,
          completionPercentage: memberCompletionPercentage,
          currentWeekHours,
          hasCompletedPlanning,
          availabilityStatus,
          availabilityColor,
          lastActivity
        };
      });

      // 7. Get recent activity (REAL data from schedule updates)
      const recentActivity = [];

      // Create activity entries from all schedule updates in the sprint period
      for (const member of teamMembers) {
        const memberData = scheduleData[member.id] || {};
        for (const [date, entry] of Object.entries(memberData)) {
          if (entry?.value) {
            const entryDate = new Date(date);
            recentActivity.push({
              id: `${member.id}-${date}`,
              timestamp: entryDate.toISOString(),
              description: 'Updated availability',
              memberName: member.name,
              details: `Set ${entry.value === '1' ? 'full day' : entry.value === '0.5' ? 'half day' : 'unavailable'} for ${entryDate.toLocaleDateString()}`,
              date,
              hours: entry.value === '1' ? 7 : entry.value === '0.5' ? 3.5 : 0
            });
          }
        }
      }

      // Sort by most recent first
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // 8. Calculate team statistics (REAL data)
      const averageUtilization = memberStats.length > 0 
        ? Math.round(memberStats.reduce((sum, m) => sum + m.completionPercentage, 0) / memberStats.length)
        : 0;

      const membersWithIncompleteHours = memberStats.filter(m => !m.hasCompletedPlanning).length;
      const totalHoursThisWeek = memberStats.reduce((sum, m) => sum + m.currentWeekHours, 0);
      const activeMembers = memberStats.filter(m => m.hasCompletedPlanning).length;

      // Set accurate team data
      setTeamData({
        teamInfo: {
          id: teamId,
          name: team.name,
          description: team.description,
          managerName: manager?.name,
          totalMembers: teamMembers.length,
          activeMembers
        },
        currentSprint: {
          sprintId: currentSprint.id?.toString() || 'current',
          sprintNumber: currentSprint.current_sprint_number || 1,
          startDate,
          endDate,
          durationDays: workingDays,
          potentialHours: sprintPotentialHours,
          plannedHours,
          completionPercentage,
          daysRemaining,
          isOnTrack: healthInfo.status === 'excellent' || healthInfo.status === 'good',
          healthStatus: healthInfo.status,
          healthColor: healthInfo.color
        },
        memberStats,
        recentActivity: recentActivity.slice(0, 10), // Top 10 most recent
        quickStats: {
          averageUtilization,
          membersWithIncompleteHours,
          totalHoursThisWeek,
          sprintHealthStatus: healthInfo.status
        }
      });

      console.log(`✅ Successfully loaded accurate data for team ${team.name}`);
      console.log(`📊 Sprint potential: ${sprintPotentialHours}h (${teamMembers.length} members × ${workingDays} days × 7h)`);
      console.log(`📊 Planned hours: ${plannedHours}h (${completionPercentage}% completion)`);

    } catch (err) {
      console.error('❌ Error fetching accurate team data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (!teamId) {
      setTeamData(null);
      setError(null);
      return;
    }

    fetchAccurateTeamData();
  }, [teamId, fetchAccurateTeamData]);

  return {
    teamData,
    isLoading,
    error,
    refetch: fetchAccurateTeamData
  };
}

/**
 * Helper function to convert AccurateTeamData to legacy TeamDetailData format
 * for backward compatibility with existing TeamDetailModal
 */
export function convertToLegacyFormat(accurateData: AccurateTeamData): TeamDetailData {
  return {
    teamInfo: {
      id: accurateData.teamInfo.id,
      name: accurateData.teamInfo.name,
      description: accurateData.teamInfo.description,
      color: '#3B82F6', // Default blue
      managerName: accurateData.teamInfo.managerName,
      managerEmail: undefined,
      memberCount: accurateData.teamInfo.totalMembers,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    currentSprint: {
      sprintNumber: accurateData.currentSprint.sprintNumber,
      startDate: accurateData.currentSprint.startDate,
      endDate: accurateData.currentSprint.endDate,
      lengthWeeks: Math.ceil(accurateData.currentSprint.durationDays / 5), // Convert days to weeks
      potentialHours: accurateData.currentSprint.potentialHours,
      plannedHours: accurateData.currentSprint.plannedHours,
      completedHours: 0, // Not tracked in new system
      completionPercentage: accurateData.currentSprint.completionPercentage,
      daysRemaining: accurateData.currentSprint.daysRemaining,
      progressPercentage: SprintCalculations.calculateSprintProgress(
        accurateData.currentSprint.startDate,
        accurateData.currentSprint.endDate
      ),
      healthStatus: accurateData.currentSprint.healthStatus,
      healthColor: accurateData.currentSprint.healthColor,
      isActive: true
    },
    members: accurateData.memberStats.map(member => ({
      id: member.id,
      name: member.name,
      hebrew: member.hebrew || '',
      email: '',
      team_id: accurateData.teamInfo.id || 0,
      isManager: member.isManager,
      role: member.isManager ? 'manager' : 'member',
      currentWeekStatus: member.availabilityStatus,
      currentWeekHours: member.currentWeekHours,
      sprintPlannedHours: member.plannedHours,
      sprintCompletedHours: member.plannedHours, // Assume planned = completed for now
      individualCompletionPercentage: member.completionPercentage,
      lastActivityTimestamp: member.lastActivity || undefined,
      lastActivityDescription: 'Updated schedule',
      availabilityColor: member.availabilityColor
    })),
    statistics: {
      averageUtilization: accurateData.quickStats.averageUtilization,
      currentSprintUtilization: accurateData.quickStats.averageUtilization,
      mostProductiveDay: 'Tuesday', // Default - would need more data to calculate
      mostProductiveDayHours: Math.round(accurateData.quickStats.totalHoursThisWeek / 5),
      topAbsenceReasons: [],
      trendIndicator: accurateData.quickStats.sprintHealthStatus === 'excellent' ? 'improving' : 
                     accurateData.quickStats.sprintHealthStatus === 'critical' ? 'declining' : 'stable',
      trendPercentage: 0,
      comparisonToOtherTeams: {
        rank: 1,
        totalTeams: 5,
        percentile: 80
      },
      weeklyTrends: []
    },
    recentActivity: accurateData.recentActivity.map(activity => ({
      id: activity.id,
      timestamp: activity.timestamp,
      type: 'schedule_update',
      description: activity.description,
      userName: activity.memberName,
      userId: undefined,
      memberName: activity.memberName,
      details: activity.details,
      icon: '📅',
      color: '#3B82F6'
    })),
    pendingEntries: [], // Would need additional logic to determine pending items
    lastUpdated: new Date().toISOString()
  };
}