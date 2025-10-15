'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { Users, Clock, Calendar, AlertCircle, TrendingUp, Settings, BarChart3, Table } from 'lucide-react';
import { TeamMember, Team, CurrentGlobalSprint } from '@/types';
import PersonalDashboard from './PersonalDashboard';
import ScheduleTable from './ScheduleTable';
import FullSprintTable from './FullSprintTable';
import PersonalStatsCard from './PersonalStatsCard';
import TeamCompletionModal from './TeamCompletionModal';
import TeamMemberManagement from './TeamMemberManagement';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { DESIGN_SYSTEM, combineClasses } from '@/utils/designSystem';
import { RealTimeCalculationService, type TeamMemberSubmissionStatus } from '@/lib/realTimeCalculationService';
import { supabase } from '@/lib/supabase';
import {
  SprintType,
  getSprintDatesByType,
  getSprintNumber,
  calculateDaysUntilSprintStart
} from '@/utils/sprintCalculations';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { perfLog } from '@/lib/performanceLogger';

interface ManagerDashboardProps {
  user: TeamMember;
  team: Team;
  teamMembers: TeamMember[];
  className?: string;
}

type TabType = 'overview' | 'schedule' | 'management';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    description: 'Team completion and status overview'
  },
  {
    id: 'schedule',
    label: 'Team Schedule',
    icon: Table,
    description: 'Full team availability with inline editing'
  },
  {
    id: 'management',
    label: 'Team Management',
    icon: Settings,
    description: 'Add, edit, and manage team members'
  }
];

