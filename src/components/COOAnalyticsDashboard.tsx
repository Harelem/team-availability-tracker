/**
 * COO Analytics Dashboard Integration
 * 
 * Integrates the advanced analytics system into the existing COO dashboard
 * with seamless navigation and comprehensive insights.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  BarChart3,
  Brain,
  Target,
  Activity,
  Shield,
  Eye,
  RefreshCw,
  Settings,
  ArrowLeft,
  Bell,
  Download
} from 'lucide-react';

// Analytics imports
import ExecutiveSummaryDashboard from './analytics/ExecutiveSummaryDashboard';
import { useCompanyAnalytics, useAlerts, useAnalyticsMonitoring } from '@/hooks/useAnalytics';
import { COOUser } from '@/types';
import { alertSystem } from '@/lib/analytics/alertSystem';

interface COOAnalyticsDashboardProps {
  currentUser: COOUser;
  onBack?: () => void;
  className?: string;
}

const COOAnalyticsDashboard: React.FC<COOAnalyticsDashboardProps> = ({
  currentUser,
  onBack,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Stable callback for error handling
  const handleAnalyticsError = useCallback((error: Error) => {
    console.error('Analytics error:', error);
  }, []);

  const handleAlertsError = useCallback((error: Error) => {
    console.error('Alerts error:', error);
  }, []);

  const handleMonitoringError = useCallback((error: Error) => {
    console.error('Monitoring error:', error);
  }, []);

  // Analytics hooks
  const { 
    data: companyAnalytics, 
    loading: analyticsLoading, 
    error: analyticsError,
    refresh: refreshAnalytics 
  } = useCompanyAnalytics({
    monthsBack: 3,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    enableBackgroundRefresh: true,
    onError: handleAnalyticsError
  });

  const { 
    data: alerts, 
    loading: alertsLoading,
    acknowledgeAlert,
    resolveAlert 
  } = useAlerts({
    severityFilter: ['high', 'critical'],
    refreshInterval: 30 * 1000, // 30 seconds
    onError: handleAlertsError
  });

  const { 
    isMonitoring: realTimeMonitoring,
    newAlerts,
    startMonitoring,
    stopMonitoring,
    clearNewAlerts 
  } = useAnalyticsMonitoring({
    refreshInterval: 60 * 1000, // 1 minute
    onError: handleMonitoringError
  });

  // Auto-start monitoring
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, [startMonitoring, stopMonitoring]);

  // Handle new alerts notification
  useEffect(() => {
    if (newAlerts.length > 0) {
      // You could add a toast notification here
      console.log(`${newAlerts.length} new alerts received`);
    }
  }, [newAlerts]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Clear new alerts when viewing alerts tab
    if (value === 'alerts' && newAlerts.length > 0) {
      clearNewAlerts();
    }
  };

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    try {
      if (action === 'acknowledge') {
        await acknowledgeAlert(alertId);
      } else {
        await resolveAlert(alertId, 'Resolved by COO dashboard');
      }
    } catch (error) {
      console.error(`Error ${action}ing alert:`, error);
    }
  };

  const exportAnalyticsReport = async () => {
    try {
      // Generate comprehensive analytics report
      const insights = companyAnalytics ? await alertSystem.generateInsights(
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 3 months
        new Date()
      ) : null;

      if (insights) {
        const reportData = {
          generatedBy: currentUser.name,
          generatedAt: new Date().toISOString(),
          period: insights.period,
          companyMetrics: companyAnalytics,
          insights: insights,
          alerts: alerts || []
        };

        // Create and download the report
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting analytics report:', error);
    }
  };

  if (analyticsLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading advanced analytics...</span>
        </div>
      </div>
    );
  }

  if (analyticsError) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="text-red-500 font-medium">Error loading analytics dashboard</p>
          <p className="text-sm text-gray-500 mt-1">{analyticsError.message}</p>
          <Button onClick={refreshAnalytics} className="mt-4">
            Try Again
          </Button>
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
              <span className="text-sm">Back to Dashboard</span>
            </button>
          </div>
        )}

        {/* Main Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-blue-600" />
              Advanced Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Strategic insights and predictive analytics for {currentUser.name}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time monitoring indicator */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${realTimeMonitoring ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-gray-600">
                {realTimeMonitoring ? 'Live Monitoring' : 'Monitoring Offline'}
              </span>
            </div>

            {/* New alerts badge */}
            {newAlerts.length > 0 && (
              <Badge variant="error" className="flex items-center gap-1">
                <Bell className="w-3 h-3" />
                {newAlerts.length} new
              </Badge>
            )}

            {/* Actions */}
            <Button onClick={exportAnalyticsReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            
            <Button onClick={refreshAnalytics} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      {companyAnalytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Performance Score</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {companyAnalytics.performance.companyWideMetrics.overallPerformanceScore}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active Teams</p>
                  <p className="text-2xl font-bold text-green-900">
                    {companyAnalytics.performance.reportingPeriod.teamsAnalyzed}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Avg Utilization</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {companyAnalytics.performance.companyWideMetrics.averageUtilization.toFixed(1)}%
                  </p>
                </div>
                <Activity className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className={`${alerts && alerts.length > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${alerts && alerts.length > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    Critical Alerts
                  </p>
                  <p className={`text-2xl font-bold ${alerts && alerts.length > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                    {alerts?.length || 0}
                  </p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${alerts && alerts.length > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="executive" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Executive</span>
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Predictions</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2 relative">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Alerts</span>
            {alerts && alerts.length > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {companyAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              {/* Top Performing Teams */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {companyAnalytics.performance.teamComparisons
                      .sort((a, b) => b.relativePerformance - a.relativePerformance)
                      .slice(0, 5)
                      .map((team, index) => (
                        <div key={team.teamId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                              {index + 1}
                            </div>
                            <span className="font-medium">{team.teamName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {(team.relativePerformance * 100).toFixed(0)}%
                            </Badge>
                            {team.relativePerformance > 0.1 ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : team.relativePerformance < -0.1 ? (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            ) : null}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Executive Summary Tab */}
        <TabsContent value="executive" className="space-y-6">
          <ExecutiveSummaryDashboard 
            refreshInterval={300} // 5 minutes
            className="border-0 shadow-none p-0"
          />
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="text-center py-12">
            <Eye className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Predictive Analytics</h3>
            <p className="text-gray-600 mb-4">
              Advanced forecasting and predictive insights will be displayed here
            </p>
            <Button variant="outline">
              Configure Predictions
            </Button>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          {alertsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-600">Loading alerts...</span>
            </div>
          ) : alerts && alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${
                  alert.severity === 'critical' ? 'border-l-red-500' : 
                  alert.severity === 'high' ? 'border-l-orange-500' : 
                  'border-l-yellow-500'
                }`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            alert.severity === 'critical' ? 'error' :
                            alert.severity === 'high' ? 'primary' : 'secondary'
                          }>
                            {alert.severity}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {alert.affectedEntity.name}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {alert.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {alert.description}
                        </p>
                        {alert.recommendations.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-700">Recommendations:</p>
                            {alert.recommendations.slice(0, 2).map((rec, index) => (
                              <p key={index} className="text-xs text-gray-600">
                                • {rec.action}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                        >
                          Acknowledge
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleAlertAction(alert.id, 'resolve')}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear</h3>
              <p className="text-gray-600">
                No critical alerts at this time. Your teams are performing well.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="text-center py-12">
            <Settings className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Settings</h3>
            <p className="text-gray-600 mb-4">
              Configure analytics preferences and monitoring settings
            </p>
            <Button variant="outline">
              Configure Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default COOAnalyticsDashboard;