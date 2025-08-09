'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  BarChart3, 
  PieChart,
  TrendingUp,
  Activity,
  Eye,
  Brain,
  Target,
  Bell,
  RefreshCw,
  Settings,
  Download,
  AlertTriangle
} from 'lucide-react';

// Import existing chart components
import {
  ChartContainer,
  ChartGridLayout,
  ChartFilterControls,
  SprintCapacityBarChart,
  TeamUtilizationPieChart,
  SprintProgressLineChart,
  CapacityTrendAreaChart,
  TeamComparisonBarChart,
  transformSprintCapacityData,
  transformUtilizationDistributionData,
  transformSprintProgressData,
  transformCapacityTrendData,
  transformTeamComparisonData,
  ChartFilters
} from '@/components/charts';

// Import analytics components
import ExecutiveSummaryDashboard from './ExecutiveSummaryDashboard';
import GapDrillDownModal from './GapDrillDownModal';
import { useCompanyAnalytics, useAlerts } from '@/hooks/useAnalytics';
import { useMobileDetection } from '@/hooks/useMobileDetection';

// Lazy load heavy components for better mobile performance
const LazyExecutiveSummaryDashboard = lazy(() => import('./ExecutiveSummaryDashboard'));

// Import types and services
import { COOUser, Team, TeamMember, CurrentGlobalSprint, COODashboardData } from '@/types';
import { exportAnalyticsToExcel } from '@/lib/exportService';

interface ConsolidatedAnalyticsProps {
  currentUser?: COOUser;
  dashboardData: COODashboardData;
  allTeams: (Team & { team_members?: TeamMember[] })[];
  currentSprint: CurrentGlobalSprint | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

// Analytics Actions Component
interface AnalyticsActionsProps {
  onRefresh: () => void;
  onExport: () => void;
  isLoading?: boolean;
  alertCount?: number;
}

const AnalyticsActions: React.FC<AnalyticsActionsProps> = ({ 
  onRefresh, 
  onExport, 
  isLoading = false,
  alertCount = 0
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Brain className="w-6 h-6 text-blue-600" />
          Analytics & Insights
        </h2>
        <p className="text-gray-600 mt-1">
          Real-time team performance and capacity analytics
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Alert indicator */}
        {alertCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
            <Bell className="w-4 h-4" />
            {alertCount} alert{alertCount !== 1 ? 's' : ''}
          </div>
        )}
        
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="font-medium">
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </span>
        </button>
        
        <button
          onClick={onExport}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          <span className="font-medium">Export Report</span>
        </button>
      </div>
    </div>
  );
};

