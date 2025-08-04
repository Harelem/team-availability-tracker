'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  CheckCircle,
  Zap,
  Activity,
  RefreshCw
} from 'lucide-react';
import { TeamDashboardData, Team, CurrentGlobalSprint } from '@/types';
import { DatabaseService } from '@/lib/database';
import { formatHours, formatPercentage } from '@/lib/calculationService';
import { COOMetricCard } from '@/components/ui/COOCard';

interface TeamSummaryOverviewProps {
  team: Team;
  currentSprint: CurrentGlobalSprint | null;
  className?: string;
}

export default function TeamSummaryOverview({ 
  team, 
  currentSprint,
  className = '' 
}: TeamSummaryOverviewProps) {
  const [dashboardData, setDashboardData] = useState<TeamDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
          console.log(`✅ Team summary loaded successfully`);
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
      <div className={`bg-white rounded-lg shadow-md p-6 mb-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-red-500 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-800">Team Summary Error</h3>
            <p className="text-sm text-red-600 mt-1">{error || 'Unable to load team summary'}</p>
          </div>
          <button
            onClick={refreshDashboard}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 mb-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>{team.name} Team Summary</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Team capacity overview • {dashboardData.teamOverview.memberCount} members
            {currentSprint && (
              <span> • Sprint {currentSprint.current_sprint_number}</span>
            )}
          </p>
        </div>
        
        <button
          onClick={refreshDashboard}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
          title="Refresh team summary"
        >
          <Activity className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Sprint Overview Section */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Sprint Overview - Full {currentSprint ? `${currentSprint.sprint_length_weeks}-week` : '2-week'} Period
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <COOMetricCard
            title="Max Capacity"
            value={formatHours(dashboardData.teamOverview.maxCapacity)}
            trend={currentSprint ? 
              `${currentSprint.sprint_length_weeks} weeks × ${dashboardData.teamOverview.memberCount} members × 7h/day` :
              `${dashboardData.teamOverview.memberCount} members × 2 weeks × 7h/day`
            }
            icon={Calendar}
            variant="info"
            status="excellent"
          />

          <COOMetricCard
            title="Available Capacity"
            value={formatHours(dashboardData.teamOverview.sprintPotential)}
            trend="Max capacity minus planned absences"
            icon={CheckCircle}
            variant="success"
            status="excellent"
          />

          <COOMetricCard
            title="Sprint Utilization"
            value={formatPercentage(dashboardData.teamOverview.currentUtilization)}
            trend={`${dashboardData.teamOverview.currentUtilization >= 90 ? 'Excellent' : 
                     dashboardData.teamOverview.currentUtilization >= 80 ? 'Good' : 
                     dashboardData.teamOverview.currentUtilization >= 60 ? 'Fair' : 'Low'} progress through sprint`}
            trendDirection={dashboardData.teamOverview.currentUtilization >= 80 ? 'up' : 'down'}
            icon={TrendingUp}
            variant="primary"
            status={dashboardData.teamOverview.currentUtilization >= 90 ? 'excellent' :
                   dashboardData.teamOverview.currentUtilization >= 80 ? 'good' : 
                   dashboardData.teamOverview.currentUtilization >= 60 ? 'warning' : 'critical'}
          />

          <COOMetricCard
            title="Capacity Gap"
            value={formatHours(Math.abs(dashboardData.teamOverview.capacityGap))}
            trend={
              dashboardData.teamOverview.capacityGap > 0 
                ? `${dashboardData.teamOverview.capacityGapPercentage}% unavailable due to absences`
                : 'Team is at full capacity'
            }
            trendDirection={dashboardData.teamOverview.capacityGap > 0 ? 'down' : 'up'}
            icon={Zap}
            variant="warning"
            status={dashboardData.teamOverview.capacityGapPercentage < 10 ? 'excellent' : 
                   dashboardData.teamOverview.capacityGapPercentage < 20 ? 'good' : 'warning'}
          />
        </div>
      </div>

      {/* Sprint Progress (if available) */}
      {dashboardData.sprintProgress && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            Sprint Progress - Days Completed So Far
          </h4>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Sprint {dashboardData.sprintProgress.sprintNumber} Progress
                </div>
                <p className="text-xs text-gray-600">
                  {dashboardData.sprintProgress.daysRemaining} days remaining of {dashboardData.sprintProgress.sprintWeeks}-week sprint
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-purple-900">
                  {formatPercentage(dashboardData.sprintProgress.sprintUtilization)}
                </div>
                <div className="text-xs text-gray-600">
                  {formatHours(dashboardData.sprintProgress.sprintActual)} completed of {formatHours(dashboardData.sprintProgress.sprintPotential)} planned
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    dashboardData.sprintProgress.sprintUtilization > 100 ? 'bg-red-500' :
                    dashboardData.sprintProgress.sprintUtilization >= 90 ? 'bg-green-500' :
                    dashboardData.sprintProgress.sprintUtilization >= 80 ? 'bg-yellow-500' :
                    dashboardData.sprintProgress.sprintUtilization >= 60 ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min(100, dashboardData.sprintProgress.sprintUtilization)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span className={`font-medium ${
                  dashboardData.sprintProgress.sprintUtilization >= 90 ? 'text-green-600' :
                  dashboardData.sprintProgress.sprintUtilization >= 80 ? 'text-yellow-600' :
                  dashboardData.sprintProgress.sprintUtilization >= 60 ? 'text-blue-600' :
                  'text-gray-600'
                }`}>
                  {Math.round(dashboardData.sprintProgress.sprintUtilization)}% Complete
                </span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Week Status Section */}
      <div className="pt-6 border-t border-gray-200">
        <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-green-600" />
          Current Week Status - This Week Only
        </h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {formatHours(dashboardData.currentWeekMetrics.actualHours)}
              </div>
              <div className="text-xs text-gray-500">Scheduled Hours</div>
              <div className="text-xs text-gray-400">This week only</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {formatPercentage(dashboardData.currentWeekMetrics.utilization)}
              </div>
              <div className="text-xs text-gray-500">Week Utilization</div>
              <div className="text-xs text-gray-400">Of {formatHours(dashboardData.currentWeekMetrics.potentialHours)} potential</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {dashboardData.currentWeekMetrics.absentMembers}
              </div>
              <div className="text-xs text-gray-500">Absent Members</div>
              <div className="text-xs text-gray-400">Sick/Out this week</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {dashboardData.currentWeekMetrics.halfDayMembers}
              </div>
              <div className="text-xs text-gray-500">Half-Day Members</div>
              <div className="text-xs text-gray-400">Partial availability</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}