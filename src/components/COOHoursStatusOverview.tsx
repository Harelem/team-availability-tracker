'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Building2, TrendingUp, Calendar, Users, AlertTriangle, Info } from 'lucide-react';
import { Team, TeamMember, CurrentGlobalSprint } from '@/types';
import { DatabaseService } from '@/lib/database';
import { calculateSprintPeriod, getSprintDescription, formatSprintDateRange } from '@/utils/sprintCalculations';
import { calculateWorkingDaysBetween } from '@/lib/calculationService';
import { MissingMembersService } from '@/lib/missingMembersService';
import { MissingMemberData } from '@/types/tooltipTypes';
import TeamMembersTooltip from '@/components/ui/TeamMembersTooltip';
import { dataConsistencyManager } from '@/utils/dataConsistencyManager';

interface TeamSprintStatus {
  teamName: string;
  teamId: number;
  completeMembers: number;
  totalMembers: number;
  teamCompletionRate: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  color?: string;
}

interface CompanyHoursStatus {
  currentSprint: TeamSprintStatus[];
  nextSprint: TeamSprintStatus[];
}

interface COOHoursStatusOverviewProps {
  allTeams: Team[];
  currentSprint: CurrentGlobalSprint;
}

export default function COOHoursStatusOverview({ allTeams, currentSprint }: COOHoursStatusOverviewProps) {
  const [companyStatus, setCompanyStatus] = useState<CompanyHoursStatus>({
    currentSprint: [],
    nextSprint: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tooltip state
  const [tooltipData, setTooltipData] = useState<Record<string, MissingMemberData>>({});
  const [tooltipLoading, setTooltipLoading] = useState<Record<string, boolean>>({});
  const [activeTooltipTeam, setActiveTooltipTeam] = useState<string | null>(null);
  
  // Request cancellation ref
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    console.log('🔍 COOHoursStatusOverview: Effect triggered', {
      allTeamsLength: allTeams?.length || 0,
      hasCurrentSprint: !!currentSprint,
      currentSprintNumber: currentSprint?.current_sprint_number
    });

    if (allTeams && currentSprint) {
      // Add timeout mechanism to prevent infinite loading
      const loadTimeout = setTimeout(() => {
        console.warn('⚠️ COOHoursStatusOverview: Force stopping loading after 30 seconds');
        setIsLoading(false);
        setError('Loading timeout - forcing component to render with available data');
      }, 30000);

      loadCompanyHoursStatus().finally(() => {
        clearTimeout(loadTimeout);
      });

      return () => {
        clearTimeout(loadTimeout);
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    } else {
      console.log('🔍 COOHoursStatusOverview: Missing prerequisites, setting loading to false');
      setIsLoading(false);
      if (!allTeams) {
        setError('No teams data available');
      }
      if (!currentSprint) {
        setError('No current sprint data available');
      }
    }
    
    // Cleanup function to cancel ongoing requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [allTeams, currentSprint]); // Fixed: Remove function dependency to prevent infinite loop

  // Keyboard support for accessibility
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTooltipTeam) {
        closeTooltip();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activeTooltipTeam]);

  // Tooltip handler functions for click-based interaction
  const toggleTooltip = async (teamKey: string) => {
    // If clicking the same tooltip, close it
    if (activeTooltipTeam === teamKey) {
      setActiveTooltipTeam(null);
      return;
    }

    // If tooltip data already exists, show it immediately
    if (tooltipData[teamKey]) {
      setActiveTooltipTeam(teamKey);
      return;
    }

    // Otherwise, load the data
    const [teamIdStr, sprintType] = teamKey.split('-');
    if (!teamIdStr) return;
    const teamId = parseInt(teamIdStr);
    const team = allTeams.find(t => t.id === teamId);
    
    if (!team) return;

    setTooltipLoading(prev => ({ ...prev, [teamKey]: true }));
    
    try {
      const sprintPeriod = sprintType === 'current' 
        ? calculateSprintPeriod(currentSprint, 0)
        : calculateSprintPeriod(currentSprint, 1);
      
      const missingData = await MissingMembersService.getMissingMembers(
        teamId,
        team.name,
        sprintPeriod
      );
      
      setTooltipData(prev => ({ ...prev, [teamKey]: missingData }));
      setActiveTooltipTeam(teamKey);
      
    } catch (error) {
      console.error('Error loading missing members:', error);
    } finally {
      setTooltipLoading(prev => ({ ...prev, [teamKey]: false }));
    }
  };

  const closeTooltip = () => {
    setActiveTooltipTeam(null);
  };


  // Memoized load function to prevent unnecessary re-creation and infinite loops
  const loadCompanyHoursStatus = useCallback(async () => {
    const startTime = Date.now();
    console.log('🔍 COOHoursStatusOverview: Starting loadCompanyHoursStatus', {
      allTeamsCount: allTeams?.length || 0,
      sprintNumber: currentSprint?.current_sprint_number,
      timestamp: new Date().toISOString()
    });

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if request was cancelled before starting
      if (signal.aborted) {
        console.log('🔍 Request cancelled before starting');
        return;
      }
      
      console.log('🔍 Loading company-wide hours status...', {
        teamsToProcess: allTeams?.map(t => ({ id: t.id, name: t.name }))
      });

      // Add overall timeout to prevent hanging
      const overallTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Overall loading timeout after 25 seconds'));
        }, 25000);
      });
      
      const currentPeriod = calculateSprintPeriod(currentSprint, 0);
      const nextPeriod = calculateSprintPeriod(currentSprint, 1);
      
      console.log('🔍 Sprint periods calculated', { currentPeriod, nextPeriod });
      
      // Pre-load team members for all teams to avoid sequential DB calls
      console.log('🔍 Starting to load team members for all teams...');
      const teamsWithMembersPromise = Promise.all(
        allTeams.map(async (team) => {
          try {
            console.log(`🔍 Loading members for team: ${team.name} (ID: ${team.id})`);
            const teamMembers = await DatabaseService.getTeamMembers(team.id, false); // Use cache for team members
            console.log(`✅ Loaded ${teamMembers.length} members for team: ${team.name}`);
            return { team, teamMembers };
          } catch (error) {
            console.error(`❌ Failed to load members for team ${team.name}:`, error);
            return { team, teamMembers: [] }; // Return empty array to prevent blocking
          }
        })
      );

      // Race the team loading with timeout
      const teamsWithMembers = await Promise.race([
        teamsWithMembersPromise,
        overallTimeoutPromise
      ]) as { team: any; teamMembers: any[] }[];
      
      // Filter out teams with no members
      const teamsWithMembersFiltered = teamsWithMembers.filter(({ team, teamMembers }) => {
        if (teamMembers.length === 0) {
          console.log(`⚠️ Team ${team.name} has no members, skipping`);
          return false;
        }
        return true;
      });
      
      // Process current sprint status for all teams in parallel
      const currentSprintPromises = teamsWithMembersFiltered.map(async ({ team, teamMembers }) => {
        const currentStatus = await checkTeamSprintStatus(team, teamMembers, currentPeriod);
        return {
          teamName: team.name,
          teamId: team.id,
          color: team.color,
          ...currentStatus
        };
      });
      
      // Process next sprint status for all teams in parallel
      const nextSprintPromises = teamsWithMembersFiltered.map(async ({ team, teamMembers }) => {
        const nextStatus = await checkTeamSprintStatus(team, teamMembers, nextPeriod);
        return {
          teamName: team.name,
          teamId: team.id,
          color: team.color,
          ...nextStatus
        };
      });
      
      // Wait for both current and next sprint data to complete
      const [currentSprintTeamStatus, nextSprintTeamStatus] = await Promise.all([
        Promise.all(currentSprintPromises),
        Promise.all(nextSprintPromises)
      ]);
      
      // Validate data consistency before setting state
      const dataValidation = dataConsistencyManager.validateDataConsistency(
        [...currentSprintTeamStatus, ...nextSprintTeamStatus],
        [
          // Validator functions for team sprint status
          (item) => Boolean(item.teamName && typeof item.teamName === 'string'),
          (item) => Boolean(typeof item.teamId === 'number' && item.teamId > 0),
          (item) => Boolean(typeof item.completeMembers === 'number' && item.completeMembers >= 0),
          (item) => Boolean(typeof item.totalMembers === 'number' && item.totalMembers > 0),
          (item) => Boolean(typeof item.teamCompletionRate === 'number' && item.teamCompletionRate >= 0 && item.teamCompletionRate <= 100),
          (item) => Boolean(item.completeMembers <= item.totalMembers),
          (item) => Boolean(['excellent', 'good', 'needs_attention', 'critical'].includes(item.status))
        ]
      );
      
      if (!dataValidation.isValid) {
        console.error('❌ Data validation failed:', dataValidation.errors);
        setError('Data validation failed - inconsistent team status data detected');
        return;
      }
      
      console.log('✅ Data validation passed - setting company status');
      
      setCompanyStatus({
        currentSprint: currentSprintTeamStatus.sort((a, b) => b.teamCompletionRate - a.teamCompletionRate),
        nextSprint: nextSprintTeamStatus.sort((a, b) => b.teamCompletionRate - a.teamCompletionRate)
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log('✅ Company hours status loaded successfully', {
        duration: `${duration}ms`,
        currentSprintTeams: currentSprintTeamStatus.length,
        nextSprintTeams: nextSprintTeamStatus.length
      });
      
    } catch (error) {
      // Don't set error state if the request was cancelled
      if (signal.aborted) {
        console.log('🔍 Request cancelled during execution');
        return;
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error('❌ Error loading company hours status:', {
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
        step: 'unknown'
      });
      
      // Set a more descriptive error message
      if (error instanceof Error && error.message.includes('timeout')) {
        setError('Loading took too long - please refresh the page to try again');
      } else {
        setError(`Failed to load company hours status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log('🏁 COOHoursStatusOverview: Loading finished', {
        duration: `${duration}ms`,
        success: !error
      });
      setIsLoading(false);
    }
  }, [allTeams, currentSprint]); // Include dependencies to prevent stale closures

  // Memoized team sprint status calculation
  const checkTeamSprintStatus = useCallback(async (
    team: Team,
    teamMembers: TeamMember[],
    sprintPeriod: { start: string; end: string }
  ) => {
    const workingDays = calculateWorkingDaysBetween(new Date(sprintPeriod.start), new Date(sprintPeriod.end));
    
    // Get all schedule entries for team members in this period (using cache)
    const scheduleData = await DatabaseService.getScheduleEntries(
      sprintPeriod.start,
      sprintPeriod.end,
      team.id,
      false // Use cache for schedule entries
    );
    
    // Calculate completion per member
    let completeMembers = 0;
    
    teamMembers.forEach(member => {
      const memberSchedule = scheduleData[member.id] || {};
      const filledDays = Object.keys(memberSchedule).length;
      const completionRate = workingDays > 0 ? (filledDays / workingDays) * 100 : 0;
      
      if (completionRate >= 100) {
        completeMembers++;
      }
    });
    
    const totalMembers = teamMembers.length;
    const teamCompletionRate = totalMembers > 0 ? (completeMembers / totalMembers) * 100 : 0;
    
    let status: 'excellent' | 'good' | 'needs_attention' | 'critical';
    if (teamCompletionRate >= 90) {
      status = 'excellent';
    } else if (teamCompletionRate >= 70) {
      status = 'good';
    } else if (teamCompletionRate >= 50) {
      status = 'needs_attention';
    } else {
      status = 'critical';
    }
    
    return {
      completeMembers,
      totalMembers,
      teamCompletionRate,
      status
    };
  }, []); // No dependencies - pure calculation function

  const TeamStatusBadge = ({ status }: { status: 'excellent' | 'good' | 'needs_attention' | 'critical' }) => {
    const badges = {
      excellent: { emoji: '🎉', color: 'text-green-600', bg: 'bg-green-100' },
      good: { emoji: '✅', color: 'text-blue-600', bg: 'bg-blue-100' },
      needs_attention: { emoji: '⚠️', color: 'text-yellow-600', bg: 'bg-yellow-100' },
      critical: { emoji: '🚨', color: 'text-red-600', bg: 'bg-red-100' }
    };
    
    const { emoji, color, bg } = badges[status];
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color} ${bg}`}>
        <span>{emoji}</span>
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </div>
    );
  };

  const getProgressBarColor = (status: 'excellent' | 'good' | 'needs_attention' | 'critical') => {
    const colors = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      needs_attention: 'bg-yellow-500',
      critical: 'bg-red-500'
    };
    return colors[status];
  };

  // Memoized company completion summary to prevent unnecessary recalculations
  const CompanyCompletionSummary = useMemo(() => {
    return ({ sprintData }: { sprintData: TeamSprintStatus[] }) => {
      const totalMembers = sprintData.reduce((sum, team) => sum + team.totalMembers, 0);
      const completeMembers = sprintData.reduce((sum, team) => sum + team.completeMembers, 0);
      const companyRate = totalMembers > 0 ? Math.round((completeMembers / totalMembers) * 100) : 0;
      
      return (
        <div className="text-center bg-gray-50 p-4 rounded-lg">
          <div className="text-3xl font-bold text-gray-900 mb-1">{companyRate}%</div>
          <div className="text-sm text-gray-600">
            {completeMembers}/{totalMembers} employees completed
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Across {sprintData.length} teams
          </div>
        </div>
      );
    };
  }, []); // No dependencies - pure calculation function

  if (isLoading) {
    return (
      <div className="coo-hours-status bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-96 mb-6"></div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-gray-100 p-6 rounded-lg h-80"></div>
            <div className="bg-gray-100 p-6 rounded-lg h-80"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coo-hours-status bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="coo-hours-status bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Company-Wide Hours Completion Status</h2>
          <p className="text-sm text-gray-600">Track sprint completion across all teams</p>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Current Sprint Overview */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">
              {getSprintDescription(0)} Completion
            </h3>
          </div>
          <p className="text-sm text-blue-700 mb-6">
            {formatSprintDateRange(calculateSprintPeriod(currentSprint, 0))}
          </p>
          
          {companyStatus.currentSprint.length === 0 ? (
            <div className="text-center py-8 text-blue-700">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No teams with members found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {companyStatus.currentSprint.map(team => {
                  const teamKey = `${team.teamId}-current`;
                  return (
                  <div 
                    key={team.teamId} 
                    className="bg-white p-4 rounded-lg shadow-sm hover:bg-gray-50 transition-colors relative"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{team.teamName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {team.completeMembers}/{team.totalMembers}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.round(team.teamCompletionRate)}%
                        </span>
                        <TeamStatusBadge status={team.status} />
                        {/* Info icon trigger */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTooltip(teamKey);
                          }}
                          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                          title="הצג חברי צוות חסרים"
                          aria-label={`Show missing members for ${team.teamName}`}
                          aria-expanded={activeTooltipTeam === teamKey}
                          aria-haspopup="dialog"
                        >
                          <Info className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(team.status)}`}
                        style={{ width: `${team.teamCompletionRate}%` }}
                      />
                    </div>
                  </div>
                  );
                })}
              </div>
              
              <CompanyCompletionSummary sprintData={companyStatus.currentSprint} />
            </>
          )}
        </div>
        
        {/* Next Sprint Overview */}
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">
              {getSprintDescription(1)} Preparation
            </h3>
          </div>
          <p className="text-sm text-green-700 mb-6">
            {formatSprintDateRange(calculateSprintPeriod(currentSprint, 1))}
          </p>
          
          {companyStatus.nextSprint.length === 0 ? (
            <div className="text-center py-8 text-green-700">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No teams with members found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {companyStatus.nextSprint.map(team => {
                  const teamKey = `${team.teamId}-next`;
                  return (
                  <div 
                    key={team.teamId} 
                    className="bg-white p-4 rounded-lg shadow-sm hover:bg-gray-50 transition-colors relative"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{team.teamName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          {team.completeMembers}/{team.totalMembers}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {Math.round(team.teamCompletionRate)}%
                        </span>
                        <TeamStatusBadge status={team.status} />
                        {/* Info icon trigger */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTooltip(teamKey);
                          }}
                          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                          title="הצג חברי צוות חסרים"
                          aria-label={`Show missing members for ${team.teamName}`}
                          aria-expanded={activeTooltipTeam === teamKey}
                          aria-haspopup="dialog"
                        >
                          <Info className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(team.status)}`}
                        style={{ width: `${team.teamCompletionRate}%` }}
                      />
                    </div>
                  </div>
                  );
                })}
              </div>
              
              <CompanyCompletionSummary sprintData={companyStatus.nextSprint} />
            </>
          )}
        </div>
      </div>
      
      {/* Key Insights */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Key Insights</h4>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {companyStatus.currentSprint.filter(t => t.status === 'excellent').length}
            </div>
            <div className="text-gray-600">Excellent Teams</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {companyStatus.currentSprint.filter(t => t.status === 'needs_attention').length}
            </div>
            <div className="text-gray-600">Need Attention</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {companyStatus.currentSprint.filter(t => t.status === 'critical').length}
            </div>
            <div className="text-gray-600">Critical Status</div>
          </div>
        </div>
      </div>
      
      {/* Team Members Modal */}
      {activeTooltipTeam && (
        <TeamMembersTooltip
          data={tooltipData[activeTooltipTeam] || null}
          isLoading={tooltipLoading[activeTooltipTeam] || false}
          isVisible={true}
          onClose={closeTooltip}
        />
      )}
    </div>
  );
}