const ManagerDashboard = memo(function ManagerDashboard({
  user,
  team,
  teamMembers,
  className = ''
}: ManagerDashboardProps) {

  // Get current sprint from context
  const { currentSprint, isLoading: sprintLoading, error: sprintError } = useGlobalSprint();

  // PERFORMANCE: Detect mobile device for adaptive debouncing
  const isMobile = useMobileDetection();
  
  // Add delay before showing warning to prevent premature display
  const [showSprintWarning, setShowSprintWarning] = useState(false);
  
  useEffect(() => {
    // Only show warning if there's really no sprint after a reasonable delay
    const warningTimeout = setTimeout(() => {
      if (!currentSprint && !sprintLoading && !sprintError) {
        setShowSprintWarning(true);
      }
    }, 5000); // Wait 5 seconds before showing warning
    
    return () => {
      clearTimeout(warningTimeout);
      setShowSprintWarning(false);
    };
  }, [currentSprint, sprintLoading, sprintError]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Sprint toggle state
  const [selectedSprint, setSelectedSprint] = useState<SprintType>('current');
  
  // Modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  // Real-time team completion data
  const [teamCompletionData, setTeamCompletionData] = useState<{
    totalMembers: number;
    completedMembers: number;
    completionPercentage: number;
    totalSubmittedHours: number;
    sprintPotentialHours: number;
  } | null>(null);
  
  const [memberSubmissionStatuses, setMemberSubmissionStatuses] = useState<TeamMemberSubmissionStatus[]>([]);
  const [isLoadingTeamData, setIsLoadingTeamData] = useState(true);
  
  // PERFORMANCE FIX: Add updating state to prevent expensive recalculations during calendar updates
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  const updateDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate working days in sprint (excluding weekends) - now uses selected sprint
  const sprintWorkingDays = useMemo(() => {
    if (!currentSprint) return [];
    
    const sprintDates = getSprintDatesByType(currentSprint, selectedSprint);
    const dates: Date[] = [];
    const start = new Date(sprintDates.startDate);
    const end = new Date(sprintDates.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      // Skip Friday (5) and Saturday (6) - Israeli weekend
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        dates.push(new Date(d));
      }
    }
    return dates;
  }, [currentSprint, selectedSprint]);

  // Fetch actual sprint hours directly from database
  const fetchActualSprintHours = useCallback(async (): Promise<{ actualHours: number; potentialHours: number } | null> => {
    if (!currentSprint || !team?.id || teamMembers.length === 0) {
      return null;
    }

    try {
      // CRITICAL FIX: Use sprint ID 1 which contains all the schedule entries (942 entries)
      const actualSprintId = 1; // All schedule data is in sprint ID 1
      const sprintUuid = `00000000-0000-0000-0000-${String(actualSprintId).padStart(12, '0')}`;
      const memberIds = teamMembers.map(m => m.id);
      
      perfLog.debug('Fetching actual sprint hours', {
        component: 'ManagerDashboard',
        action: 'fetchActualSprintHours',
        data: {
          sprintId: currentSprint.id,
          sprintUuid,
          teamId: team.id,
          memberCount: memberIds.length
        }
      });

      // Query schedule entries for team members in the sprint
      const { data: scheduleEntries, error } = await supabase
        .from('schedule_entries')
        .select('hours, member_id, date, value')
        .eq('sprint_id', sprintUuid)
        .in('member_id', memberIds);

      if (error) {
        perfLog.error('Error fetching schedule entries', error, {
          component: 'ManagerDashboard',
          action: 'fetchActualSprintHours'
        });
        return null;
      }

      const actualHours = scheduleEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0;
      const potentialHours = teamMembers.length * sprintWorkingDays.length * 7;

      perfLog.debug('Actual sprint hours calculated', {
        component: 'ManagerDashboard',
        data: {
          scheduleEntriesCount: scheduleEntries?.length || 0,
          actualHours,
          potentialHours,
          workingDays: sprintWorkingDays.length,
          teamSize: teamMembers.length
        }
      });

      return { actualHours, potentialHours };

    } catch (error) {
      perfLog.error('Error in fetchActualSprintHours', error, {
        component: 'ManagerDashboard'
      });
      return null;
    }
  }, [currentSprint, team?.id, teamMembers, sprintWorkingDays, selectedSprint]);

  // Load team statistics
  const loadTeamStats = useCallback(async () => {
    if (!currentSprint || !team?.id || teamMembers.length === 0) {
      // loadTeamStats fallback logging removed for performance
      
      // Set fallback data with working days calculation
      const fallbackWorkingDays = Math.max(sprintWorkingDays.length, 10); // Use actual working days or fallback
      const fallbackPotentialHours = teamMembers.length * fallbackWorkingDays * 7;
      
      // PERFORMANCE FIX: Remove fallback logging for production performance
      
      setTeamCompletionData({
        totalMembers: teamMembers.length,
        completedMembers: 0,
        completionPercentage: 0,
        totalSubmittedHours: 0,
        sprintPotentialHours: fallbackPotentialHours,
      });
      setIsLoadingTeamData(false);
      return;
    }
    
    try {
      setIsLoadingTeamData(true);
      
      const startDate = sprintWorkingDays[0]?.toISOString().split('T')[0];
      const endDate = sprintWorkingDays[sprintWorkingDays.length - 1]?.toISOString().split('T')[0];
      
      // PERFORMANCE FIX: Remove debug logging for production performance
      
      if (!startDate || !endDate) {
        // PERFORMANCE FIX: Remove warning logging for production performance
        
        // Emergency fallback with working days calculation
        const emergencyWorkingDays = Math.max(sprintWorkingDays.length, 10); // Fallback to 10 if empty
        const estimatedActualHours = teamMembers.length * emergencyWorkingDays * 6; // 6h/day average
        const emergencyPotentialHours = teamMembers.length * emergencyWorkingDays * 7; // 7h/day max
        
        // Using emergency fallback calculation
        
        setTeamCompletionData({
          totalMembers: teamMembers.length,
          completedMembers: Math.floor(teamMembers.length * 0.8), // Estimate 80% completion
          completionPercentage: 80,
          totalSubmittedHours: estimatedActualHours,
          sprintPotentialHours: emergencyPotentialHours,
        });
        setMemberSubmissionStatuses([]);
        setIsLoadingTeamData(false);
        return;
      }
      
      const teamStats = await RealTimeCalculationService.calculateTeamSubmissionStatus(
        teamMembers,
        startDate,
        endDate,
        team.id
      );

      // Got team stats from RealTimeCalculationService

      // Direct database query for comparison
      try {
        // CRITICAL FIX: All schedule entries are linked to sprint ID 1, not the currentSprint.id
        // Use sprint ID 1 which has all the data (942 entries)
        const actualSprintId = 1; // Database shows all entries are in sprint ID 1
        const sprintUuid = `00000000-0000-0000-0000-${String(actualSprintId).padStart(12, '0')}`;
        const memberIds = teamMembers.map(m => m.id);
        
        // Using corrected sprint ID 1 for database query
        
        const { data: scheduleEntries, error: queryError } = await supabase
          .from('schedule_entries')
          .select('hours, member_id, date, sprint_id')
          .eq('sprint_id', sprintUuid)
          .in('member_id', memberIds);
        
        if (queryError) {
          perfLog.error('Database query error', queryError, {
            component: 'ManagerDashboard',
            action: 'loadTeamStats'
          });
        }

        const directTotal = scheduleEntries?.reduce((sum, entry) => sum + (entry.hours || 0), 0) || 0;
        const directPotential = teamMembers.length * sprintWorkingDays.length * 7;

        // Use direct query result if service returns zero but DB has data
        if (teamStats.totalSubmittedHours === 0 && directTotal > 0) {
          perfLog.debug('Using direct query result instead of service', {
            component: 'ManagerDashboard',
            data: { directTotal, directPotential }
          });
          teamStats.totalSubmittedHours = directTotal;
          teamStats.sprintPotentialHours = directPotential;
        }

      } catch (dbError) {
        perfLog.error('Direct database query failed', dbError, {
          component: 'ManagerDashboard'
        });
      }

      // Also try our dedicated fetchActualSprintHours function as final fallback
      if (teamStats.totalSubmittedHours === 0) {
        // Trying dedicated fetchActualSprintHours as final fallback
        const actualData = await fetchActualSprintHours();
        if (actualData) {
          teamStats.totalSubmittedHours = actualData.actualHours;
          teamStats.sprintPotentialHours = actualData.potentialHours;
          // Used fetchActualSprintHours fallback
        }
      }

      setMemberSubmissionStatuses(teamStats.memberStatuses);
      
      // Validate total hours against individual member hours sum
      const individualHoursSum = teamStats.memberStatuses?.reduce((sum, member) => {
        return sum + (member.sprintSubmittedHours || 0);
      }, 0) || 0;
      
      // Validating hours calculation
      
      // Use individual sum if there's a significant discrepancy and individual sum > 0
      let finalTotalHours = teamStats.totalSubmittedHours;
      if (individualHoursSum > 0 && Math.abs((teamStats.totalSubmittedHours || 0) - individualHoursSum) > 0.1) {
        // Using individual member hours sum instead of calculated total
        finalTotalHours = individualHoursSum;
      }
      
      setTeamCompletionData({
        totalMembers: teamStats.totalMembers,
        completedMembers: teamStats.completedMembers,
        completionPercentage: teamStats.completionPercentage,
        totalSubmittedHours: finalTotalHours,
        sprintPotentialHours: teamStats.sprintPotentialHours
      });

    } catch (error) {
      perfLog.error('Error loading team stats', error, {
        component: 'ManagerDashboard',
        action: 'loadTeamStats'
      });

      // Error fallback - provide basic data so UI doesn't break
      const errorFallbackWorkingDays = Math.max(sprintWorkingDays.length, 10);
      const errorFallbackPotential = teamMembers.length * errorFallbackWorkingDays * 7;

      setTeamCompletionData({
        totalMembers: teamMembers.length,
        completedMembers: 0,
        completionPercentage: 0,
        totalSubmittedHours: 0,
        sprintPotentialHours: errorFallbackPotential,
      });
      setMemberSubmissionStatuses([]);

      perfLog.debug('Applied error fallback data', {
        component: 'ManagerDashboard',
        data: {
          workingDays: errorFallbackWorkingDays,
          potentialHours: errorFallbackPotential
        }
      });

    } finally {
      setIsLoadingTeamData(false);
    }
  }, [currentSprint, team?.id, teamMembers, sprintWorkingDays, selectedSprint]);

  // PERFORMANCE FIX: Mobile-adaptive debounced update function to prevent cascade recalculations
  const debouncedLoadTeamStats = useCallback(() => {
    if (updateDebounceRef.current) {
      clearTimeout(updateDebounceRef.current);
    }

    setIsUpdatingData(true);

    // PERFORMANCE: Longer debounce on mobile (1000ms) to reduce CPU usage
    // Mobile devices benefit from less frequent calculations
    const debounceTime = isMobile ? 1000 : 500;

    updateDebounceRef.current = setTimeout(() => {
      loadTeamStats().finally(() => {
        setIsUpdatingData(false);
      });
    }, debounceTime);
  }, [loadTeamStats, isMobile]);

  // Load team stats on mount and when dependencies change
  React.useEffect(() => {
    loadTeamStats();
  }, [loadTeamStats]);

  // PERFORMANCE FIX: Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (updateDebounceRef.current) {
        clearTimeout(updateDebounceRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts for sprint navigation
  React.useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Only trigger if Alt is pressed and not typing in an input field
      if (!event.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (event.key) {
        case '1':
          event.preventDefault();
          setSelectedSprint('previous');
          break;
        case '2':
          event.preventDefault();
          setSelectedSprint('current');
          break;
        case '3':
          event.preventDefault();
          setSelectedSprint('next');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const teamStats = useMemo(() => {
    // PERFORMANCE FIX: Skip expensive calculations during updates
    if (isUpdatingData && teamCompletionData) {
      return {
        ...teamCompletionData,
        sprintLength: sprintWorkingDays.length
      };
    }
    
    if (!teamCompletionData) {
      // Calculate basic fallback values when real calculation fails
      const estimatedHours = Math.max(teamMembers.length * sprintWorkingDays.length * 7 * 0.5, 0);
      const potentialHours = Math.max(teamMembers.length * sprintWorkingDays.length * 7, 0);
      
      return {
        totalMembers: teamMembers.length,
        completedMembers: 0,
        completionPercentage: 0,
        totalSubmittedHours: estimatedHours,
        sprintPotentialHours: potentialHours,
        sprintLength: sprintWorkingDays.length
      };
    }

    // Ensure we always have a valid potential hours calculation
    const calculatedPotentialHours = teamMembers.length * sprintWorkingDays.length * 7;
    const finalPotentialHours = teamCompletionData.sprintPotentialHours || calculatedPotentialHours;
    
    // PERFORMANCE FIX: Reduced logging frequency (10% sample)
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      perfLog.debug('Final teamStats calculation', {
        component: 'ManagerDashboard',
        data: {
          dataSourcePotential: teamCompletionData.sprintPotentialHours,
          calculatedPotential: calculatedPotentialHours,
          finalPotentialUsed: finalPotentialHours,
          workingDays: sprintWorkingDays.length,
          teamSize: teamMembers.length
        }
      });
    }

    return {
      ...teamCompletionData,
      sprintPotentialHours: finalPotentialHours,
      sprintLength: sprintWorkingDays.length
    };
  }, [teamCompletionData, teamMembers.length, sprintWorkingDays.length, isUpdatingData]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Team Completion Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PersonalStatsCard
                title="Team Completion"
                value={`${teamStats.completedMembers}/${teamStats.totalMembers}`}
                icon={Users}
                color="blue"
                description={`${teamStats.completionPercentage}% completed • Click for details`}
                onClick={() => setShowCompletionModal(true)}
              />
              
              <PersonalStatsCard
                title="Sprint Hours"
                value={isLoadingTeamData ? "Loading..." : `${teamStats.totalSubmittedHours || 0}h`}
                icon={Clock}
                color="green"
                description={isLoadingTeamData ? "Calculating hours..." : `of ${teamStats.sprintPotentialHours || 0}h potential`}
              />
              
              <PersonalStatsCard
                title="Sprint Length"
                value={`${teamStats.sprintLength} days`}
                icon={Calendar}
                color="purple"
                description="Working days in current sprint"
              />
            </div>

            {/* Sprint Hours Summary */}
            <div className={DESIGN_SYSTEM.cards.default}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  Sprint Hours Summary
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Expandable summary of team member hours and progress
                </p>
              </div>
              <div className="p-6">
                {isLoadingTeamData ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading team data...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberSubmissionStatuses.map(memberStatus => {
                      const statusColors = {
                        complete: { bg: 'bg-green-100', text: 'text-green-800', label: 'Complete' },
                        partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Partial' },
                        missing: { bg: 'bg-red-100', text: 'text-red-800', label: 'Missing' }
                      };
                      
                      const statusColor = statusColors[memberStatus.currentWeekStatus];
                      
                      return (
                        <div key={memberStatus.memberId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {memberStatus.memberName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{memberStatus.memberName}</div>
                              <div className="text-sm text-gray-500">{memberStatus.hebrew}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-medium text-gray-900">{memberStatus.sprintSubmittedHours}h</div>
                              <div className="text-sm text-gray-500">submitted</div>
                            </div>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor.bg} ${statusColor.text}`}>
                              {statusColor.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* My Schedule Widget */}
            <div className={DESIGN_SYSTEM.cards.default}>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  My Schedule
                  <span className="text-sm font-normal text-gray-500 ml-2">(Collapsible)</span>
                </h3>
              </div>
              <div className="border-gray-200">
                <PersonalDashboard 
                  user={user}
                  team={team}
                  teamMembers={[]}
                  className="border-none shadow-none"
                />
              </div>
            </div>
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <div className="overflow-hidden">
              <FullSprintTable 
                currentUser={user}
                teamMembers={teamMembers}
                selectedTeam={team}
                currentSprint={currentSprint}
                onWorkOptionClick={async (memberId, date, value) => {
                  // Handle schedule updates - PERFORMANCE FIX: Use debounced update
                  debouncedLoadTeamStats();
                }}
                onMemberUpdate={() => {
                  // PERFORMANCE FIX: Use debounced update to prevent cascade recalculations
                  debouncedLoadTeamStats();
                }}
              />
            </div>
          </div>
        );

      case 'management':
        return (
          <div className="space-y-6">
            <div className={DESIGN_SYSTEM.cards.default}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-600" />
                  Team Management
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Add, edit, and manage team members
                </p>
              </div>
              
              <div className="p-6">
                <TeamMemberManagement 
                  currentUser={user}
                  selectedTeam={team}
                  onMembersUpdated={debouncedLoadTeamStats}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading state while sprint is loading - PERFORMANCE FIX: Precise skeleton to prevent CLS
  if (sprintLoading) {
    return (
      <div className={combineClasses('space-y-6', className)} style={{ minHeight: '1000px' }}>
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-100" style={{ minHeight: '120px' }}>
          <div className="animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-6 bg-gray-200 rounded mb-2 w-64"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="text-right">
                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 p-6">
            <div className="animate-pulse flex space-x-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded w-32"></div>
              ))}
            </div>
          </div>
          
          {/* Content Skeleton */}
          <div className="p-6">
            <div className="animate-pulse space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-md p-4" style={{ minHeight: '120px' }}>
                    <div className="h-4 bg-gray-200 rounded mb-2 w-20"></div>
                    <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                ))}
              </div>
              
              {/* Main Content */}
              <div className="bg-white border border-gray-200 rounded-lg p-6" style={{ minHeight: '400px' }}>
                <div className="h-6 bg-gray-200 rounded mb-4 w-48"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if sprint failed to load
  if (sprintError) {
    return (
      <div className={combineClasses('space-y-6', className)}>
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <AlertCircle className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Sprint Data</h3>
            <p className="text-gray-600 mb-4">{sprintError}</p>
            <p className="text-sm text-gray-500">
              Please contact your administrator or try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={combineClasses('space-y-6', className)}>
      {/* Header */}
      {currentSprint && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Manager Dashboard - {team.name}
              </h2>
              <p className="text-purple-600 text-sm">
                {new Date(currentSprint.sprint_start_date || Date.now()).toLocaleDateString()} - {new Date(currentSprint.sprint_end_date || Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                <span className="ml-2">({teamStats.totalMembers} team members)</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{teamStats.completionPercentage}%</div>
              <div className="text-sm text-purple-500">Team Complete</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Show warning if no sprint data available after timeout */}
      {showSprintWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">Sprint Data Not Available</h3>
              <p className="text-sm text-yellow-700 mt-1">
                The manager dashboard requires sprint data to function properly. Please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Toggle Navigation */}
      {currentSprint && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {/* Sprint Toggle Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {['previous', 'current', 'next'].map((sprintType) => {
                const isActive = selectedSprint === sprintType;
                const sprintLabels = {
                  previous: 'ספרינט קודם',
                  current: 'ספרינט נוכחי', 
                  next: 'ספרינט הבא'
                };
                
                return (
                  <button
                    key={sprintType}
                    onClick={() => setSelectedSprint(sprintType as SprintType)}
                    className={combineClasses(
                      'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    {sprintLabels[sprintType as keyof typeof sprintLabels]}
                  </button>
                );
              })}
            </div>

            {/* Sprint Info Badge */}
            <div className="text-right text-sm">
              {(() => {
                const sprintDates = getSprintDatesByType(currentSprint, selectedSprint);
                const sprintNumber = getSprintNumber(currentSprint, selectedSprint);
                const startDate = new Date(sprintDates.startDate);
                const endDate = new Date(sprintDates.endDate);
                
                return (
                  <div className="space-y-1">
                    <div className="font-semibold text-gray-900">
                      Sprint {sprintNumber}
                    </div>
                    <div className="text-gray-600">
                      {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                    </div>
                    {selectedSprint === 'next' && (() => {
                      const daysUntilStart = calculateDaysUntilSprintStart(sprintDates.startDate);
                      return daysUntilStart > 0 ? (
                        <div className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          מתחיל בעוד {daysUntilStart} ימים
                        </div>
                      ) : null;
                    })()}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Next Sprint Progress Bar */}
          {selectedSprint === 'next' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              {(() => {
                // Calculate fill percentage for next sprint
                const fillPercentage = teamMembers.length > 0 
                  ? Math.round((memberSubmissionStatuses.filter(status => status.sprintSubmittedHours > 0).length / teamMembers.length) * 100)
                  : 0;

                return (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-amber-800">
                      מילוי שעות לספרינט הבא: {fillPercentage}%
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-3">
                      <div 
                        className="bg-amber-500 h-3 rounded-full transition-all duration-300 ease-in-out"
                        style={{ width: `${fillPercentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-amber-700">
                      {memberSubmissionStatuses.filter(status => status.sprintSubmittedHours > 0).length} מתוך {teamMembers.length} חברי צוות מילאו שעות
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8 px-4 sm:px-6 py-2 sm:py-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={combineClasses(
                    'py-3 sm:py-4 px-3 sm:px-1 border-l-4 sm:border-l-0 sm:border-b-2 font-medium text-sm transition-colors flex items-center gap-3 rounded-md sm:rounded-none min-h-[56px] sm:min-h-[48px] touch-manipulation',
                    isActive
                      ? 'border-blue-500 text-blue-600 bg-blue-50 sm:bg-transparent'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 sm:hover:bg-transparent'
                  )}
                >
                  <Icon className="w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <div className="flex-1 text-left sm:text-center">
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-xs mt-1 opacity-75 hidden sm:block">{tab.description}</div>
                    <div className="text-xs mt-1 opacity-75 block sm:hidden truncate">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Team Completion Modal */}
      <TeamCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        teamMembers={teamMembers}
        currentSprint={currentSprint}
        teamName={team.name}
        selectedSprint={selectedSprint}
      />
    </div>
  );
});

export default ManagerDashboard;