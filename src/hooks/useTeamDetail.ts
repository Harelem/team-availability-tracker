'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DatabaseService } from '@/lib/database';
import { 
  UseTeamDetailReturn, 
  TeamDetailData, 
  TeamInfo, 
  SprintSummary, 
  DetailedTeamMember, 
  TeamStatistics, 
  ActivityLog, 
  PendingEntry,
  AbsenceReason,
  WeeklyTrend
} from '@/types/modalTypes';
import { CalculationService, formatHours, formatPercentage } from '@/lib/calculationService';

// Cache for team data to avoid unnecessary refetches
const teamDataCache = new Map<number, { data: TeamDetailData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook to fetch and manage comprehensive team detail data
 */
export function useTeamDetail(teamId: number | null): UseTeamDetailReturn {
  const [data, setData] = useState<TeamDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check cache for existing data
  const getCachedData = useCallback((id: number): TeamDetailData | null => {
    const cached = teamDataCache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, []);

  // Cache team data
  const setCachedData = useCallback((id: number, teamData: TeamDetailData) => {
    teamDataCache.set(id, {
      data: teamData,
      timestamp: Date.now()
    });
  }, []);

  // Fetch team basic information
  const fetchTeamInfo = async (id: number): Promise<TeamInfo> => {
    try {
      const teams = await DatabaseService.getOperationalTeams();
      const team = teams.find(t => t.id === id);
      
      if (!team) {
        throw new Error(`Team with ID ${id} not found`);
      }

      const members = await DatabaseService.getTeamMembers(id);
      const manager = members.find(m => m.isManager);

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        color: team.color,
        managerName: manager?.name,
        managerEmail: manager?.email,
        memberCount: members.length,
        created_at: team.created_at,
        updated_at: team.updated_at
      };
    } catch (err) {
      console.error('Error fetching team info:', err);
      throw new Error(`Failed to fetch team information: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Fetch current sprint summary
  const fetchSprintSummary = async (id: number): Promise<SprintSummary> => {
    try {
      const currentSprint = await DatabaseService.getCurrentGlobalSprint();
      const teamStats = await DatabaseService.getTeamSprintStats(id);
      
      if (!currentSprint) {
        throw new Error('No active sprint found');
      }

      const sprintStartDate = new Date(currentSprint.sprint_start_date);
      const sprintEndDate = new Date(currentSprint.sprint_end_date);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((sprintEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Calculate health status based on progress and utilization
      let healthStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
      let healthColor = '#10B981'; // green
      
      const utilizationRate = teamStats?.capacity_utilization || 0;
      if (utilizationRate >= 90) {
        healthStatus = 'excellent';
        healthColor = '#10B981'; // green
      } else if (utilizationRate >= 75) {
        healthStatus = 'good';
        healthColor = '#059669'; // green-600
      } else if (utilizationRate >= 60) {
        healthStatus = 'warning';
        healthColor = '#F59E0B'; // amber
      } else {
        healthStatus = 'critical';
        healthColor = '#EF4444'; // red
      }

      return {
        sprintNumber: currentSprint.current_sprint_number,
        startDate: currentSprint.sprint_start_date,
        endDate: currentSprint.sprint_end_date,
        lengthWeeks: currentSprint.sprint_length_weeks,
        potentialHours: teamStats?.potential_hours || 0,
        plannedHours: teamStats?.sprint_hours || 0,
        completedHours: teamStats?.current_week_hours || 0,
        completionPercentage: teamStats ? (teamStats.current_week_hours / teamStats.sprint_hours) * 100 : 0,
        daysRemaining,
        progressPercentage: currentSprint.progress_percentage,
        healthStatus,
        healthColor,
        isActive: currentSprint.is_active
      };
    } catch (err) {
      console.error('Error fetching sprint summary:', err);
      throw new Error(`Failed to fetch sprint summary: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Fetch detailed team members
  const fetchDetailedMembers = async (id: number): Promise<DetailedTeamMember[]> => {
    try {
      const members = await DatabaseService.getTeamMembers(id);
      
      // Transform members with additional details
      const detailedMembers: DetailedTeamMember[] = members.map(member => {
        // Mock additional data - in a real implementation, this would come from the database
        const currentWeekHours = Math.floor(Math.random() * 35) + 5; // 5-40 hours
        const sprintPlannedHours = Math.floor(Math.random() * 70) + 30; // 30-100 hours
        const sprintCompletedHours = Math.floor(sprintPlannedHours * (Math.random() * 0.8 + 0.2)); // 20-100% completion
        
        let currentWeekStatus: 'available' | 'partial' | 'unavailable';
        let availabilityColor: string;
        
        if (currentWeekHours >= 30) {
          currentWeekStatus = 'available';
          availabilityColor = '#10B981'; // green
        } else if (currentWeekHours >= 15) {
          currentWeekStatus = 'partial';
          availabilityColor = '#F59E0B'; // amber
        } else {
          currentWeekStatus = 'unavailable';
          availabilityColor = '#EF4444'; // red
        }

        return {
          ...member,
          role: member.isManager ? 'manager' : 'member',
          currentWeekStatus,
          currentWeekHours,
          sprintPlannedHours,
          sprintCompletedHours,
          individualCompletionPercentage: (sprintCompletedHours / sprintPlannedHours) * 100,
          lastActivityTimestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastActivityDescription: 'Updated schedule',
          availabilityColor
        };
      });

      return detailedMembers.sort((a, b) => {
        // Sort managers first, then by name
        if (a.isManager && !b.isManager) return -1;
        if (!a.isManager && b.isManager) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (err) {
      console.error('Error fetching detailed members:', err);
      throw new Error(`Failed to fetch team members: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Fetch team statistics
  const fetchTeamStatistics = async (id: number): Promise<TeamStatistics> => {
    try {
      // Mock statistics data - in a real implementation, this would be calculated from actual data
      const mockWeeklyTrends: WeeklyTrend[] = [
        { week: '2024-01-01', utilization: 85, hours: 280 },
        { week: '2024-01-08', utilization: 92, hours: 315 },
        { week: '2024-01-15', utilization: 78, hours: 265 },
        { week: '2024-01-22', utilization: 88, hours: 295 }
      ];

      const mockAbsenceReasons: AbsenceReason[] = [
        { reason: 'Sick Leave', count: 8, percentage: 35 },
        { reason: 'Personal Time', count: 5, percentage: 22 },
        { reason: 'Training', count: 4, percentage: 18 }
      ];

      const averageUtilization = mockWeeklyTrends.reduce((sum, week) => sum + week.utilization, 0) / mockWeeklyTrends.length;
      const recentTrend = mockWeeklyTrends.slice(-2);
      const trendPercentage = recentTrend.length >= 2 
        ? ((recentTrend[1].utilization - recentTrend[0].utilization) / recentTrend[0].utilization) * 100
        : 0;

      let trendIndicator: 'improving' | 'stable' | 'declining';
      if (trendPercentage > 5) {
        trendIndicator = 'improving';
      } else if (trendPercentage < -5) {
        trendIndicator = 'declining';
      } else {
        trendIndicator = 'stable';
      }

      return {
        averageUtilization,
        currentSprintUtilization: mockWeeklyTrends[mockWeeklyTrends.length - 1].utilization,
        mostProductiveDay: 'Tuesday',
        mostProductiveDayHours: 42,
        topAbsenceReasons: mockAbsenceReasons,
        trendIndicator,
        trendPercentage: Math.abs(trendPercentage),
        comparisonToOtherTeams: {
          rank: Math.floor(Math.random() * 5) + 1,
          totalTeams: 5,
          percentile: Math.floor(Math.random() * 40) + 60 // 60-100th percentile
        },
        weeklyTrends: mockWeeklyTrends
      };
    } catch (err) {
      console.error('Error fetching team statistics:', err);
      throw new Error(`Failed to fetch team statistics: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Fetch activity log
  const fetchActivityLog = async (id: number): Promise<ActivityLog[]> => {
    try {
      // Mock activity data - in a real implementation, this would come from audit logs
      const mockActivities: ActivityLog[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: 'schedule_update',
          description: 'Updated weekly schedule',
          userName: 'John Doe',
          userId: 1,
          memberName: 'John Doe',
          details: 'Changed availability for Wednesday',
          icon: '📅',
          color: '#3B82F6'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          type: 'member_added',
          description: 'New team member added',
          userName: 'Team Manager',
          memberName: 'Jane Smith',
          details: 'Added as Software Engineer',
          icon: '👋',
          color: '#10B981'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          type: 'sprint_change',
          description: 'Sprint dates updated',
          userName: 'System',
          details: 'Extended sprint by 2 days',
          icon: '🏃',
          color: '#F59E0B'
        }
      ];

      return mockActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (err) {
      console.error('Error fetching activity log:', err);
      throw new Error(`Failed to fetch activity log: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Fetch pending entries
  const fetchPendingEntries = async (id: number): Promise<PendingEntry[]> => {
    try {
      // Mock pending entries - in a real implementation, this would check for incomplete data
      const mockPendingEntries: PendingEntry[] = [
        {
          memberId: 1,
          memberName: 'John Doe',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: 'missing_schedule',
          description: 'Schedule not submitted for tomorrow',
          priority: 'high'
        },
        {
          memberId: 2,
          memberName: 'Jane Smith',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          type: 'missing_reason',
          description: 'Absence reason not provided',
          priority: 'medium'
        }
      ];

      return mockPendingEntries.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (err) {
      console.error('Error fetching pending entries:', err);
      return []; // Return empty array for non-critical data
    }
  };

  // Main fetch function
  const fetchTeamDetail = useCallback(async (id: number): Promise<TeamDetailData> => {
    // Check cache first
    const cachedData = getCachedData(id);
    if (cachedData) {
      return cachedData;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Fetch all data in parallel
      const [teamInfo, currentSprint, members, statistics, recentActivity, pendingEntries] = await Promise.all([
        fetchTeamInfo(id),
        fetchSprintSummary(id),
        fetchDetailedMembers(id),
        fetchTeamStatistics(id),
        fetchActivityLog(id),
        fetchPendingEntries(id)
      ]);

      const teamDetailData: TeamDetailData = {
        teamInfo,
        currentSprint,
        members,
        statistics,
        recentActivity,
        pendingEntries,
        lastUpdated: new Date().toISOString()
      };

      // Cache the data
      setCachedData(id, teamDetailData);

      return teamDetailData;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw err;
    }
  }, [getCachedData, setCachedData]);

  // Refetch function
  const refetch = useCallback(async () => {
    if (!teamId) return;

    // Clear cache for this team to force fresh data
    teamDataCache.delete(teamId);
    
    setLoading(true);
    setError(null);

    try {
      const teamData = await fetchTeamDetail(teamId);
      setData(teamData);
      setLastFetch(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error refetching team detail:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId, fetchTeamDetail]);

  // Main effect to fetch data when teamId changes
  useEffect(() => {
    if (!teamId) {
      setData(null);
      setError(null);
      setLastFetch(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchTeamDetail(teamId)
      .then(teamData => {
        setData(teamData);
        setLastFetch(new Date());
      })
      .catch(err => {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team details';
        setError(errorMessage);
        console.error('Error fetching team detail:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [teamId, fetchTeamDetail]);

  return {
    data,
    loading,
    error,
    refetch,
    lastFetch
  };
}