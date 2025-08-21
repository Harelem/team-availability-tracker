'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  CheckCircle,
  Zap,
  Activity,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TeamDashboardData, Team, CurrentGlobalSprint, TeamMember } from '@/types';
import { DatabaseService } from '@/lib/database';
import { operation } from '@/utils/debugLogger';
import { formatHours, formatPercentage } from '@/lib/calculationService';
import { COOMetricCard } from '@/components/ui/COOCard';
import { RealTimeCalculationService, type TeamMemberSubmissionStatus } from '@/lib/realTimeCalculationService';

interface TeamSummaryOverviewProps {
  team: Team;
  currentSprint: CurrentGlobalSprint | null;
  teamMembers?: TeamMember[];
  className?: string;
  defaultCollapsed?: boolean;
}

export default function TeamSummaryOverview({ 
  team, 
  currentSprint,
  teamMembers = [],
  className = '',
  defaultCollapsed = true
}: TeamSummaryOverviewProps) {
  const [dashboardData, setDashboardData] = useState<TeamDashboardData | null>(null);
  const [memberSubmissionStatuses, setMemberSubmissionStatuses] = useState<TeamMemberSubmissionStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Load team dashboard data with real-time calculations
  useEffect(() => {
    const loadTeamDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`🔍 Loading real-time team summary for ${team.name}...`);
        
        // Load both dashboard data and real-time member submission statuses
        const [dashboardDataResult, memberStatusesResult] = await Promise.allSettled([
          DatabaseService.getTeamDashboardData(team.id),
          RealTimeCalculationService.getTeamMemberSubmissionStatus(team.id)
        ]);
        
        // Handle dashboard data
        if (dashboardDataResult.status === 'fulfilled' && dashboardDataResult.value) {
          setDashboardData(dashboardDataResult.value);
        } else {
          console.warn('Dashboard data failed, using fallback');
          // Create fallback dashboard data
          setDashboardData({
            teamOverview: {
              teamId: team.id,
              teamName: team.name,
              memberCount: teamMembers.length,
              managerCount: teamMembers.filter(m => m.isManager).length,
              maxCapacity: teamMembers.length * 35, // 35 hours per week
              sprintPotential: teamMembers.length * 70, // 70 hours per 2-week sprint
              currentUtilization: 0,
              capacityGap: 0,
              capacityGapPercentage: 0
            },
            memberBreakdown: [],
            currentWeekMetrics: {
              potentialHours: teamMembers.length * 35,
              actualHours: 0,
              utilization: 0,
              absentMembers: 0,
              halfDayMembers: 0
            }
          });
        }
        
        // Handle member submission statuses
        if (memberStatusesResult.status === 'fulfilled') {
          setMemberSubmissionStatuses(memberStatusesResult.value);
          operation('Real-time team summary loaded successfully');
        } else {
          console.warn('Member submission statuses failed to load');
          setMemberSubmissionStatuses([]);
        }
        
      } catch (err) {
        console.error('❌ Error loading team summary:', err);
        setError(`Failed to load team summary: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamDashboardData();
  }, [team.id, team.name, teamMembers.length, refreshKey]);

  const refreshDashboard = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-28 sm:h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 border-l-4 border-red-500 ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-red-800">Team Summary Error</h3>
            <p className="text-sm text-red-600 mt-1">{error || 'Unable to load team summary'}</p>
          </div>
          <button
            onClick={refreshDashboard}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm min-h-[44px] self-stretch sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md mb-6 ${className}`}>
      {/* Collapsible Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-50 transition-colors">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="min-w-0 flex-1 text-left flex items-center gap-3"
        >
          <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{team.name} Overview</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {dashboardData.teamOverview.memberCount} members
              {currentSprint && <span> • Sprint {currentSprint.current_sprint_number}</span>}
            </p>
            <div className="flex items-center gap-2 text-sm mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                dashboardData.teamOverview.currentUtilization >= 90 ? 'bg-green-100 text-green-800' :
                dashboardData.teamOverview.currentUtilization >= 80 ? 'bg-blue-100 text-blue-800' :
                dashboardData.teamOverview.currentUtilization >= 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {Math.round(dashboardData.teamOverview.currentUtilization)}% Complete
              </span>
              {memberSubmissionStatuses.length > 0 && (
                <span className="text-xs text-gray-500">
                  {memberSubmissionStatuses.filter(m => m.currentWeekStatus === 'complete').length} fully complete
                </span>
              )}
            </div>
          </div>
        </button>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={refreshDashboard}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm min-h-[44px]"
            title="Refresh team summary"
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>
      
      {/* Collapsible Content - Team Member Status */}
      {!isCollapsed && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-200">
          <div className="mt-4">
            {memberSubmissionStatuses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {memberSubmissionStatuses.map(memberStatus => {
                  const statusColors = {
                    complete: { bg: 'bg-green-100', text: 'text-green-800', label: 'Complete' },
                    partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Partial' },
                    missing: { bg: 'bg-red-100', text: 'text-red-800', label: 'Missing' }
                  };
                  
                  const statusColor = statusColors[memberStatus.currentWeekStatus];
                  
                  return (
                    <div key={memberStatus.memberId} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-600 font-medium text-sm">
                              {memberStatus.memberName.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">{memberStatus.memberName}</div>
                            <div className="text-xs text-gray-500 truncate">{memberStatus.hebrew}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {memberStatus.isManager && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                              Manager
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColor.bg} ${statusColor.text}`}>
                            {statusColor.label}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-1">
                        {memberStatus.sprintSubmittedHours}h submitted
                      </div>
                      
                      {memberStatus.pendingEntries > 0 && (
                        <div className="text-xs text-orange-600 mb-2">
                          {memberStatus.pendingEntries} days pending
                        </div>
                      )}
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            memberStatus.sprintCompletionPercentage >= 90 ? 'bg-green-500' :
                            memberStatus.sprintCompletionPercentage >= 80 ? 'bg-blue-500' :
                            memberStatus.sprintCompletionPercentage >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.max(5, memberStatus.sprintCompletionPercentage)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {memberStatus.sprintCompletionPercentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : teamMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teamMembers.map(member => (
                  <div key={member.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-medium text-sm">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{member.name}</div>
                          <div className="text-xs text-gray-500 truncate">{member.hebrew}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {member.isManager && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                            Manager
                          </span>
                        )}
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800">
                          No Data
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      0h submitted
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gray-400 h-2 rounded-full" style={{ width: '0%' }} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      0%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No team members data available</p>
                <p className="text-xs mt-1">Team members will appear here when available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}