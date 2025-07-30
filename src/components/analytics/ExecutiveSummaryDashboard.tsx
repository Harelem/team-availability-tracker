/**
 * Executive Summary Dashboard with KPI Visualization
 * 
 * Provides a high-level executive view of company performance with key metrics,
 * trends, predictions, and actionable insights for strategic decision-making.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Users, 
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Shield,
  Award,
  Brain,
  Eye,
  RefreshCw
} from 'lucide-react';

import { performanceMetrics, CompanyPerformanceMetrics } from '@/lib/analytics/performanceMetrics';
import { alertSystem, InsightSummary, Alert } from '@/lib/analytics/alertSystem';

// Executive Dashboard Interfaces
interface ExecutiveDashboardProps {
  className?: string;
  refreshInterval?: number; // Auto-refresh interval in seconds
}

interface KPICard {
  title: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
  description: string;
  benchmark?: string;
}


const ExecutiveSummaryDashboard: React.FC<ExecutiveDashboardProps> = ({ 
  className = "",
  refreshInterval = 300 // 5 minutes default
}) => {
  // State management
  const [companyMetrics, setCompanyMetrics] = useState<CompanyPerformanceMetrics | null>(null);
  const [insights, setInsights] = useState<InsightSummary | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  // Data fetching
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const monthsBack = selectedTimeframe === 'week' ? 0.25 : 
                        selectedTimeframe === 'month' ? 1 : 3;

      const [metricsData, insightsData, alertsData] = await Promise.all([
        performanceMetrics.calculateCompanyPerformance(monthsBack),
        alertSystem.generateInsights(
          new Date(Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000),
          new Date()
        ),
        Promise.resolve(alertSystem.getActiveAlerts({ severity: ['high', 'critical'] }))
      ]);

      setCompanyMetrics(metricsData);
      setInsights(insightsData);
      setActiveAlerts(alertsData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh setup
  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(fetchDashboardData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [selectedTimeframe, refreshInterval]);

  // Computed KPIs
  const keyPerformanceIndicators = useMemo((): KPICard[] => {
    if (!companyMetrics || !insights) return [];

    return [
      {
        title: 'Overall Performance',
        value: `${companyMetrics.companyWideMetrics.overallPerformanceScore}%`,
        trend: insights.performanceSummary.companyScore > 75 ? 'up' : 'down',
        trendValue: '+2.3%',
        status: companyMetrics.companyWideMetrics.overallPerformanceScore > 85 ? 'excellent' :
                companyMetrics.companyWideMetrics.overallPerformanceScore > 75 ? 'good' :
                companyMetrics.companyWideMetrics.overallPerformanceScore > 65 ? 'warning' : 'critical',
        icon: <Award className="h-6 w-6" />,
        description: 'Composite score across all performance dimensions',
        benchmark: 'Target: 80%'
      },
      {
        title: 'Team Utilization',
        value: `${companyMetrics.companyWideMetrics.averageUtilization.toFixed(1)}%`,
        trend: companyMetrics.companyWideMetrics.averageUtilization > 85 ? 'up' : 'stable',
        trendValue: '+1.2%',
        status: companyMetrics.companyWideMetrics.averageUtilization > 95 ? 'critical' :
                companyMetrics.companyWideMetrics.averageUtilization > 85 ? 'good' :
                companyMetrics.companyWideMetrics.averageUtilization > 70 ? 'warning' : 'critical',
        icon: <Activity className="h-6 w-6" />,
        description: 'Average capacity utilization across all teams',
        benchmark: 'Optimal: 80-95%'
      },
      {
        title: 'Team Velocity',
        value: `${companyMetrics.companyWideMetrics.averageVelocity.toFixed(0)}h`,
        trend: 'stable',
        trendValue: '+0.8%',
        status: 'good',
        icon: <TrendingUp className="h-6 w-6" />,
        description: 'Average weekly delivery velocity per team',
        benchmark: 'Target: 40h/week'
      },
      {
        title: 'Team Stability',
        value: `${(companyMetrics.companyWideMetrics.averageStability * 100).toFixed(0)}%`,
        trend: companyMetrics.companyWideMetrics.averageStability > 0.8 ? 'up' : 'down',
        trendValue: '-0.5%',
        status: companyMetrics.companyWideMetrics.averageStability > 0.85 ? 'excellent' :
                companyMetrics.companyWideMetrics.averageStability > 0.75 ? 'good' : 'warning',
        icon: <Shield className="h-6 w-6" />,
        description: 'Team member retention and stability score',
        benchmark: 'Target: >85%'
      },
      {
        title: 'Active Teams',
        value: companyMetrics.reportingPeriod.teamsAnalyzed.toString(),
        trend: 'stable',
        trendValue: '0',
        status: 'good',
        icon: <Users className="h-6 w-6" />,
        description: 'Number of active development teams',
        benchmark: ''
      },
      {
        title: 'Critical Alerts',
        value: activeAlerts.filter(a => a.severity === 'critical').length.toString(),
        trend: activeAlerts.length > 3 ? 'up' : 'down',
        trendValue: '-2',
        status: activeAlerts.filter(a => a.severity === 'critical').length > 2 ? 'critical' :
                activeAlerts.filter(a => a.severity === 'critical').length > 0 ? 'warning' : 'good',
        icon: <AlertTriangle className="h-6 w-6" />,
        description: 'Active critical alerts requiring immediate attention',
        benchmark: 'Target: 0'
      }
    ];
  }, [companyMetrics, insights, activeAlerts]);

  // Performance distribution visualization
  const performanceDistribution = useMemo(() => {
    if (!companyMetrics) return [];
    
    return [
      { name: 'Excellent', value: companyMetrics.performanceDistribution.excellent, color: '#10B981' },
      { name: 'Good', value: companyMetrics.performanceDistribution.good, color: '#3B82F6' },
      { name: 'Satisfactory', value: companyMetrics.performanceDistribution.satisfactory, color: '#F59E0B' },
      { name: 'Needs Improvement', value: companyMetrics.performanceDistribution.needsImprovement, color: '#EF4444' },
      { name: 'Poor', value: companyMetrics.performanceDistribution.poor, color: '#8B5CF6' }
    ];
  }, [companyMetrics]);

  // Risk assessment visual
  const riskLevels = useMemo(() => {
    if (!insights) return [];
    
    const risk = insights.riskAssessment;
    return [
      { category: 'Delivery', level: risk.riskCategories.delivery, color: '#EF4444' },
      { category: 'Capacity', level: risk.riskCategories.capacity, color: '#F59E0B' },
      { category: 'Team Health', level: risk.riskCategories.teamHealth, color: '#8B5CF6' },
      { category: 'Quality', level: risk.riskCategories.quality, color: '#EC4899' },
      { category: 'Performance', level: risk.riskCategories.performance, color: '#3B82F6' }
    ];
  }, [insights]);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading executive dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Summary</h1>
          <p className="text-gray-600 mt-1">
            Strategic overview and key performance indicators
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Timeframe:</span>
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as 'week' | 'month' | 'quarter')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>

          {/* Last Updated */}
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {activeAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">
                  {activeAlerts.length} Critical Alert{activeAlerts.length !== 1 ? 's' : ''} Require Attention
                </h3>
                <div className="mt-2 space-y-1">
                  {activeAlerts.slice(0, 3).map(alert => (
                    <div key={alert.id} className="text-sm text-red-700">
                      • {alert.title} - {alert.affectedEntity.name}
                    </div>
                  ))}
                  {activeAlerts.length > 3 && (
                    <div className="text-sm text-red-600 font-medium">
                      +{activeAlerts.length - 3} more alerts
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {keyPerformanceIndicators.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="risks">Risk Assessment</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Team Performance Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{item.value}%</span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${item.value}%`, 
                              backgroundColor: item.color 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Teams */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Top Performing Teams</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {companyMetrics?.teamComparisons
                    .sort((a, b) => b.rank - a.rank)
                    .slice(0, 5)
                    .map((team, index) => (
                      <div key={team.teamId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{team.teamName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">
                            {(team.relativePerformance * 100).toFixed(0)}%
                          </Badge>
                          {team.relativePerformance > 0.1 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : team.relativePerformance < -0.1 ? (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organizational Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Organizational Health Score: {insights?.riskAssessment.overallRisk ? Math.round((1 - insights.riskAssessment.overallRisk) * 100) : 'N/A'}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {companyMetrics?.organizationalHealth.indicators && Object.entries(companyMetrics.organizationalHealth.indicators).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(value * 100)}%
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Velocity Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Velocity Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <LineChart className="h-8 w-8 mr-2" />
                  Velocity trend chart would be rendered here
                </div>
              </CardContent>
            </Card>

            {/* Utilization Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Utilization Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <BarChart3 className="h-8 w-8 mr-2" />
                  Utilization analysis chart would be rendered here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          {insights?.keyInsights.map((insight, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5" />
                    <span>{insight.title}</span>
                  </CardTitle>
                  <Badge variant={
                    insight.impact === 'high' ? 'destructive' :
                    insight.impact === 'medium' ? 'default' : 'secondary'
                  }>
                    {insight.impact} impact
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-3">{insight.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Confidence: {Math.round(insight.confidence * 100)}%</span>
                  <span>{insight.timeframe}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          {insights?.predictiveInsights.map((prediction, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>{prediction.prediction}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Probability:</span>
                    <Badge variant="outline">
                      {Math.round(prediction.probability * 100)}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Time Horizon:</span>
                    <span className="text-sm text-gray-600">{prediction.timeHorizon}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Mitigation Options:</span>
                    <ul className="mt-2 space-y-1">
                      {prediction.mitigationOptions.map((option, i) => (
                        <li key={i} className="text-sm text-gray-600 ml-4">• {option}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Risk Assessment Tab */}
        <TabsContent value="risks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskLevels.map((risk, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{risk.category}</span>
                      <span className="text-sm text-gray-600">
                        {Math.round(risk.level * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${risk.level * 100}%`,
                          backgroundColor: risk.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// KPI Card Component
const KPICard: React.FC<KPICard> = ({
  title,
  value,
  trend,
  trendValue,
  status,
  icon,
  description,
  benchmark
}) => {
  const statusColors = {
    excellent: 'border-green-200 bg-green-50',
    good: 'border-blue-200 bg-blue-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50'
  };

  const statusTextColors = {
    excellent: 'text-green-600',
    good: 'text-blue-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600'
  };

  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-green-500" />,
    down: <TrendingDown className="h-4 w-4 text-red-500" />,
    stable: <div className="h-4 w-4 rounded-full bg-gray-400" />
  };

  return (
    <Card className={`${statusColors[status]} border-2`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${statusTextColors[status]} bg-white`}>
            {icon}
          </div>
          <div className="flex items-center space-x-1">
            {trendIcons[trend]}
            <span className="text-sm font-medium text-gray-600">{trendValue}</span>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm font-medium text-gray-900">{title}</div>
          <div className="text-xs text-gray-600 mt-1">{description}</div>
          {benchmark && (
            <div className="text-xs text-gray-500 mt-1">{benchmark}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExecutiveSummaryDashboard;