'use client';

import React, { useEffect, memo, useCallback, useMemo, useRef, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  Activity,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  ChevronRight
} from 'lucide-react';
import { DatabaseService } from '@/lib/database';
import { COOUser } from '@/types';
import COOExportButton from './COOExportButton';
import COOHoursStatusOverview from './COOHoursStatusOverview';
import MobileCOODashboard from './MobileCOODashboard';
import SprintPlanningCalendar from './SprintPlanningCalendar';
import SimplifiedSprintSettings from './SimplifiedSprintSettings';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import MobileHeader from '@/components/navigation/MobileHeader';
import { formatHours, formatPercentage } from '@/lib/calculationService';
import ConsolidatedAnalytics from './analytics/ConsolidatedAnalytics';
import TeamDetailModal from '@/components/modals/TeamDetailModal';
import { COOCard } from '@/components/ui/COOCard';
import SimplifiedMetricsCards from './SimplifiedMetricsCards';
import DailyCompanyStatus from './coo/DailyCompanyStatus';
import COOTeamStatusOverview from './COOTeamStatusOverview';
import { useErrorBoundary } from '@/hooks/useErrorBoundary';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import { ErrorCategory } from '@/types/errors';
import { ConsistentLoader, LoadingSkeleton } from '@/components/ui/ConsistentLoader';
import { dataConsistencyManager } from '@/utils/dataConsistencyManager';

// Import centralized state management
import { 
  useLoadingState,
  useErrorState,
  useModalState,
  useNavigationState,
  useTeamsState,
  useDashboardState,
  useSprintsState,
  useRefreshUtilities,
  useNotifications
} from '@/hooks/useAppState';

interface COOExecutiveDashboardProps {
  currentUser?: COOUser;
  onBack?: () => void;
  onTeamNavigate?: (team: { id: number; name: string }) => void;
  className?: string;
}