export default function ConsolidatedAnalytics({
  currentUser,
  dashboardData,
  allTeams,
  currentSprint,
  isLoading = false,
  error = null,
  className = ''
}: ConsolidatedAnalyticsProps) {
  const [activeSection, setActiveSection] = useState<'charts' | 'insights' | 'executive' | 'predictions'>('charts');
  const [actionLoading, setActionLoading] = useState(false);
  const [drillDownModalOpen, setDrillDownModalOpen] = useState(false);
  const [selectedDrillDownMetric, setSelectedDrillDownMetric] = useState<string>('');
  
  // Mobile detection
  const isMobile = useMobileDetection();
  
  // Mobile performance optimizations
  const [hasLoadedCharts, setHasLoadedCharts] = useState(!isMobile);
  const [isChartIntersecting, setIsChartIntersecting] = useState(false);
  const [chartFilters, setChartFilters] = useState<ChartFilters>({
    timeframe: 'current-week',
    teams: allTeams.map(team => team.id),
    utilizationRange: [0, 200],
    showProjections: true
  });

  // Analytics hooks
  const { 
    data: companyAnalytics, 
    loading: analyticsLoading, 
    error: analyticsError,
    refresh: refreshAnalytics 
  } = useCompanyAnalytics({
    monthsBack: 3,
    refreshInterval: 5 * 60 * 1000,
    enableBackgroundRefresh: true
  });

  const { 
    data: alerts, 
    loading: alertsLoading 
  } = useAlerts({
    severityFilter: ['high', 'critical'],
    refreshInterval: 30 * 1000
  });

  // Update chart filters when teams change
  useEffect(() => {
    setChartFilters(prev => ({
      ...prev,
      teams: allTeams.map(team => team.id)
    }));
  }, [allTeams]);

  // Mobile performance: Intersection observer for lazy chart loading
  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoadedCharts) {
            setHasLoadedCharts(true);
            setIsChartIntersecting(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    const chartSection = document.getElementById('analytics-charts-section');
    if (chartSection) {
      observer.observe(chartSection);
    }

    return () => observer.disconnect();
  }, [isMobile, hasLoadedCharts]);

  // Handle metric drill-down
  const handleMetricClick = (metric: string) => {
    setSelectedDrillDownMetric(metric);
    setDrillDownModalOpen(true);
  };

  // Unified action handlers
  const handleRefresh = async () => {
    setActionLoading(true);
    try {
      await refreshAnalytics();
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      alert('Failed to refresh analytics data. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    setActionLoading(true);
    try {
      await exportAnalyticsToExcel(
        dashboardData,
        companyAnalytics,
        alerts,
        currentUser?.name || 'COO Dashboard'
      );
    } catch (error) {
      console.error('Error exporting analytics report:', error);
      alert('Failed to export analytics report. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading || analyticsLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error || analyticsError) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-500 font-medium">Error loading analytics</p>
          <p className="text-sm text-gray-500 mt-1">{error || analyticsError?.message}</p>
          <button
            onClick={refreshAnalytics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Single consolidated action bar */}
      <AnalyticsActions 
        onRefresh={handleRefresh}
        onExport={handleExport}
        isLoading={isLoading || analyticsLoading || actionLoading}
        alertCount={alerts?.length || 0}
      />

      {/* Section Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-6 px-6">
          <button
            onClick={() => setActiveSection('charts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeSection === 'charts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Charts & Visualization
          </button>

          <button
            onClick={() => setActiveSection('insights')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeSection === 'insights'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            Performance Insights
          </button>

          <button
            onClick={() => setActiveSection('executive')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeSection === 'executive'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Target className="w-4 h-4" />
            Executive Summary
          </button>

          <button
            onClick={() => setActiveSection('predictions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeSection === 'predictions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            Predictive Analytics
          </button>
          </nav>
        </div>

        {/* Section Content */}
        <div className="p-6">
          {activeSection === 'charts' && (
            <div className="space-y-6">
          {/* Chart Filters */}
          <ChartFilterControls
            filters={chartFilters}
            onFiltersChange={(newFilters) => setChartFilters(prev => ({ ...prev, ...newFilters }))}
            availableTeams={allTeams.map(team => ({ id: team.id, name: team.name }))}
          />

          {/* Charts Grid */}
          <ChartGridLayout columns={2} gap={6}>
            {/* Sprint Capacity Bar Chart */}
            <ChartContainer
              title="Sprint Capacity Analysis"
              description="Team capacity vs actual hours comparison"
              loading={isLoading}
              error={error}
            >
              <SprintCapacityBarChart
                data={transformSprintCapacityData(
                  dashboardData?.teamComparison.filter(team => 
                    chartFilters.teams.includes(team.teamId)
                  ) || []
                ).data}
                showPercentages={true}
                height={350}
              />
            </ChartContainer>

            {/* Team Utilization Pie Chart */}
            <ChartContainer
              title="Team Utilization Distribution"
              description="Distribution of team utilization levels"
              loading={isLoading}
              error={error}
            >
              <TeamUtilizationPieChart
                data={transformUtilizationDistributionData(
                  dashboardData?.teamComparison.filter(team => 
                    chartFilters.teams.includes(team.teamId)
                  ) || []
                ).data}
                totalTeams={chartFilters.teams.length}
                showLegend={true}
                height={350}
              />
            </ChartContainer>

            {/* Sprint Progress Line Chart */}
            <ChartContainer
              title="Sprint Progress Tracking"
              description="Planned vs actual progress over sprint timeline"
              loading={isLoading}
              error={error}
            >
              <SprintProgressLineChart
                data={transformSprintProgressData(
                  dashboardData?.sprintAnalytics || {
                    currentSprintNumber: 1,
                    sprintWeeks: 2,
                    sprintPotential: 0,
                    sprintActual: 0,
                    sprintUtilization: 0,
                    weeklyBreakdown: []
                  },
                  currentSprint || {
                    id: 1,
                    sprint_length_weeks: 2,
                    current_sprint_number: 1,
                    sprint_start_date: new Date().toISOString(),
                    sprint_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    days_remaining: 14,
                    progress_percentage: 0,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    updated_by: 'system'
                  }
                ).data}
                sprintInfo={currentSprint || {
                  id: 1,
                  sprint_length_weeks: 2,
                  current_sprint_number: 1,
                  sprint_start_date: new Date().toISOString(),
                  sprint_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                  days_remaining: 14,
                  progress_percentage: 0,
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  updated_by: 'system'
                }}
                showProjection={chartFilters.showProjections}
                height={350}
              />
            </ChartContainer>

            {/* Team Comparison Horizontal Bar Chart */}
            <ChartContainer
              title="Team Performance Comparison"
              description="Cross-team utilization and capacity ranking"
              loading={isLoading}
              error={error}
            >
              <TeamComparisonBarChart
                data={transformTeamComparisonData(
                  dashboardData?.teamComparison.filter(team => 
                    chartFilters.teams.includes(team.teamId)
                  ) || []
                ).data}
                sortBy="utilization"
                showRanking={true}
                height={450}
              />
            </ChartContainer>
          </ChartGridLayout>

          {/* Full-width Capacity Trend Chart */}
          <ChartContainer
            title="Historical Capacity Trends"
            description="Long-term capacity and utilization patterns"
            loading={isLoading}
            error={error}
          >
            <CapacityTrendAreaChart
              data={transformCapacityTrendData(
                dashboardData?.capacityForecast?.quarterlyOutlook?.capacityTrends?.map(trend => ({
                  period: trend.period,
                  date: trend.period,
                  utilization: trend.value,
                  potential: 100,
                  actual: trend.value,
                  teamCount: dashboardData.companyOverview.totalTeams
                })) || []
              ).data}
              timeframe="weekly"
              showAverage={true}
              height={400}
            />
          </ChartContainer>
            </div>
          )}

          {activeSection === 'insights' && (
            <div className="space-y-6">
          {companyAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Distribution */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance Distribution</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Excellent', value: companyAnalytics.performance.performanceDistribution.excellent, color: 'bg-green-500' },
                    { name: 'Good', value: companyAnalytics.performance.performanceDistribution.good, color: 'bg-blue-500' },
                    { name: 'Satisfactory', value: companyAnalytics.performance.performanceDistribution.satisfactory, color: 'bg-yellow-500' },
                    { name: 'Needs Improvement', value: companyAnalytics.performance.performanceDistribution.needsImprovement, color: 'bg-orange-500' },
                    { name: 'Poor', value: companyAnalytics.performance.performanceDistribution.poor, color: 'bg-red-500' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${item.color}`} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{item.value}%</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${item.color} transition-all duration-300`}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Performing Teams */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Teams</h3>
                <div className="space-y-3">
                  {companyAnalytics.performance.teamComparisons
                    .sort((a, b) => b.relativePerformance - a.relativePerformance)
                    .slice(0, 5)
                    .map((team, index) => (
                      <div key={team.teamId} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{team.teamName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                            {(team.relativePerformance * 100).toFixed(0)}%
                          </span>
                          {team.relativePerformance > 0.1 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : team.relativePerformance < -0.1 ? (
                            <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Alerts Section */}
          {alerts && alerts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Alerts</h3>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className={`p-4 border-l-4 bg-white rounded-lg shadow-sm ${
                    alert.severity === 'critical' ? 'border-l-red-500' : 
                    alert.severity === 'high' ? 'border-l-orange-500' : 
                    'border-l-yellow-500'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            alert.severity === 'high' ? 'bg-orange-100 text-orange-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {alert.affectedEntity.name}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            </div>
          )}

          {activeSection === 'executive' && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading executive dashboard...</span>
              </div>
            }>
              <LazyExecutiveSummaryDashboard 
                refreshInterval={300}
                className="border-0 shadow-none p-0"
              />
            </Suspense>
          )}

          {activeSection === 'predictions' && (
            <div className="text-center py-12">
              <Eye className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Predictive Analytics</h3>
              <p className="text-gray-600 mb-4">
                Advanced forecasting and predictive insights based on historical team performance data
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  Predictive models are being enhanced. Available features include capacity forecasting 
                  and burnout risk assessment integrated throughout the dashboard.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gap Drill-Down Modal */}
      <GapDrillDownModal
        isOpen={drillDownModalOpen}
        onClose={() => setDrillDownModalOpen(false)}
        dashboardData={dashboardData}
        selectedMetric={selectedDrillDownMetric}
      />
    </div>
  );
}