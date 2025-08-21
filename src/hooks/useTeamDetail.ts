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
import { RealTimeCalculationService } from '@/lib/realTimeCalculationService';

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

  // Fetch detailed team members with real-time data
  const fetchDetailedMembers = async (id: number): Promise<DetailedTeamMember[]> => {
    try {
      const members = await DatabaseService.getTeamMembers(id);
      
      // Get real-time submission status for all team members
      const memberSubmissionStatuses = await RealTimeCalculationService.getTeamMemberSubmissionStatus(id);
      
      // Transform members with real data from submission statuses
      const detailedMembers: DetailedTeamMember[] = members.map(member => {
        // Find real-time data for this member
        const submissionStatus = memberSubmissionStatuses.find(status => status.memberId === member.id);
        
        if (submissionStatus) {
          // Use real data from submission status
          const currentWeekHours = submissionStatus.currentWeekHours;
          const sprintPlannedHours = submissionStatus.sprintPotentialHours;
          const sprintCompletedHours = submissionStatus.sprintSubmittedHours;
          
          let currentWeekStatus: 'available' | 'partial' | 'unavailable';
          let availabilityColor: string;
          
          // Map submission status to availability status
          switch (submissionStatus.currentWeekStatus) {
            case 'complete':
              currentWeekStatus = 'available';
              availabilityColor = '#10B981'; // green
              break;
            case 'partial':
              currentWeekStatus = 'partial';
              availabilityColor = '#F59E0B'; // amber
              break;
            default:
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
            individualCompletionPercentage: submissionStatus.sprintCompletionPercentage,
            lastActivityTimestamp: submissionStatus.lastActivityDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            lastActivityDescription: submissionStatus.pendingEntries > 0 ? `${submissionStatus.pendingEntries} days pending` : 'Schedule up to date',
            availabilityColor
          };
        } else {
          // Fallback to empty data if no submission status found
          return {
            ...member,
            role: member.isManager ? 'manager' : 'member',
            currentWeekStatus: 'unavailable',
            currentWeekHours: 0,
            sprintPlannedHours: 0,
            sprintCompletedHours: 0,
            individualCompletionPercentage: 0,
            lastActivityTimestamp: new Date().toISOString(),
            lastActivityDescription: 'No schedule data',
            availabilityColor: '#EF4444' // red
          };
        }
      });

      return detailedMembers.sort((a, b) => {
        // Sort managers first, then by completion percentage
        if (a.isManager && !b.isManager) return -1;
        if (!a.isManager && b.isManager) return 1;
        return b.individualCompletionPercentage - a.individualCompletionPercentage;
      });
    } catch (err) {
      console.error('Error fetching detailed members with real-time data:', err);
      
      // Fallback to basic member data
      try {
        const members = await DatabaseService.getTeamMembers(id);
        return members.map(member => ({
          ...member,
          role: member.isManager ? 'manager' : 'member',
          currentWeekStatus: 'unavailable' as const,
          currentWeekHours: 0,
          sprintPlannedHours: 0,
          sprintCompletedHours: 0,
          individualCompletionPercentage: 0,
          lastActivityTimestamp: new Date().toISOString(),
          lastActivityDescription: 'Data unavailable',
          availabilityColor: '#9CA3AF' // gray
        }));
      } catch (fallbackErr) {
        console.error('Fallback member fetch also failed:', fallbackErr);
        throw new Error(`Failed to fetch team members: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  // Fetch team statistics with real-time calculations
  const fetchTeamStatistics = async (id: number): Promise<TeamStatistics> => {
    try {
      // Get real-time team completion status
      const teamCompletionStatus = await RealTimeCalculationService.getTeamCompletionStatus(id);
      
      // Calculate current sprint utilization from real data
      const currentSprintUtilization = teamCompletionStatus.sprintPotentialHours > 0
        ? Math.round((teamCompletionStatus.totalSubmittedHours / teamCompletionStatus.sprintPotentialHours) * 100)
        : 0;
      
      // For now, use some mock data for historical trends until we implement historical data tracking
      // In a full implementation, these would be calculated from historical schedule entries
      const mockWeeklyTrends: WeeklyTrend[] = [
        { week: '2024-01-01', utilization: Math.max(50, currentSprintUtilization - 10), hours: Math.floor(teamCompletionStatus.totalSubmittedHours * 0.8) },
        { week: '2024-01-08', utilization: Math.max(60, currentSprintUtilization - 5), hours: Math.floor(teamCompletionStatus.totalSubmittedHours * 0.9) },
        { week: '2024-01-15', utilization: Math.max(70, currentSprintUtilization + 2), hours: Math.floor(teamCompletionStatus.totalSubmittedHours * 0.95) },
        { week: '2024-01-22', utilization: currentSprintUtilization, hours: teamCompletionStatus.totalSubmittedHours }
      ];

      // Mock absence reasons - in real implementation, these would be calculated from schedule entries with reason='X'
      const mockAbsenceReasons: AbsenceReason[] = [
        { reason: 'Sick Leave', count: Math.floor(teamCompletionStatus.totalMembers * 0.3), percentage: 35 },
        { reason: 'Personal Time', count: Math.floor(teamCompletionStatus.totalMembers * 0.2), percentage: 22 },
        { reason: 'Training', count: Math.floor(teamCompletionStatus.totalMembers * 0.15), percentage: 18 }
      ];

      const averageUtilization = mockWeeklyTrends.reduce((sum, week) => sum + week.utilization, 0) / mockWeeklyTrends.length;
      const recentTrend = mockWeeklyTrends.slice(-2);
      const trendPercentage = recentTrend.length >= 2 && recentTrend[0] && recentTrend[1] && recentTrend[0].utilization
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

      // Get company-wide data for comparison
      const companyStatus = await RealTimeCalculationService.getCompanyCompletionStatus();
      const teamRank = companyStatus.teamsData
        .sort((a, b) => b.completionRate - a.completionRate)
        .findIndex(team => team.id === id) + 1;
      
      const percentile = companyStatus.totalTeams > 0 
        ? Math.round(((companyStatus.totalTeams - teamRank + 1) / companyStatus.totalTeams) * 100)
        : 100;

      return {
        averageUtilization,
        currentSprintUtilization,
        mostProductiveDay: 'Tuesday', // Could be calculated from schedule entries by day of week
        mostProductiveDayHours: Math.floor(teamCompletionStatus.totalSubmittedHours / 10), // Estimate
        topAbsenceReasons: mockAbsenceReasons,
        trendIndicator,
        trendPercentage: Math.abs(trendPercentage),
        comparisonToOtherTeams: {
          rank: teamRank,
          totalTeams: companyStatus.totalTeams,
          percentile
        },
        weeklyTrends: mockWeeklyTrends
      };
    } catch (err) {
      console.error('Error fetching team statistics with real-time data:', err);
      
      // Fallback to basic mock data
      const fallbackTrends: WeeklyTrend[] = [
        { week: '2024-01-01', utilization: 0, hours: 0 },
        { week: '2024-01-08', utilization: 0, hours: 0 },
        { week: '2024-01-15', utilization: 0, hours: 0 },
        { week: '2024-01-22', utilization: 0, hours: 0 }
      ];
      
      return {
        averageUtilization: 0,
        currentSprintUtilization: 0,
        mostProductiveDay: 'Unknown',
        mostProductiveDayHours: 0,
        topAbsenceReasons: [],
        trendIndicator: 'stable',
        trendPercentage: 0,
        comparisonToOtherTeams: {
          rank: 1,
          totalTeams: 1,
          percentile: 100
        },
        weeklyTrends: fallbackTrends
      };
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
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
          type: 'missing_schedule',
          description: 'Schedule not submitted for tomorrow',
          priority: 'high'
        },
        {
          memberId: 2,
          memberName: 'Jane Smith',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
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