const COOExecutiveDashboard = memo(function COOExecutiveDashboard({ currentUser, onBack, onTeamNavigate, className = '' }: COOExecutiveDashboardProps) {
  const isMobile = useMobileDetection();
  
  // Removed abortControllerRef to simplify state management
  
  // Centralized state management
  const { dashboard: isLoading, setDashboardLoading } = useLoadingState();
  const { dashboard: error, setDashboardError } = useErrorState();
  const { teamDetail, workforceStatus } = useModalState();
  const [showSprintSettings, setShowSprintSettings] = useState(false);
  const { cooActiveTab: activeTab, setCOOActiveTab, selectedTeamId, selectTeam } = useNavigationState();
  const { allTeamsWithMembers: allTeams, setAllTeamsWithMembers, setTeams } = useTeamsState();
  const { cooData: dashboardData, setCOODashboardData } = useDashboardState();
  const { currentSprint } = useSprintsState();
  const { refreshDashboard } = useRefreshUtilities();
  const { showError, showSuccess } = useNotifications();

  // Memoized team click handler to prevent re-renders
  const handleTeamClick = useCallback((team: { teamId: number; teamName: string }) => {
    if (onTeamNavigate) {
      onTeamNavigate({ id: team.teamId, name: team.teamName });
    } else {
      selectTeam(team.teamId);
      teamDetail.open(team.teamId);
    }
  }, [onTeamNavigate, selectTeam, teamDetail]);

  // Memoized tab handlers
  const handleTabChange = useCallback((tab: string) => {
    setCOOActiveTab(tab as any);
  }, [setCOOActiveTab]);

  // Memoized computations to prevent unnecessary re-calculations
  const processedTeamData = useMemo(() => {
    if (!dashboardData?.teamComparison) return [];
    
    return dashboardData.teamComparison.map(team => ({
      ...team,
      // Pre-calculate status and badge variants to prevent re-computation
      cardStatus: team.utilization > 100 ? 'critical' :
                 team.utilization >= 90 ? 'excellent' :
                 team.utilization >= 80 ? 'good' : 'warning',
      badgeVariant: team.utilization > 100 ? 'error' :
                   team.utilization >= 90 ? 'success' :
                   team.utilization >= 80 ? 'primary' : 'warning',
      formattedUtilization: formatPercentage(team.utilization)
    }));
  }, [dashboardData?.teamComparison]);

  // Enhanced error handling - defined early for other functions to use
  const errorBoundary = useErrorBoundary({
    enableRecovery: true,
    maxRetries: 3,
    context: {
      component: 'COOExecutiveDashboard',
      userId: currentUser?.id?.toString()
    },
    onError: (appError) => {
      setDashboardError(appError.userMessage || appError.message);
      showError('Dashboard Error', appError.userMessage);
    }
  });

  // Effect to load data on component mount - simplified to prevent infinite loops
  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      try {
        if (!mounted) return;
        
        setDashboardLoading(true);
        setDashboardError(null);
        
        console.log('🔍 COO Dashboard: Starting initial data load...');
        
        // Load data with timeout handling - using circuit breaker now handles timeouts
        console.log('🔍 COO Dashboard: Starting data load with circuit breaker timeout protection...');
        
        const [data, teams] = await Promise.all([
          DatabaseService.getCOODashboardData(false),
          DatabaseService.getOperationalTeams(false)
        ]);
        
        if (!mounted) return;
        
        console.log(`🔍 COO Dashboard: Loaded ${teams.length} operational teams`);
        
        // Load team members with circuit breaker protection
        const teamsWithMembersPromises = teams.map(async (team: any) => {
          try {
            const members = await DatabaseService.getTeamMembers(team.id, false);
            console.log(`✅ Loaded ${members.length} members for team ${team.name}`);
            return { ...team, team_members: members };
          } catch (err) {
            console.warn(`⚠️ Failed to load members for team ${team.name}:`, err);
            // Return team with empty members array to prevent blocking entire dashboard
            return { ...team, team_members: [] };
          }
        });
        
        const teamsWithMembers = await Promise.all(teamsWithMembersPromises);
        console.log(`📊 Total teams processed: ${teamsWithMembers.length}`);
        
        if (!mounted) return;
        
        // Update state
        setCOODashboardData(data);
        setAllTeamsWithMembers(teamsWithMembers);
        setTeams(teams);
        
        console.log(`✅ COO Dashboard: Successfully loaded ${teamsWithMembers.length} teams`);
        
      } catch (err) {
        if (!mounted) return;
        
        console.error('❌ Error loading COO dashboard:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setDashboardError(errorMessage);
        
        // Show user-friendly error notification
        showError('Dashboard Loading Failed', 'Unable to load dashboard data. Please try refreshing the page.');
      } finally {
        if (mounted) {
          setDashboardLoading(false);
          console.log('🏁 COO Dashboard: Initial data load completed (success or failure)');
        }
      }
    };

    loadInitialData();
    
    // Cleanup function
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - run only once on mount

  // Simplified refresh handler to prevent infinite loops
  const handleRefresh = useCallback(async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      setDashboardLoading(true);
      setDashboardError(null);
      
      console.log('🔄 COO Dashboard: Refreshing data...');
      
      // Refresh data with circuit breaker timeout protection
      console.log('🔄 COO Dashboard: Starting refresh with circuit breaker protection...');
      
      const [data, teams] = await Promise.all([
        DatabaseService.getCOODashboardData(true),
        DatabaseService.getOperationalTeams(true)
      ]);
      
      // Load team members with circuit breaker protection during refresh
      const teamsWithMembers = await Promise.all(
        teams.map(async (team: any) => {
          try {
            const members = await DatabaseService.getTeamMembers(team.id, true);
            console.log(`🔄 Refreshed ${members.length} members for team ${team.name}`);
            return { ...team, team_members: members };
          } catch (err) {
            console.warn(`⚠️ Refresh failed for team ${team.name}:`, err);
            // Return team with empty members array to prevent blocking refresh
            return { ...team, team_members: [] };
          }
        })
      );
      
      // Update state
      setCOODashboardData(data);
      setAllTeamsWithMembers(teamsWithMembers);
      setTeams(teams);
      refreshDashboard();
      
      console.log(`✅ COO Dashboard: Successfully refreshed ${teamsWithMembers.length} teams`);
      showSuccess('Dashboard Refreshed', 'All data has been updated successfully');
      
    } catch (err) {
      console.error('❌ Error refreshing dashboard:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh dashboard';
      setDashboardError(errorMessage);
      showError('Refresh Failed', 'Unable to refresh dashboard data. Please try again.');
    } finally {
      setDashboardLoading(false);
      console.log('🏁 COO Dashboard: Refresh operation completed');
    }
  }, [setCOODashboardData, setAllTeamsWithMembers, setTeams, refreshDashboard, setDashboardLoading, setDashboardError, showSuccess, showError]);

  const handleErrorRetry = useCallback(async () => {
    try {
      // Clear all cache before retry to ensure fresh data
      console.log('🧹 Clearing all cache before retry...');
      dataConsistencyManager.clearAll();
      
      await errorBoundary.retry();
      if (!errorBoundary.hasError) {
        // Use the same logic as handleRefresh for retry
        await handleRefresh();
      }
    } catch (error) {
      console.error('❌ Error during retry:', error);
      setDashboardError('Retry failed - please reload the page');
    }
  }, [errorBoundary, handleRefresh]);

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


  // Mobile view with enhanced navigation
  if (isMobile && dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Mobile Header for Executive Dashboard */}
        <MobileHeader
          title="COO Executive Dashboard"
          subtitle={currentUser ? `Welcome, ${currentUser.name}` : "Company-wide analytics"}
          showBack={!!onBack}
          onBack={onBack}
          currentUser={currentUser ? {
            id: currentUser.id?.toString() || '0',
            name: currentUser.name,
            hebrew: currentUser.hebrew || '',
            isManager: true
          } as any : undefined}
          showMenu={true}
          showSearch={false}
        />
        
        <MobileCOODashboard
          currentUser={currentUser}
          dashboardData={dashboardData}
          onBack={onBack}
          onTeamNavigate={onTeamNavigate}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          error={typeof error === 'string' ? error : error?.userMessage || error?.message || null}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <ConsistentLoader
          variant="skeleton"
          message="Loading COO dashboard..."
          testId="coo-dashboard-loading"
        />
        
        {/* Additional loading skeletons for dashboard sections */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <LoadingSkeleton key={i} lines={2} className="h-24" />
          ))}
        </div>
        
        <div className="mt-6">
          <LoadingSkeleton lines={4} className="h-64" />
        </div>
      </div>
    );
  }

  // Enhanced error handling with centralized error display
  if (errorBoundary.hasError && errorBoundary.error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <ErrorDisplay
          error={errorBoundary.error}
          variant="card"
          size="lg"
          showDetails={true}
          showRetry={errorBoundary.error.isRetryable}
          maxRetries={3}
          currentRetries={errorBoundary.retryCount}
          isRetrying={errorBoundary.isRecovering}
          onRetry={handleErrorRetry}
          onDismiss={errorBoundary.dismiss}
        />
      </div>
    );
  }

  // Fallback for legacy error handling with enhanced recovery options
  if (error || !dashboardData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-500 font-medium">Error loading COO dashboard</p>
          <p className="text-sm text-gray-500 mt-1">{typeof error === 'string' ? error : error?.userMessage || 'Dashboard data unavailable'}</p>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-4 justify-center">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px] touch-manipulation active:bg-blue-800"
            >
              {isLoading ? 'Retrying...' : 'Try Again'}
            </button>
            <button
              onClick={() => {
                dataConsistencyManager.clearAll();
                window.location.reload();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors min-h-[44px] touch-manipulation active:bg-gray-800"
            >
              Clear Cache & Reload
            </button>
          </div>
          
          <details className="mt-4 text-left max-w-md mx-auto">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600">
              <p>Cache Stats: {JSON.stringify(dataConsistencyManager.getCacheStats(), null, 2)}</p>
              {typeof error === 'object' && error && (
                <p className="mt-1">Error: {JSON.stringify(error, null, 2)}</p>
              )}
            </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
      {/* Inline Error Display for Non-Critical Errors */}
      {errorBoundary.hasError && errorBoundary.error && errorBoundary.error.severity !== 'critical' && (
        <div className="mb-4">
          <ErrorDisplay
            error={errorBoundary.error}
            variant="banner"
            size="sm"
            showRetry={errorBoundary.error.isRetryable}
            maxRetries={3}
            currentRetries={errorBoundary.retryCount}
            isRetrying={errorBoundary.isRecovering}
            onRetry={handleErrorRetry}
            onDismiss={errorBoundary.dismiss}
          />
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Back Navigation */}
        {onBack && (
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] touch-manipulation active:bg-gray-100 px-2 py-2 rounded"
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
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm min-h-[44px] touch-manipulation active:bg-blue-800"
              >
                <Activity className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors min-h-[44px] touch-manipulation ${
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
              onClick={() => handleTabChange('daily-status')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors min-h-[44px] touch-manipulation ${
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
              onClick={() => handleTabChange('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors min-h-[44px] touch-manipulation ${
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
              onClick={() => setCOOActiveTab('recognition')}
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
              onClick={() => handleTabChange('sprint-planning')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors min-h-[44px] touch-manipulation ${
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

          {/* Team Status Overview - Pass centralized data to avoid duplicate loading */}
          <COOTeamStatusOverview 
            className="mb-6" 
            teams={allTeams.map(team => ({ ...team, team_members: team.team_members || [] }))}
            currentSprint={currentSprint}
            skipDataLoading={true}
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
          {processedTeamData.map((team) => (
            <COOCard
              key={`team-card-${team.teamId}-${team.teamName}`}
              title={team.teamName}
              interactive
              onClick={() => handleTeamClick(team)}
              status={team.cardStatus as "excellent" | "good" | "warning" | "critical" | "neutral"}
              badge={{
                text: team.formattedUtilization,
                variant: team.badgeVariant as "error" | "default" | "warning" | "success" | "primary"
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
            <h4 className="font-medium text-blue-900 mb-3">Next Sprint Projection</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Max Capacity:</span>
                <span className="font-medium">{formatHours(dashboardData.capacityForecast.nextSprintProjection.sprintPotential)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Projected:</span>
                <span className="font-medium">{formatHours(dashboardData.capacityForecast.nextSprintProjection.projectedOutcome)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Utilization:</span>
                <span className="font-medium">85%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Confidence:</span>
                <span className="font-medium">78%</span>
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
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Sprint Configuration</h3>
              <button
                onClick={() => setShowSprintSettings(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 min-h-[44px] touch-manipulation active:bg-blue-800"
              >
                <CalendarDays className="w-4 h-4" />
                Configure Sprint
              </button>
            </div>
          </div>
          <SprintPlanningCalendar />
        </div>
      )}
      
      {/* Simplified Sprint Settings Modal */}
      <SimplifiedSprintSettings
        isOpen={showSprintSettings}
        onClose={() => setShowSprintSettings(false)}
        onSprintUpdated={() => {
          console.log('Sprint dates updated');
          setShowSprintSettings(false);
          handleRefresh();
        }}
      />
      
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
          isOpen={teamDetail.isOpen}
          onClose={() => {
            teamDetail.close();
            selectTeam(null);
          }}
        />
      )}
    </div>
  );
});

export default COOExecutiveDashboard;