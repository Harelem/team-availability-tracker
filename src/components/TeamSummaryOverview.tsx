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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Load team dashboard data
  useEffect(() => {
    const loadTeamDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`🔍 Loading team summary for ${team.name}...`);
        
        const data = await DatabaseService.getTeamDashboardData(team.id);
        
        if (data) {
          setDashboardData(data);
          operation('Team summary loaded successfully');
        } else {
          throw new Error('No data returned from team dashboard service');
        }
        
      } catch (err) {
        console.error('❌ Error loading team summary:', err);
        setError(`Failed to load team summary: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamDashboardData();
  }, [team.id, team.name, refreshKey]);

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
            {teamMembers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teamMembers.map(member => {
                  // Mock completion status - in real implementation, this would come from schedule data
                  const isComplete = Math.random() > 0.3;
                  const hoursSubmitted = Math.floor(Math.random() * 35) + 20;
                  const completionPercentage = Math.floor(Math.random() * 40) + 60;
                  
                  return (
                    <div key={member.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
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
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                            isComplete 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {isComplete ? 'Complete' : 'Partial'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {hoursSubmitted}h submitted
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            completionPercentage >= 90 ? 'bg-green-500' :
                            completionPercentage >= 80 ? 'bg-blue-500' :
                            completionPercentage >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {completionPercentage}%
                      </div>
                    </div>
                  );
                })}
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