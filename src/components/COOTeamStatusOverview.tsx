'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Building2, Users, Calendar, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { DatabaseService } from '@/lib/database';
import { Team, CurrentGlobalSprint, TeamMember } from '@/types';
import { DESIGN_SYSTEM, combineClasses, COMPONENT_PATTERNS, getStatusStyling } from '@/utils/designSystem';

interface COOTeamStatusOverviewProps {
  className?: string;
  teams?: { id: number; name: string; team_members: TeamMember[] }[];
  currentSprint?: CurrentGlobalSprint | null;
  skipDataLoading?: boolean;
}

interface TeamCompletionData {
  id: number;
  name: string;
  totalMembers: number;
  completedMembers: number;
  completionPercentage: number;
  totalHours: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export default function COOTeamStatusOverview({ 
  className = '', 
  teams: externalTeams, 
  currentSprint: externalSprint, 
  skipDataLoading = false 
}: COOTeamStatusOverviewProps) {
  const [teams, setTeams] = useState<TeamCompletionData[]>([]);
  const [currentSprint, setCurrentSprint] = useState<CurrentGlobalSprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Request cancellation ref
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // If external data is provided, skip internal data loading
    if (skipDataLoading && externalTeams && externalSprint) {
      setCurrentSprint(externalSprint);
      processExternalTeamsData(externalTeams, externalSprint);
      return;
    }
    
    const loadTeamCompletionData = async () => {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;
      
      try {
        // Check if request was cancelled before starting
        if (signal.aborted) {
          console.log('🔍 Team completion data request cancelled before starting');
          return;
        }
        
        setLoading(true);
        setError(null);

        // Load teams and sprint data
        const [teamsData, sprintData] = await Promise.all([
          DatabaseService.getTeams(),
          DatabaseService.getCurrentGlobalSprint()
        ]);

        setCurrentSprint(sprintData);

        // Load completion data for each team using real schedule data
        const teamCompletionPromises = teamsData.map(async (team: Team): Promise<TeamCompletionData> => {
          try {
            const teamMembers = await DatabaseService.getTeamMembers(team.id);
            
            if (teamMembers.length === 0) {
              return {
                id: team.id,
                name: team.name,
                totalMembers: 0,
                completedMembers: 0,
                completionPercentage: 0,
                totalHours: 0,
                status: 'critical' as const
              };
            }
            
            // Calculate real completion data based on current sprint
            const sprintDateRange = DatabaseService.getSprintDateRange(sprintData);
            const scheduleEntries = await DatabaseService.getScheduleEntries(
              sprintDateRange.startDate,
              sprintDateRange.endDate,
              team.id
            );
            
            // Calculate working days for the sprint period
            const workingDays = DatabaseService.calculateWorkingDays(
              sprintDateRange.startDate,
              sprintDateRange.endDate
            );
            
            // Count completed members (those who filled all working days)
            let completedMembers = 0;
            let totalHours = 0;
            
            teamMembers.forEach(member => {
              const memberSchedule = scheduleEntries[member.id] || {};
              const filledDays = Object.keys(memberSchedule).length;
              const memberHours = Object.values(memberSchedule).reduce((sum, entry) => {
                if (entry.value === '1') return sum + 7; // Full day
                if (entry.value === '0.5') return sum + 3.5; // Half day
                return sum; // 'X' = 0 hours
              }, 0);
              
              totalHours += memberHours;
              
              // Consider member complete if they filled 90% or more of working days
              const completionRate = workingDays > 0 ? (filledDays / workingDays) : 0;
              if (completionRate >= 0.9) {
                completedMembers++;
              }
            });
            
            const completionPercentage = teamMembers.length > 0 ? Math.round((completedMembers / teamMembers.length) * 100) : 0;
            
            // Determine status based on completion percentage
            let status: TeamCompletionData['status'] = 'critical';
            if (completionPercentage >= 95) status = 'excellent';
            else if (completionPercentage >= 85) status = 'good';
            else if (completionPercentage >= 70) status = 'warning';

            return {
              id: team.id,
              name: team.name,
              totalMembers: teamMembers.length,
              completedMembers,
              completionPercentage,
              totalHours,
              status
            };
          } catch (error) {
            console.error(`Error loading data for team ${team.name}:`, error);
            return {
              id: team.id,
              name: team.name,
              totalMembers: 0,
              completedMembers: 0,
              completionPercentage: 0,
              totalHours: 0,
              status: 'critical' as const
            };
          }
        });

        const teamCompletionData = await Promise.all(teamCompletionPromises);
        setTeams(teamCompletionData);

      } catch (err) {
        // Don't set error state if the request was cancelled
        if (signal.aborted) {
          console.log('🔍 Team completion data request cancelled during execution');
          return;
        }
        
        console.error('Error loading team status overview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load team status data');
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (!skipDataLoading) {
      loadTeamCompletionData();
    }
    
    // Cleanup function to cancel ongoing requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [skipDataLoading, externalTeams, externalSprint]);
  
  // Helper function to process external teams data
  const processExternalTeamsData = async (teamsData: { id: number; name: string; team_members: TeamMember[] }[], sprintData: CurrentGlobalSprint) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Processing external teams data for COOTeamStatusOverview');
      
      // Process external teams data using the same logic as internal loading
      const teamCompletionPromises = teamsData.map(async (team): Promise<TeamCompletionData> => {
        try {
          const teamMembers = team.team_members;
          
          if (teamMembers.length === 0) {
            return {
              id: team.id,
              name: team.name,
              totalMembers: 0,
              completedMembers: 0,
              completionPercentage: 0,
              totalHours: 0,
              status: 'critical' as const
            };
          }
          
          // Calculate real completion data based on current sprint
          const sprintDateRange = DatabaseService.getSprintDateRange(sprintData);
          const scheduleEntries = await DatabaseService.getScheduleEntries(
            sprintDateRange.startDate,
            sprintDateRange.endDate,
            team.id
          );
          
          // Calculate working days for the sprint period
          const workingDays = DatabaseService.calculateWorkingDays(
            sprintDateRange.startDate,
            sprintDateRange.endDate
          );
          
          // Count completed members (those who filled all working days)
          let completedMembers = 0;
          let totalHours = 0;
          
          teamMembers.forEach(member => {
            const memberSchedule = scheduleEntries[member.id] || {};
            const filledDays = Object.keys(memberSchedule).length;
            const memberHours = Object.values(memberSchedule).reduce((sum, entry) => {
              if (entry.value === '1') return sum + 7; // Full day
              if (entry.value === '0.5') return sum + 3.5; // Half day
              return sum; // 'X' = 0 hours
            }, 0);
            
            totalHours += memberHours;
            
            // Consider member complete if they filled 90% or more of working days
            const completionRate = workingDays > 0 ? (filledDays / workingDays) : 0;
            if (completionRate >= 0.9) {
              completedMembers++;
            }
          });
          
          const completionPercentage = teamMembers.length > 0 ? Math.round((completedMembers / teamMembers.length) * 100) : 0;
          
          // Determine status based on completion percentage
          let status: TeamCompletionData['status'] = 'critical';
          if (completionPercentage >= 95) status = 'excellent';
          else if (completionPercentage >= 85) status = 'good';
          else if (completionPercentage >= 70) status = 'warning';

          return {
            id: team.id,
            name: team.name,
            totalMembers: teamMembers.length,
            completedMembers,
            completionPercentage,
            totalHours,
            status
          };
        } catch (error) {
          console.error(`Error processing data for team ${team.name}:`, error);
          return {
            id: team.id,
            name: team.name,
            totalMembers: 0,
            completedMembers: 0,
            completionPercentage: 0,
            totalHours: 0,
            status: 'critical' as const
          };
        }
      });
      
      const teamCompletionData = await Promise.all(teamCompletionPromises);
      setTeams(teamCompletionData);
      
      console.log(`✅ Processed ${teamCompletionData.length} teams for COOTeamStatusOverview`);
      
    } catch (err) {
      console.error('Error processing external teams data:', err);
      setError(err instanceof Error ? err.message : 'Failed to process team status data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={combineClasses(
        DESIGN_SYSTEM.cards.default,
        DESIGN_SYSTEM.spacing.lg,
        'mb-6',
        className
      )}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className={combineClasses(
            DESIGN_SYSTEM.grids.responsive2,
            DESIGN_SYSTEM.grids.gap.lg
          )}>
            {[1, 2].map(i => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="bg-gray-50 rounded p-3">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={combineClasses(
        DESIGN_SYSTEM.cards.default,
        DESIGN_SYSTEM.spacing.lg,
        'mb-6 border-l-4 border-red-500',
        className
      )}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="font-medium text-red-900">Unable to load team status</h3>
        </div>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  // Calculate overall company statistics
  const totalMembers = teams.reduce((sum, team) => sum + team.totalMembers, 0);
  const totalCompleted = teams.reduce((sum, team) => sum + team.completedMembers, 0);
  const overallCompletion = totalMembers > 0 ? Math.round((totalCompleted / totalMembers) * 100) : 0;
  const totalHours = teams.reduce((sum, team) => sum + team.totalHours, 0);

  return (
    <div className={combineClasses(
      DESIGN_SYSTEM.cards.default,
      DESIGN_SYSTEM.spacing.lg,
      'mb-6',
      className
    )}>
      <div className={combineClasses(
        COMPONENT_PATTERNS.sectionHeader,
        'mb-6'
      )}>
        <Building2 className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Company-Wide Hours Completion Status</h3>
      </div>

      {/* Overall Summary */}
      <div className={combineClasses(
        DESIGN_SYSTEM.colors.primary.bgLight,
        DESIGN_SYSTEM.radius.md,
        DESIGN_SYSTEM.spacing.md,
        'mb-6'
      )}>
        <div className={combineClasses(
          DESIGN_SYSTEM.grids.responsive3,
          DESIGN_SYSTEM.grids.gap.md,
          'text-center'
        )}>
          <div>
            <div className="text-2xl font-bold text-blue-900">{overallCompletion}%</div>
            <div className="text-sm text-blue-700">Overall Completion</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{totalCompleted}/{totalMembers}</div>
            <div className="text-sm text-blue-700">Members Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{totalHours}h</div>
            <div className="text-sm text-blue-700">Total Hours Submitted</div>
          </div>
        </div>
      </div>

      <div className={combineClasses(
        DESIGN_SYSTEM.grids.responsive2,
        DESIGN_SYSTEM.grids.gap.lg
      )}>
        {/* Current Sprint */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Current Sprint: {(currentSprint as any)?.name || 'No Active Sprint'}
          </h4>

          <div className="space-y-3">
            {teams.map(team => (
              <div key={team.id} className={combineClasses(
                'bg-gray-50 hover:bg-gray-100',
                DESIGN_SYSTEM.radius.md,
                DESIGN_SYSTEM.spacing.sm,
                DESIGN_SYSTEM.transitions.default
              )}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900 text-sm">{team.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {team.completedMembers}/{team.totalMembers}
                    </span>
                    <span className={combineClasses(
                      'px-2 py-0.5 text-xs font-medium rounded',
                      team.status === 'excellent' ? getStatusStyling('excellent').bg + ' ' + getStatusStyling('excellent').text :
                      team.status === 'good' ? getStatusStyling('good').bg + ' ' + getStatusStyling('good').text :
                      team.status === 'warning' ? getStatusStyling('warning').bg + ' ' + getStatusStyling('warning').text :
                      getStatusStyling('critical').bg + ' ' + getStatusStyling('critical').text
                    )}>
                      {team.completionPercentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={COMPONENT_PATTERNS.progressContainer}>
                  <div 
                    className={combineClasses(
                      COMPONENT_PATTERNS.progressFill,
                      team.status === 'excellent' ? 'bg-green-500' :
                      team.status === 'good' ? 'bg-blue-500' :
                      team.status === 'warning' ? 'bg-yellow-500' :
                      'bg-red-500'
                    )}
                    style={{ width: `${team.completionPercentage}%` }}
                  />
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  {team.totalHours}h submitted by {team.completedMembers} members
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Sprint Preview */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            Next Sprint Planning
          </h4>

          <div className={combineClasses(
            DESIGN_SYSTEM.colors.purple.bgLight,
            DESIGN_SYSTEM.radius.md,
            DESIGN_SYSTEM.spacing.md
          )}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Preparation Status</span>
            </div>

            <div className="space-y-2">
              {teams.map(team => (
                <div key={`next-${team.id}`} className="flex justify-between items-center py-1">
                  <span className="text-sm text-purple-700">{team.name}</span>
                  <span className={combineClasses(
                    'text-xs px-2 py-0.5 rounded',
                    team.completionPercentage >= 95 ? 'bg-green-100 text-green-800' :
                    team.completionPercentage >= 80 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  )}>
                    {team.completionPercentage >= 95 ? 'Ready' :
                     team.completionPercentage >= 80 ? 'Almost Ready' : 'Not Ready'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-purple-200">
              <div className="text-xs text-purple-600">
                Teams with 95%+ completion are ready for next sprint planning
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}