'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Award,
  Activity,
  ArrowLeft,
  CalendarDays,
  ClipboardList
} from 'lucide-react';
import { DatabaseService } from '@/lib/database';
import { COODashboardData, COOUser, Team, TeamMember } from '@/types';
import COOExportButton from './COOExportButton';
import COOHoursStatusOverview from './COOHoursStatusOverview';
import MobileCOODashboard from './MobileCOODashboard';
import SprintPlanningCalendar from './SprintPlanningCalendar';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { useGlobalSprint } from '@/contexts/GlobalSprintContext';
import { formatHours, formatPercentage } from '@/lib/calculationService';
import ConsolidatedAnalytics from './analytics/ConsolidatedAnalytics';
import TeamDetailModal from '@/components/modals/TeamDetailModal';
import { COOCard } from '@/components/ui/COOCard';
import SimplifiedMetricsCards from './SimplifiedMetricsCards';
// RECOGNITION FEATURES TEMPORARILY DISABLED FOR PRODUCTION
// import TeamRecognitionLeaderboard from './recognition/TeamRecognitionLeaderboard';
import DailyCompanyStatus from './coo/DailyCompanyStatus';

interface COOExecutiveDashboardProps {
  currentUser?: COOUser;
  onBack?: () => void;
  onTeamNavigate?: (team: { id: number; name: string }) => void;
  className?: string;
}

export default function COOExecutiveDashboard({ currentUser, onBack, onTeamNavigate, className = '' }: COOExecutiveDashboardProps) {
  const [dashboardData, setDashboardData] = useState<COODashboardData | null>(null);
  const [allTeams, setAllTeams] = useState<(Team & { team_members?: TeamMember[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // RECOGNITION TAB TEMPORARILY DISABLED FOR PRODUCTION
  const [activeTab, setActiveTab] = useState<'dashboard' | 'daily-status' | 'analytics' | 'sprint-planning'>('dashboard');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const isMobile = useMobileDetection();
  
  // Get global sprint data for hours status
  const { currentSprint } = useGlobalSprint();

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 COO Dashboard: Starting data load...');
      
      // Load dashboard data and operational teams only
      const [data, teams] = await Promise.all([
        DatabaseService.getCOODashboardData(),
        DatabaseService.getOperationalTeams()
      ]);
      
      console.log(`🔍 COO Dashboard: Loaded ${teams.length} operational teams`);
      console.log('🔍 Team names:', teams.map(t => t.name));
      
      // Validate we have the expected number of teams
      if (teams.length !== 5) {
        console.warn(`⚠️ Expected 5 operational teams, got ${teams.length}`);
      }
      
      // Load team members for all operational teams
      const teamsWithMembers = await Promise.all(
        teams.map(async (team) => {
          const members = await DatabaseService.getTeamMembers(team.id);
          console.log(`🔍 Team ${team.name}: ${members.length} members`);
          return { ...team, team_members: members };
        })
      );
      
      // Teams loaded successfully
      
      setDashboardData(data);
      setAllTeams(teamsWithMembers);
      
      console.log(`✅ COO Dashboard: Successfully loaded ${teamsWithMembers.length} teams`);
      
    } catch (err) {
      console.error('❌ Error loading COO dashboard data:', err);
      setError(`Failed to load dashboard data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshKey]);

  const refreshDashboard = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Using standardized calculation service functions

  const getCapacityStatusIcon = (status: 'optimal' | 'under' | 'over') => {
    switch (status) {
      case 'optimal':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'under':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'over':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };


  // Mobile view
  if (isMobile && dashboardData) {
    return (
      <MobileCOODashboard
        currentUser={currentUser}
        dashboardData={dashboardData}
        onBack={onBack}
        onTeamNavigate={onTeamNavigate}
        onRefresh={refreshDashboard}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-500 font-medium">Error loading COO dashboard</p>
          <p className="text-sm text-gray-500 mt-1">{error || 'Dashboard data unavailable'}</p>
          <button
            onClick={refreshDashboard}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Back Navigation */}
        {onBack && (
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Selection</span>
            </button>
          </div>
        )}
        
        {/* Main Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <span>COO Executive Dashboard</span>
            </h2>
            {currentUser && (
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Welcome, {currentUser.name} • {currentUser.title} • {new Date().toLocaleDateString()}
              </p>
            )}
            {!currentUser && (
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Company-wide workforce capacity analytics • {new Date().toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <COOExportButton 
              currentUser={currentUser}
              disabled={isLoading || error !== null}
              className="hidden sm:flex"
            />
            {/* Only show refresh button when not on analytics or daily-status tabs */}
            {activeTab !== 'analytics' && activeTab !== 'daily-status' && (
              <button
                onClick={refreshDashboard}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Activity className="w-4 h-4" />
                Refresh Data
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('daily-status')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'daily-status'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                <span>Daily Status</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Analytics & Insights</span>
              </div>
            </button>
            {/* RECOGNITION TAB TEMPORARILY DISABLED FOR PRODUCTION
            <button
              onClick={() => setActiveTab('recognition')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'recognition'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>Recognition</span>
              </div>
            </button>
            */}
            <button
              onClick={() => setActiveTab('sprint-planning')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sprint-planning'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                <span>Sprint Planning</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Simplified Metrics Cards */}
          <SimplifiedMetricsCards 
            dashboardData={dashboardData}
            selectedDate={new Date()}
            className="mb-6"
          />

      {/* Mobile Export Button */}
      <div className="sm:hidden mb-6">
        <COOExportButton 
          currentUser={currentUser}
          disabled={isLoading || error !== null}
          className="w-full justify-center"
        />
      </div>

      {/* Hours view control removed - integrated into specific components */}

      {/* Company-Wide Hours Status Overview */}
      {allTeams.length > 0 && currentSprint && (
        <COOHoursStatusOverview 
          allTeams={allTeams}
          currentSprint={currentSprint}
        />
      )}

      {/* Team Count Warning */}
      {allTeams.length !== 5 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h4 className="text-yellow-800 font-medium">Team Structure Warning</h4>
          </div>
          <p className="text-yellow-700 text-sm mb-2">
            Expected 5 operational teams, but found {allTeams.length}. Some teams may be missing or duplicated.
          </p>
          <div className="text-yellow-600 text-xs">
            <div className="font-medium mb-1">Current teams ({allTeams.length}):</div>
            <ul className="list-disc list-inside">
              {allTeams.map(team => (
                <li key={team.id}>{team.name} ({team.team_members?.length || 0} members)</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Team Capacity Analysis */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          Team Capacity Analysis
          <span className="text-sm text-gray-500 font-normal">
            ({dashboardData.teamComparison.length} teams)
          </span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboardData.teamComparison.map((team) => (
            <COOCard
              key={team.teamId}
              title={team.teamName}
              interactive
              onClick={() => {
                if (onTeamNavigate) {
                  onTeamNavigate({ id: team.teamId, name: team.teamName });
                } else {
                  setSelectedTeamId(team.teamId);
                  setIsTeamModalOpen(true);
                }
              }}
              status={team.utilization > 100 ? 'critical' :
                     team.utilization >= 90 ? 'excellent' :
                     team.utilization >= 80 ? 'good' : 'warning'}
              badge={{
                text: formatPercentage(team.utilization),
                variant: team.utilization > 100 ? 'error' :
                        team.utilization >= 90 ? 'success' :
                        team.utilization >= 80 ? 'primary' : 'warning'
              }}
              headerAction={getCapacityStatusIcon(team.capacityStatus)}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max:</span>
                      <span className="font-medium">{formatHours(team.maxCapacity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Capacity:</span>
                      <span className="font-medium">{formatHours(team.weeklyPotential)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gap:</span>
                      <span className={`font-medium ${team.capacityGap > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {team.capacityGap > 0 ? '+' : ''}{formatHours(team.capacityGap)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Team Size:</span>
                      <span className="font-medium">{team.memberCount} members</span>
                    </div>
                  </div>
                </div>
                
                {/* Utilization Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        team.utilization > 100 ? 'bg-red-500' :
                        team.utilization >= 90 ? 'bg-green-500' :
                        team.utilization >= 80 ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${Math.min(100, team.utilization)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </COOCard>
          ))}
        </div>
      </div>


      {/* Optimization Recommendations */}
      {dashboardData.optimizationRecommendations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-gray-600" />
            Optimization Recommendations
          </h3>
          
          <COOCard
            variant="warning"
            icon={AlertTriangle}
          >
            <div className="space-y-3">
              {dashboardData.optimizationRecommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800">{recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </COOCard>
        </div>
      )}

      {/* Capacity Forecast */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-600" />
          Capacity Forecast
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Next Week Projection</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Max Capacity:</span>
                <span className="font-medium">{formatHours(dashboardData.capacityForecast.nextWeekProjection.potentialHours)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Projected:</span>
                <span className="font-medium">{formatHours(dashboardData.capacityForecast.nextWeekProjection.projectedActual)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Utilization:</span>
                <span className="font-medium">{formatPercentage(dashboardData.capacityForecast.nextWeekProjection.expectedUtilization)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Confidence:</span>
                <span className="font-medium">{dashboardData.capacityForecast.nextWeekProjection.confidenceLevel}%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-3">Sprint Outlook</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Sprint Max Capacity:</span>
                <span className="font-medium">{formatHours(dashboardData.capacityForecast.nextSprintProjection.sprintPotential)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Projected Outcome:</span>
                <span className="font-medium">{formatHours(dashboardData.capacityForecast.nextSprintProjection.projectedOutcome)}</span>
              </div>
              <div className="mt-3">
                <div className="text-xs text-green-700 font-medium mb-1">Risk Factors:</div>
                {dashboardData.capacityForecast.nextSprintProjection.riskFactors.map((risk, index) => (
                  <div key={index} className="text-xs text-green-600 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                    {risk}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

        </>
      )}

      {/* RECOGNITION TAB TEMPORARILY DISABLED FOR PRODUCTION */}

      {/* Daily Status Tab */}
      {activeTab === 'daily-status' && (
        <div className="mt-6">
          <DailyCompanyStatus />
        </div>
      )}

      {/* Sprint Planning Tab */}
      {activeTab === 'sprint-planning' && (
        <div className="mt-6">
          <SprintPlanningCalendar />
        </div>
      )}
      
      {/* Analytics & Insights Tab */}
      {activeTab === 'analytics' && (
        <div className="mt-6">
          <ConsolidatedAnalytics 
            currentUser={currentUser}
            dashboardData={dashboardData}
            allTeams={allTeams}
            currentSprint={currentSprint}
            isLoading={isLoading}
            error={error}
            className="border-0 shadow-none p-0"
          />
        </div>
      )}

      {/* Team Detail Modal */}
      {selectedTeamId && (
        <TeamDetailModal
          teamId={selectedTeamId}
          isOpen={isTeamModalOpen}
          onClose={() => {
            setIsTeamModalOpen(false);
            setSelectedTeamId(null);
          }}
        />
      )}
    </div>
  );
}